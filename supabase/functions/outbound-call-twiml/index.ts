// Outbound Call TwiML - Returns TwiML for outbound calls
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  try {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>You are now connected. Please wait while we dial.</Say>
</Response>`;

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>An error occurred.</Say><Hangup/></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }
});
