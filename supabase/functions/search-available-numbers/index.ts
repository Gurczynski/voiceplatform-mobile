// Search Available Phone Numbers from Twilio
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
    const { organizationId, countryCode, areaCode, type, capabilities } = await req.json();

    const supabase = createSupabaseClient(authHeader);
    await verifyOrgMembership(supabase, user.id, organizationId);

    const { accountSid, authToken } = await getTwilioCredentials(supabase, organizationId);

    // Search Twilio for available numbers
    const params = new URLSearchParams({
      Country: countryCode || 'US',
      Limit: '20',
    });

    if (areaCode) params.append('AreaCode', areaCode);
    if (capabilities?.voice) params.append('VoiceEnabled', 'true');
    if (capabilities?.sms) params.append('SmsEnabled', 'true');
    if (capabilities?.mms) params.append('MmsEnabled', 'true');

    const endpoint = type === 'toll_free'
      ? `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/US/TollFree.json`
      : `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/US/Local.json`;

    const twilioResp = await fetch(`${endpoint}?${params}`, {
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      },
    });

    if (!twilioResp.ok) {
      const err = await twilioResp.text();
      return errorResponse(`Twilio error: ${err}`, 502);
    }

    const twilioData = await twilioResp.json();
    const numbers = (twilioData.available_phone_numbers || []).map((n: any) => ({
      phone_number: n.phone_number,
      friendly_name: n.friendly_name,
      locality: n.locality,
      region: n.region,
      country_code: n.country_code,
      capabilities: {
        voice: n.capabilities?.voice || false,
        sms: n.capabilities?.SMS || false,
        mms: n.capabilities?.MMS || false,
      },
    }));

    return successResponse({ numbers });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
});
