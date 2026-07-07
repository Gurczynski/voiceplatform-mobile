// Scheduled Voice TwiML - Returns TwiML for scheduled voice calls
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createServiceClient } from '../_shared/utils.ts';

serve(async (req) => {
  try {
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const to = formData.get('To') as string;

    const supabase = createServiceClient();

    // Find the scheduled job for this call
    const { data: job } = await supabase
      .from('scheduled_jobs')
      .select('voice_script, message_body, metadata')
      .eq('metadata->>twilio_call_sid', callSid)
      .single();

    const script = job?.voice_script || job?.message_body || 'This is a scheduled call. Thank you for your time.';

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(script)}</Say>
  <Pause length="1"/>
  <Say voice="Polly.Joanna">Goodbye.</Say>
  <Hangup/>
</Response>`;

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Scheduled voice TwiML error:', error);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>This is a scheduled call. Goodbye.</Say><Hangup/></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }
});

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
