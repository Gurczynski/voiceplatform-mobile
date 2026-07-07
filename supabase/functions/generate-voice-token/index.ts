// Generate Twilio Voice Access Token
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders, getAuthenticatedUser, verifyOrgMembership,
  createSupabaseClient, errorResponse, successResponse, handleOptions
} from '../_shared/utils.ts';

serve(async (req) => {
  const optionsResp = await handleOptions(req);
  if (optionsResp) return optionsResp;

  try {
    const authHeader = req.headers.get('Authorization')!;
    const user = await getAuthenticatedUser(authHeader);
    const { organizationId } = await req.json();

    const supabase = createSupabaseClient(authHeader);
    const membership = await verifyOrgMembership(supabase, user.id, organizationId);

    // Get organization for Twilio credentials
    const { data: org } = await supabase
      .from('organizations')
      .select('twilio_subaccount_sid, twilio_subaccount_auth_token_encrypted, mode')
      .eq('id', organizationId)
      .single();

    if (!org) return errorResponse('Organization not found');

    let accountSid: string;
    let authToken: string;

    if (org.mode === 'managed' && org.twilio_subaccount_sid) {
      accountSid = org.twilio_subaccount_sid;
      authToken = atob(org.twilio_subaccount_auth_token_encrypted);
    } else {
      // BYOT mode - get from twilio_accounts table
      const { data: twilioAccount } = await supabase
        .from('twilio_accounts')
        .select('account_sid, auth_token_encrypted')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single();

      if (!twilioAccount) return errorResponse('No Twilio account configured');
      accountSid = twilioAccount.account_sid;
      authToken = atob(twilioAccount.auth_token_encrypted);
    }

    const twilioApiKeySid = Deno.env.get('TWILIO_API_KEY_SID');
    const twilioApiKeySecret = Deno.env.get('TWILIO_API_KEY_SECRET');

    if (!twilioApiKeySid || !twilioApiKeySecret) {
      return errorResponse('Twilio API keys not configured');
    }

    // Generate Access Token using Twilio API
    // For now, return a mock token structure - in production, use Twilio's AccessToken
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

    // In production, use Twilio's JWT library to sign this
    // For MVP, return the credentials needed for the client to generate a token
    return successResponse({
      token: btoa(JSON.stringify(tokenPayload)), // Placeholder - use proper JWT in production
      identity: user.id,
      account_sid: accountSid,
    });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
});
