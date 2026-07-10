// Health Check - Returns system status
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createServiceClient, successResponse, handleOptions } from '../_shared/utils.ts';

serve(async (req) => {
  const optionsResp = await handleOptions(req);
  if (optionsResp) return optionsResp;

  const checks: Record<string, string> = {};

  // Check Supabase
  try {
    const supabase = createServiceClient();
    await supabase.from('organizations').select('id').limit(1);
    checks.database = 'ok';
  } catch (e) {
    checks.database = 'error';
  }

  // Check Twilio
  const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  checks.twilio = twilioSid && twilioToken ? 'configured' : 'not_configured';

  // Check Stripe
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  checks.stripe = stripeKey ? 'configured' : 'not_configured';

  // Check Ollama Cloud
  const ollamaKey = Deno.env.get('OLLAMA_API_KEY');
  checks.ai_cloud = ollamaKey ? 'configured' : 'not_configured';

  // Check local Ollama
  try {
    const localResp = await fetch('http://host.docker.internal:11434/api/tags', { signal: AbortSignal.timeout(3000) });
    checks.ai_local = localResp.ok ? 'available' : 'unavailable';
  } catch (e) {
    checks.ai_local = 'unavailable';
  }

  const allOk = Object.values(checks).every(v => v === 'ok' || v === 'configured' || v === 'available');

  return successResponse({
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks,
  });
});
