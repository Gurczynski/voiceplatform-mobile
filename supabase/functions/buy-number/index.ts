// Buy Phone Number from Twilio
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders, getAuthenticatedUser, verifyOrgMembership,
  createSupabaseClient, createServiceClient, logAuditEvent,
  errorResponse, successResponse, handleOptions,
  getTwilioCredentials
} from '../_shared/utils.ts';

serve(async (req) => {
  const optionsResp = await handleOptions(req);
  if (optionsResp) return optionsResp;

  try {
    const authHeader = req.headers.get('Authorization')!;
    const user = await getAuthenticatedUser(authHeader);
    const { organizationId, phoneNumber, friendlyName } = await req.json();

    if (!phoneNumber) return errorResponse('Phone number is required');

    const supabase = createSupabaseClient(authHeader);
    const membership = await verifyOrgMembership(supabase, user.id, organizationId);

    if (!['owner', 'admin'].includes(membership.role)) {
      return errorResponse('Insufficient permissions', 403);
    }

    // Check subscription limits
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('organization_id', organizationId)
      .single();

    if (!subscription || !['active', 'trialing'].includes(subscription.status)) {
      return errorResponse('Active subscription required');
    }

    const { data: existingNumbers } = await supabase
      .from('phone_numbers')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .in('status', ['purchased', 'assigned']);

    const limits: Record<string, number> = { starter: 1, professional: 5, business: 20, enterprise: 100 };
    const limit = limits[subscription.tier] || 1;

    if ((existingNumbers?.length || 0) >= limit) {
      return errorResponse(`Your ${subscription.tier} plan allows ${limit} phone numbers. Upgrade to add more.`);
    }

    const { accountSid, authToken } = await getTwilioCredentials(supabase, organizationId);

    const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || '';

    // Purchase number from Twilio
    const twilioResp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          PhoneNumber: phoneNumber,
          FriendlyName: friendlyName || phoneNumber,
          VoiceUrl: `${baseUrl}/functions/v1/inbound-call-webhook`,
          VoiceMethod: 'POST',
          SmsUrl: `${baseUrl}/functions/v1/inbound-sms-webhook`,
          SmsMethod: 'POST',
          StatusCallback: `${baseUrl}/functions/v1/call-status-webhook`,
          StatusCallbackMethod: 'POST',
        }),
      }
    );

    if (!twilioResp.ok) {
      const err = await twilioResp.text();
      return errorResponse(`Failed to purchase number: ${err}`, 502);
    }

    const twilioData = await twilioResp.json();

    // Format the number
    const formatted = phoneNumber.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '+$1 ($2) $3-$4');

    // Store in database
    const { data: savedNumber, error: dbError } = await supabase
      .from('phone_numbers')
      .insert({
        organization_id: organizationId,
        phone_number: phoneNumber,
        formatted_number: formatted,
        friendly_name: friendlyName || phoneNumber,
        type: 'local',
        status: 'purchased',
        capabilities: {
          voice: twilioData.capabilities?.voice || false,
          sms: twilioData.capabilities?.sms || false,
          mms: twilioData.capabilities?.mms || false,
        },
        country_code: 'US',
        region: twilioData.region,
        locality: twilioData.locality,
        twilio_sid: twilioData.sid,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Track usage event
    await createServiceClient().from('usage_events').insert({
      organization_id: organizationId,
      user_id: user.id,
      event_type: 'api_call',
      quantity: 1,
      metadata: { action: 'buy_number', phone_number: phoneNumber },
    });

    await logAuditEvent(supabase, organizationId, user.id, 'number.purchased', 'phone_number', savedNumber.id, { phone_number: phoneNumber });

    return successResponse({ number: savedNumber });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
});
