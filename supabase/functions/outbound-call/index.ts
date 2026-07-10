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
    const { organizationId, to, phoneNumberId, callId } = await req.json();

    if (!to) return errorResponse('Phone number required');

    const supabase = createSupabaseClient(authHeader);
    const membership = await verifyOrgMembership(supabase, user.id, organizationId);

    // Get the phone number to call from
    let fromNumber = '';
    if (phoneNumberId) {
      const { data: phoneNumber } = await supabase
        .from('phone_numbers')
        .select('phone_number, id')
        .eq('id', phoneNumberId)
        .eq('organization_id', organizationId)
        .single();

      if (!phoneNumber) return errorResponse('Phone number not found');

      // Check assignment
      const { data: assignment } = await supabase
        .from('number_assignments')
        .select('can_make_calls')
        .eq('phone_number_id', phoneNumberId)
        .eq('user_id', user.id)
        .single();

      if (!assignment?.can_make_calls) {
        return errorResponse('Not authorized to make calls from this number', 403);
      }

      fromNumber = phoneNumber.phone_number;
    } else {
      // Get default number
      const { data: defaultNumber } = await supabase
        .from('phone_numbers')
        .select('phone_number')
        .eq('organization_id', organizationId)
        .eq('status', 'purchased')
        .limit(1)
        .single();

      fromNumber = defaultNumber?.phone_number || '';
    }

    if (!fromNumber) return errorResponse('No phone number available');

    const { accountSid, authToken, mainAccountSid } = await getTwilioCredentials(supabase, organizationId);
    
    // Use the public URL for Twilio webhooks
    const baseUrl = 'http://127.0.0.1:54321';

    // Make call via Twilio using main account credentials
    const twilioResp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${mainAccountSid}/Calls.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${mainAccountSid}:${authToken}`),
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

    // Create call record
    const { data: call } = await supabase
      .from('calls')
      .insert({
        organization_id: organizationId,
        direction: 'outbound',
        status: 'ringing',
        from_number: fromNumber,
        to_number: to,
        initiated_by: user.id,
        twilio_sid: twilioData.sid,
      })
      .select()
      .single();

    // Track usage
    await createServiceClient().from('usage_events').insert({
      organization_id: organizationId,
      user_id: user.id,
      event_type: 'api_call',
      quantity: 1,
      metadata: { action: 'outbound_call', to },
    });

    await logAuditEvent(supabase, organizationId, user.id, 'call.initiated', 'call', call?.id, { to, from: fromNumber });

    return successResponse({ callSid: twilioData.sid, status: twilioData.status, callId: call?.id });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
});
