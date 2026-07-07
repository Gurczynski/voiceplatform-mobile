// Call Status Webhook from Twilio
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createServiceClient } from '../_shared/utils.ts';

serve(async (req) => {
  try {
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const duration = formData.get('CallDuration') as string;
    const recordingUrl = formData.get('RecordingUrl') as string;
    const recordingSid = formData.get('RecordingSid') as string;
    const answeredBy = formData.get('AnsweredBy') as string;

    const supabase = createServiceClient();

    // Find the call
    const { data: call } = await supabase
      .from('calls')
      .select('id, organization_id, contact_id, phone_number_id')
      .eq('twilio_sid', callSid)
      .single();

    if (!call) {
      console.error('Call not found:', callSid);
      return new Response('OK', { status: 200 });
    }

    // Map Twilio status to our status
    const statusMap: Record<string, string> = {
      'queued': 'ringing',
      'ringing': 'ringing',
      'in-progress': 'in_progress',
      'completed': 'completed',
      'busy': 'busy',
      'no-answer': 'no_answer',
      'canceled': 'canceled',
      'failed': 'failed',
    };

    const updates: Record<string, any> = {
      status: statusMap[callStatus] || callStatus,
    };

    if (duration) updates.duration_seconds = parseInt(duration);
    if (callStatus === 'in-progress') updates.answered_at = new Date().toISOString();
    if (['completed', 'busy', 'no-answer', 'canceled', 'failed'].includes(callStatus)) {
      updates.ended_at = new Date().toISOString();
    }

    // Update call record
    await supabase
      .from('calls')
      .update(updates)
      .eq('id', call.id);

    // Store call event
    await supabase.from('call_events').insert({
      call_id: call.id,
      event_type: callStatus,
      data: {
        duration,
        recordingUrl,
        recordingSid,
        answeredBy,
      },
    });

    // If recording is available, store it
    if (recordingUrl && recordingSid) {
      await supabase.from('recordings').insert({
        organization_id: call.organization_id,
        call_id: call.id,
        phone_number_id: call.phone_number_id,
        status: 'processing',
        duration_seconds: parseInt(duration || '0'),
        file_url: recordingUrl,
        twilio_sid: recordingSid,
      });
    }

    // Track usage for completed calls
    if (callStatus === 'completed' && duration) {
      const minutes = Math.ceil(parseInt(duration) / 60);
      await supabase.from('usage_events').insert({
        organization_id: call.organization_id,
        event_type: 'voice_inbound_minute',
        quantity: minutes,
        metadata: { call_id: call.id, call_sid: callSid },
      });
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error in call status webhook:', error);
    return new Response('OK', { status: 200 });
  }
});
