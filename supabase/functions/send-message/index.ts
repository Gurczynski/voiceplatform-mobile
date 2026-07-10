// Send SMS/MMS Message
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders, getAuthenticatedUser, verifyOrgMembership,
  verifyNumberAssignment, createSupabaseClient, createServiceClient,
  logAuditEvent, errorResponse, successResponse, handleOptions,
  getTwilioCredentials
} from '../_shared/utils.ts';

serve(async (req) => {
  const optionsResp = await handleOptions(req);
  if (optionsResp) return optionsResp;

  try {
    const authHeader = req.headers.get('Authorization')!;
    const user = await getAuthenticatedUser(authHeader);
    const { organizationId, phoneNumberId, to, body, mediaUrls } = await req.json();

    if (!to) return errorResponse('Recipient phone number is required');
    if (!body && (!mediaUrls || mediaUrls.length === 0)) return errorResponse('Message body or media is required');

    const supabase = createSupabaseClient(authHeader);
    await verifyOrgMembership(supabase, user.id, organizationId);

    // Get the phone number
    const { data: phoneNumber } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('id', phoneNumberId)
      .eq('organization_id', organizationId)
      .single();

    if (!phoneNumber) return errorResponse('Phone number not found');

    // Check assignment (unless admin)
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (!['owner', 'admin', 'manager'].includes(membership?.role)) {
      const assignment = await verifyNumberAssignment(supabase, user.id, phoneNumberId);
      if (!assignment || !assignment.can_send_sms) {
        return errorResponse('Not authorized to send from this number', 403);
      }
    }

    // Check opt-out
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, opt_out')
      .eq('organization_id', organizationId)
      .eq('phone_number', to)
      .single();

    if (contact?.opt_out) {
      return errorResponse('Contact has opted out of messages');
    }

    // Get Twilio credentials (handles both managed and BYOT modes)
    const { accountSid, authToken, mainAccountSid } = await getTwilioCredentials(supabase, organizationId);

    // Send via Twilio
    const params = new URLSearchParams({
      From: phoneNumber.phone_number,
      To: to,
    });

    if (body) params.append('Body', body);
    if (mediaUrls?.length) {
      mediaUrls.forEach((url: string) => params.append('MediaUrl', url));
    }

    const twilioResp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${mainAccountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      }
    );

    if (!twilioResp.ok) {
      const err = await twilioResp.text();
      return errorResponse(`Twilio error: ${err}`, 502);
    }

    const twilioData = await twilioResp.json();

    // Find or create conversation
    let conversationId: string;
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('contact_id', contact?.id)
      .eq('phone_number_id', phoneNumberId)
      .single();

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      // Create contact if needed
      let contactId = contact?.id;
      if (!contactId) {
        const { data: newContact } = await supabase
          .from('contacts')
          .insert({
            organization_id: organizationId,
            phone_number: to,
            formatted_phone: to,
          })
          .select('id')
          .single();
        contactId = newContact?.id;
      }

      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          organization_id: organizationId,
          contact_id: contactId,
          phone_number_id: phoneNumberId,
          status: 'open',
        })
        .select('id')
        .single();
      conversationId = newConv?.id;
    }

    // Store message
    const { data: message } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        contact_id: contact?.id,
        phone_number_id: phoneNumberId,
        sender_id: user.id,
        direction: 'outbound',
        type: mediaUrls?.length ? 'mms' : 'sms',
        body,
        media_urls: mediaUrls || [],
        status: 'sent',
        twilio_sid: twilioData.sid,
        twilio_status: twilioData.status,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: body?.slice(0, 100) || 'MMS',
      })
      .eq('id', conversationId);

    // Track usage
    const eventType = mediaUrls?.length ? 'mms_sent' : 'sms_sent';
    await createServiceClient().from('usage_events').insert({
      organization_id: organizationId,
      user_id: user.id,
      event_type: eventType,
      quantity: 1,
      metadata: { message_id: message?.id, to },
    });

    await logAuditEvent(supabase, organizationId, user.id, 'message.sent', 'message', message?.id, { to, direction: 'outbound' });

    return successResponse({ message });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
});
