// Check usage limits before allowing operations
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders, getAuthenticatedUser, verifyOrgMembership,
  createSupabaseClient, errorResponse, successResponse, handleOptions
} from '../_shared/utils.ts';

serve(async (req) => {
  const optionsResp = await handleOptions(req);
  if (optionsResp) return optionsResp;

  try {
    const authHeader = req.headers.get('Authorization')!;
    const user = await getAuthenticatedUser(authHeader);
    const { organizationId, limitType } = await req.json();

    const supabase = createSupabaseClient(authHeader);
    await verifyOrgMembership(supabase, user.id, organizationId);

    // Get subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('organization_id', organizationId)
      .single();

    if (!subscription || !['active', 'trialing'].includes(subscription.status)) {
      return errorResponse('Active subscription required');
    }

    // Define limits per tier
    const limits: Record<string, Record<string, number>> = {
      starter: { ai_voice_minutes: 0, ai_messages: 0, phone_numbers: 1, users: 1 },
      professional: { ai_voice_minutes: 100, ai_messages: 500, phone_numbers: 5, users: 5 },
      business: { ai_voice_minutes: 500, ai_messages: 2000, phone_numbers: 20, users: 25 },
      enterprise: { ai_voice_minutes: 2000, ai_messages: 10000, phone_numbers: -1, users: -1 },
    };

    const tierLimits = limits[subscription.tier] || limits.starter;
    const limit = tierLimits[limitType] ?? 0;

    // Unlimited
    if (limit === -1) {
      return successResponse({ allowed: true, remaining: -1, limit: -1 });
    }

    // Get current usage
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let used = 0;

    if (limitType === 'phone_numbers') {
      const { count } = await supabase
        .from('phone_numbers')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .in('status', ['purchased', 'assigned']);
      used = count || 0;
    } else if (limitType === 'users') {
      const { count } = await supabase
        .from('organization_members')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('is_active', true);
      used = count || 0;
    } else {
      const eventType = limitType === 'ai_voice_minutes' ? 'voice_minute' : 'token';
      const { data: events } = await supabase
        .from('ai_usage_events')
        .select('quantity')
        .eq('organization_id', organizationId)
        .eq('event_type', eventType)
        .gte('created_at', periodStart.toISOString());
      used = (events || []).reduce((sum: number, e: any) => sum + (e.quantity || 0), 0);
    }

    const remaining = Math.max(0, limit - used);
    const allowed = remaining > 0;

    return successResponse({
      allowed,
      remaining,
      limit,
      used,
      tier: subscription.tier,
      upgradeUrl: allowed ? null : '/billing',
    });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
});
