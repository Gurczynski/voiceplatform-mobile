// Shared utilities for Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

export function createSupabaseClient(authHeader: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );
}

export function createServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

export async function getAuthenticatedUser(authHeader: string) {
  const supabase = createSupabaseClient(authHeader);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');
  return user;
}

export async function verifyOrgMembership(supabase: any, userId: string, orgId: string) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('role, is_active')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !data) throw new Error('Not a member of this organization');
  return data;
}

export async function verifyNumberAssignment(supabase: any, userId: string, phoneNumberId: string) {
  const { data, error } = await supabase
    .from('number_assignments')
    .select('*')
    .eq('phone_number_id', phoneNumberId)
    .eq('user_id', userId)
    .single();

  return data;
}

export async function logAuditEvent(
  supabase: any,
  orgId: string,
  userId: string | null,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: Record<string, any>
) {
  await supabase.from('audit_logs').insert({
    organization_id: orgId,
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details: details || {},
  });
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

export function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function successResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function handleOptions(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

// Get Twilio credentials for an organization
// Managed mode: uses main account credentials from env vars or database
// BYOT mode: uses customer's stored credentials
export async function getTwilioCredentials(supabase: any, organizationId: string) {
  const { data: org } = await supabase
    .from('organizations')
    .select('twilio_subaccount_sid, twilio_subaccount_auth_token_encrypted, mode')
    .eq('id', organizationId)
    .single();

  if (!org) throw new Error('Organization not found');

  let accountSid: string;
  let authToken: string;
  let mainAccountSid: string;

  if (org.mode === 'managed' && org.twilio_subaccount_sid) {
    // Managed mode: use main account credentials to call subaccount API
    accountSid = org.twilio_subaccount_sid; // Used in API URL
    mainAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || ''; // Used for auth
    authToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
    
    // Fallback: try to get from database
    if (!authToken && org.twilio_subaccount_auth_token_encrypted) {
      try {
        authToken = atob(org.twilio_subaccount_auth_token_encrypted);
      } catch (e) {
        // Ignore decode errors
      }
    }
    
    if (!authToken) throw new Error('TWILIO_AUTH_TOKEN not configured');
    if (!mainAccountSid) throw new Error('TWILIO_ACCOUNT_SID not configured');
  } else {
    // BYOT mode: use customer's own Twilio credentials
    const { data: twilioAccount } = await supabase
      .from('twilio_accounts')
      .select('account_sid, auth_token_encrypted')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (!twilioAccount) throw new Error('No Twilio account configured');
    accountSid = twilioAccount.account_sid;
    mainAccountSid = accountSid; // Same account for BYOT
    authToken = atob(twilioAccount.auth_token_encrypted);
  }

  return { accountSid, authToken, mainAccountSid };
}
