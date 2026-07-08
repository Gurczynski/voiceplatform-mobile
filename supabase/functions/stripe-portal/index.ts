// Stripe Portal - Manage existing subscription
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
    const { organizationId } = await req.json();

    const supabase = createSupabaseClient(authHeader);
    const membership = await verifyOrgMembership(supabase, user.id, organizationId);

    if (!['owner', 'admin', 'billing_admin'].includes(membership.role)) {
      return errorResponse('Insufficient permissions', 403);
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return errorResponse('Stripe not configured');

    // Get Stripe customer ID
    const { data: billing } = await supabase
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .single();

    if (!billing?.stripe_customer_id) {
      return errorResponse('No billing account found');
    }

    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:8081';

    // Create portal session
    const portalResp = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: billing.stripe_customer_id,
        return_url: `${appUrl}/settings/billing`,
      }),
    });

    if (!portalResp.ok) {
      const err = await portalResp.text();
      return errorResponse(`Stripe error: ${err}`, 502);
    }

    const portal = await portalResp.json();
    return successResponse({ url: portal.url });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
});
