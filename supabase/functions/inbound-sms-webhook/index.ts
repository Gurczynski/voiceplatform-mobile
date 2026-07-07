// Inbound SMS/MMS Webhook from Twilio
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createServiceClient } from '../_shared/utils.ts';

serve(async (req) => {
  try {
    const formData = await req.formData();
    const messageSid = formData.get('MessageSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const numMedia = parseInt(formData.get('NumMedia') as string || '0');

    // Collect media URLs
    const mediaUrls: string[] = [];
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = formData.get(`MediaUrl${i}`) as string;
      if (mediaUrl) mediaUrls.push(mediaUrl);
    }

    const supabase = createServiceClient();

    // Find the phone number in our system
    const { data: phoneNumber } = await supabase
      .from('phone_numbers')
      .select('id, organization_id')
      .eq('phone_number', to)
      .single();

    if (!phoneNumber) {
      console.error('Phone number not found:', to);
      return new Response('OK', { status: 200 });
    }

    const orgId = phoneNumber.organization_id;

    // Find or create contact
    let contactId: string;
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('organization_id', orgId)
      .eq('phone_number', from)
      .single();

    if (existingContact) {
      contactId = existingContact.id;
      // Update last contacted
      await supabase
        .from('contacts')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', contactId);
    } else {
      const { data: newContact } = await supabase
        .from('contacts')
        .insert({
          organization_id: orgId,
          phone_number: from,
          formatted_phone: from,
        })
        .select('id')
        .single();
      contactId = newContact?.id;
    }

    // Find or create conversation
    let conversationId: string;
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('organization_id', orgId)
      .eq('contact_id', contactId)
      .eq('phone_number_id', phoneNumber.id)
      .single();

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          organization_id: orgId,
          contact_id: contactId,
          phone_number_id: phoneNumber.id,
          status: 'open',
          unread_count: 1,
        })
        .select('id')
        .single();
      conversationId = newConv?.id;
    }

    // Store message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      contact_id: contactId,
      phone_number_id: phoneNumber.id,
      direction: 'inbound',
      type: mediaUrls.length > 0 ? 'mms' : 'sms',
      body,
      media_urls: mediaUrls,
      status: 'delivered',
      twilio_sid: messageSid,
      delivered_at: new Date().toISOString(),
    });

    // Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: body?.slice(0, 100) || 'MMS',
        unread_count: supabase.rpc ? undefined : 1, // Will use SQL increment
      })
      .eq('id', conversationId);

    // Increment unread count
    await supabase.rpc('increment_unread', { conv_id: conversationId }).catch(() => {
      // Fallback: manual increment
      supabase
        .from('conversations')
        .select('unread_count')
        .eq('id', conversationId)
        .single()
        .then(({ data }) => {
          if (data) {
            supabase
              .from('conversations')
              .update({ unread_count: (data.unread_count || 0) + 1 })
              .eq('id', conversationId);
          }
        });
    });

    // Track usage
    const eventType = mediaUrls.length > 0 ? 'mms_received' : 'sms_received';
    await supabase.from('usage_events').insert({
      organization_id: orgId,
      event_type: eventType,
      quantity: 1,
      metadata: { message_sid: messageSid, from },
    });

    // Check for opt-out keywords
    const upperBody = (body || '').toUpperCase().trim();
    if (['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(upperBody)) {
      await supabase
        .from('contacts')
        .update({ opt_out: true, opt_out_at: new Date().toISOString() })
        .eq('id', contactId);
    }

    // Return TwiML response (empty for SMS, Twilio expects 200)
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error processing inbound SMS:', error);
    return new Response('OK', { status: 200 }); // Always return 200 to Twilio
  }
});
