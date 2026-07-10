// Generate Twilio Voice Access Token
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders, getAuthenticatedUser, verifyOrgMembership,
  createSupabaseClient, errorResponse, successResponse, handleOptions,
  getTwilioCredentials
} from '../_shared/utils.ts';

serve(async (req) => {
  const optionsResp = await handleOptions(req);
  if (optionsResp) return optionsResp;

  try {
    const authHeader = req.headers.get('Authorization')!;
    const user = await getAuthenticatedUser(authHeader);
    const { organizationId } = await req.json();

    const supabase = createSupabaseClient(authHeader);
    await verifyOrgMembership(supabase, user.id, organizationId);

    const { accountSid, authToken } = await getTwilioCredentials(supabase, organizationId);

    const twilioApiKeySid = Deno.env.get('TWILIO_API_KEY_SID');
    const twilioApiKeySecret = Deno.env.get('TWILIO_API_KEY_SECRET');

    if (!twilioApiKeySid || !twilioApiKeySecret) {
      return errorResponse('Twilio API keys not configured');
    }

    // Generate Access Token
    const tokenPayload = {
      account_sid: accountSid,
      api_key_sid: twilioApiKeySid,
      identity: user.id,
      grants: {
        voice: {
          incoming: { allow: true },
          outgoing: { application_sid: Deno.env.get('TWILIO_TWIML_APP_SID') },
        },
      },
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    return successResponse({
      token: btoa(JSON.stringify(tokenPayload)),
      identity: user.id,
      account_sid: accountSid,
    });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
});
