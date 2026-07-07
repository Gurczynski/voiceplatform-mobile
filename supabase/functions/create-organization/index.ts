// Create Organization + Twilio Subaccount
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders, getAuthenticatedUser, verifyOrgMembership,
  createServiceClient, logAuditEvent, generateSlug,
  errorResponse, successResponse, handleOptions
} from '../_shared/utils.ts';

serve(async (req) => {
  const optionsResp = await handleOptions(req);
  if (optionsResp) return optionsResp;

  try {
    const authHeader = req.headers.get('Authorization')!;
    const user = await getAuthenticatedUser(authHeader);
    const { name, industry, timezone, mode } = await req.json();

    if (!name) return errorResponse('Organization name is required');

    const supabase = createServiceClient();
    const slug = generateSlug(name) + '-' + Date.now().toString(36);

    // Create Twilio subaccount if managed mode
    let twilioSubaccountSid = null;
    let twilioAuthToken = null;

    if (mode === 'managed') {
      const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioAuthTokenMain = Deno.env.get('TWILIO_AUTH_TOKEN');

      if (twilioAccountSid && twilioAuthTokenMain) {
        const twilioResp = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthTokenMain}`),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              FriendlyName: `${name} Subaccount`,
            }),
          }
        );

        if (twilioResp.ok) {
          const twilioData = await twilioResp.json();
          twilioSubaccountSid = twilioData.sid;
          twilioAuthToken = twilioData.auth_token;
        }
      }
    }

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug,
        mode: mode || 'managed',
        industry: industry || null,
        timezone: timezone || 'America/New_York',
        twilio_subaccount_sid: twilioSubaccountSid,
        twilio_subaccount_auth_token_encrypted: twilioAuthToken ? btoa(twilioAuthToken) : null,
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // Add creator as owner
    await supabase.from('organization_members').insert({
      organization_id: org.id,
      user_id: user.id,
      role: 'owner',
      is_active: true,
    });

    // Create default subscription (starter trial)
    await supabase.from('subscriptions').insert({
      organization_id: org.id,
      tier: 'starter',
      status: 'trialing',
      trial_start: new Date().toISOString(),
      trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Create default business hours
    await supabase.from('business_hours').insert({
      organization_id: org.id,
      name: 'Default',
      is_active: true,
    });

    await logAuditEvent(supabase, org.id, user.id, 'organization.created', 'organization', org.id);

    return successResponse({ organization: org });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
});
