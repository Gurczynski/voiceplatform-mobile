// Outbound Call - Initiates call via Twilio
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
    const { organizationId, to, from, callId } = await req.json();

    if (!to) return errorResponse('Phone number required');

    const supabase = createSupabaseClient(authHeader);
    const membership = await verifyOrgMembership(supabase, user.id, organizationId);

    // Check number assignment
    if (from) {
      const { data: assignment } = await supabase
        .from('number_assignments')
        .select('can_make_calls')
        .eq('phone_number_id', from)
        .eq('user_id', user.id)
        .single();

      if (!assignment?.can_make_calls) {
        return errorResponse('Not authorized to make calls from this number', 403);
      }
    }

    const { accountSid, authToken } = await getTwilioCredentials(supabase, organizationId);

    // Get the from number
    let fromNumber = from;
    if (!fromNumber) {
      const { data: defaultNumber } = await supabase
        .from('phone_numbers')
        .select('phone_number')
        .eq('organization_id', organizationId)
        .eq('status', 'purchased')
        .limit(1)
        .single();
      fromNumber = defaultNumber?.phone_number;
    }

    if (!fromNumber) return errorResponse('No phone number available');

    const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || '';

    // Make call via Twilio
    const twilioResp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: fromNumber,
          Url: `${baseUrl}/functions/v1/outbound-call-twiml`,
          StatusCallback: `${baseUrl}/functions/v1/call-status-webhook`,
          StatusCallbackMethod: 'POST',
        }),
      }
    );

    if (!twilioResp.ok) {
      const err = await twilioResp.text();
      console.error('Twilio error:', err);
      return errorResponse(`Failed to initiate call: ${err}`, 502);
    }

    const twilioData = await twilioResp.json();

    // Update call record
    if (callId) {
      await createServiceClient()
        .from('calls')
        .update({
          twilio_sid: twilioData.sid,
          from_number: fromNumber,
          status: 'ringing',
        })
        .eq('id', callId);
    }

    // Track usage
    await createServiceClient().from('usage_events').insert({
      organization_id: organizationId,
      user_id: user.id,
      event_type: 'api_call',
      quantity: 1,
      metadata: { action: 'outbound_call', to },
    });

    await logAuditEvent(supabase, organizationId, user.id, 'call.initiated', 'call', callId, { to, from: fromNumber });

    return successResponse({ callSid: twilioData.sid, status: twilioData.status });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
});
