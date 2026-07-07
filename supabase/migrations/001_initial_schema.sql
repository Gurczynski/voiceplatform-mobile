-- VoicePlatform Database Schema
-- All tables with RLS for multi-tenant isolation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- CORE TABLES
-- ============================================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  email TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  mfa_enabled BOOLEAN DEFAULT false,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Organizations
CREATE TABLE public.organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  mode TEXT NOT NULL DEFAULT 'managed' CHECK (mode IN ('managed', 'byot')),
  logo_url TEXT,
  industry TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  settings JSONB DEFAULT '{}',
  features JSONB DEFAULT '{}',
  twilio_subaccount_sid TEXT,
  twilio_subaccount_auth_token_encrypted TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Organization members
CREATE TABLE public.organization_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('owner', 'admin', 'manager', 'agent', 'billing_admin', 'developer', 'security_admin')),
  is_active BOOLEAN DEFAULT true,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Roles (custom roles per org)
CREATE TABLE public.roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Permissions
CREATE TABLE public.permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'manage')),
  conditions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TWILIO TABLES
-- ============================================================

-- Twilio accounts (for BYOT mode)
CREATE TABLE public.twilio_accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  account_sid TEXT NOT NULL,
  auth_token_encrypted TEXT NOT NULL,
  friendly_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Phone numbers
CREATE TABLE public.phone_numbers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  formatted_number TEXT NOT NULL,
  friendly_name TEXT,
  type TEXT DEFAULT 'local' CHECK (type IN ('local', 'toll_free', 'mobile', 'short_code')),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'purchased', 'assigned', 'porting', 'released', 'suspended')),
  capabilities JSONB DEFAULT '{"voice": true, "sms": true, "mms": true}',
  country_code TEXT DEFAULT 'US',
  region TEXT,
  locality TEXT,
  twilio_sid TEXT,
  recording_enabled BOOLEAN DEFAULT false,
  transcription_enabled BOOLEAN DEFAULT false,
  voicemail_enabled BOOLEAN DEFAULT true,
  ai_receptionist_enabled BOOLEAN DEFAULT false,
  ivr_flow_id UUID,
  forwarding_number TEXT,
  business_hours_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Number assignments
CREATE TABLE public.number_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  phone_number_id UUID REFERENCES public.phone_numbers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID,
  assignment_type TEXT DEFAULT 'user' CHECK (assignment_type IN ('user', 'team', 'ring_group')),
  is_primary BOOLEAN DEFAULT false,
  can_make_calls BOOLEAN DEFAULT true,
  can_receive_calls BOOLEAN DEFAULT true,
  can_send_sms BOOLEAN DEFAULT true,
  can_receive_sms BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(phone_number_id, user_id)
);

-- ============================================================
-- CONTACTS & MESSAGING
-- ============================================================

-- Contacts
CREATE TABLE public.contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  formatted_phone TEXT,
  name TEXT,
  email TEXT,
  company TEXT,
  avatar_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_vip BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  opt_out BOOLEAN DEFAULT false,
  opt_out_at TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Conversations
CREATE TABLE public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  phone_number_id UUID REFERENCES public.phone_numbers(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'archived')),
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages
CREATE TABLE public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  phone_number_id UUID REFERENCES public.phone_numbers(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  type TEXT DEFAULT 'sms' CHECK (type IN ('sms', 'mms', 'secure')),
  body TEXT,
  media_urls TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'undelivered', 'read')),
  is_ai_generated BOOLEAN DEFAULT false,
  is_auto_reply BOOLEAN DEFAULT false,
  twilio_sid TEXT,
  twilio_status TEXT,
  error_code TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CALLS & RECORDINGS
-- ============================================================

-- Calls
CREATE TABLE public.calls (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id),
  phone_number_id UUID REFERENCES public.phone_numbers(id),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status TEXT DEFAULT 'ringing' CHECK (status IN ('ringing', 'in_progress', 'completed', 'busy', 'no_answer', 'canceled', 'failed')),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  caller_name TEXT,
  duration_seconds INTEGER DEFAULT 0,
  recording_id UUID,
  answered_by UUID REFERENCES auth.users(id),
  initiated_by UUID REFERENCES auth.users(id),
  ai_summary TEXT,
  ai_sentiment TEXT,
  ai_action_items JSONB DEFAULT '[]',
  ai_transcript TEXT,
  twilio_sid TEXT,
  forwarded_from TEXT,
  parent_call_sid TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Call events (timeline)
CREATE TABLE public.call_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  call_id UUID REFERENCES public.calls(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Recordings
CREATE TABLE public.recordings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  call_id UUID REFERENCES public.calls(id) ON DELETE CASCADE NOT NULL,
  phone_number_id UUID REFERENCES public.phone_numbers(id),
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'deleted')),
  duration_seconds INTEGER DEFAULT 0,
  file_url TEXT,
  file_size_bytes BIGINT,
  transcription TEXT,
  ai_summary TEXT,
  ai_sentiment TEXT,
  ai_action_items JSONB DEFAULT '[]',
  twilio_sid TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Voicemail messages
CREATE TABLE public.voicemail_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  call_id UUID REFERENCES public.calls(id),
  phone_number_id UUID REFERENCES public.phone_numbers(id) NOT NULL,
  contact_id UUID REFERENCES public.contacts(id),
  assigned_to UUID REFERENCES auth.users(id),
  from_number TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  audio_url TEXT,
  transcription TEXT,
  ai_summary TEXT,
  ai_priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'listened', 'resolved')),
  is_urgent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- IVR & ROUTING
-- ============================================================

-- IVR flows
CREATE TABLE public.ivr_flows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  version INTEGER DEFAULT 1,
  is_default BOOLEAN DEFAULT false,
  flow_data JSONB DEFAULT '{"nodes": [], "edges": []}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- IVR nodes (for queryable flow components)
CREATE TABLE public.ivr_nodes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ivr_flow_id UUID REFERENCES public.ivr_flows(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  position_x REAL DEFAULT 0,
  position_y REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Forwarding rules
CREATE TABLE public.forwarding_rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  phone_number_id UUID REFERENCES public.phone_numbers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  forward_to TEXT NOT NULL,
  ring_seconds INTEGER DEFAULT 20,
  priority INTEGER DEFAULT 0,
  conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ring groups
CREATE TABLE public.ring_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  ring_strategy TEXT DEFAULT 'simultaneous' CHECK (ring_strategy IN ('simultaneous', 'sequential', 'round_robin')),
  ring_seconds INTEGER DEFAULT 20,
  is_active BOOLEAN DEFAULT true,
  members JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Business hours
CREATE TABLE public.business_hours (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default',
  is_active BOOLEAN DEFAULT true,
  schedule JSONB DEFAULT '{
    "monday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "tuesday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "wednesday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "thursday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "friday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "saturday": {"enabled": false, "start": "09:00", "end": "17:00"},
    "sunday": {"enabled": false, "start": "09:00", "end": "17:00"}
  }',
  timezone TEXT DEFAULT 'America/New_York',
  after_hours_action TEXT DEFAULT 'voicemail' CHECK (after_hours_action IN ('voicemail', 'forward', 'ai_receptionist', 'hangup')),
  after_hours_forward_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Holidays
CREATE TABLE public.holidays (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  business_hours_id UUID REFERENCES public.business_hours(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  action TEXT DEFAULT 'voicemail' CHECK (action IN ('voicemail', 'forward', 'ai_receptionist', 'hangup')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- AI TABLES
-- ============================================================

-- AI agents
CREATE TABLE public.ai_agents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'AI Receptionist',
  description TEXT,
  personality TEXT DEFAULT 'professional',
  voice_id TEXT,
  greeting TEXT DEFAULT 'Hello, how can I help you today?',
  fallback_message TEXT DEFAULT 'I''m sorry, I couldn''t understand. Let me transfer you to a human.',
  business_name TEXT,
  tone TEXT DEFAULT 'professional' CHECK (tone IN ('professional', 'friendly', 'casual', 'formal')),
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI knowledge sources
CREATE TABLE public.ai_knowledge_sources (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  ai_agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('url', 'faq', 'pdf', 'text', 'qa_pair')),
  title TEXT NOT NULL,
  content TEXT,
  url TEXT,
  file_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI usage events
CREATE TABLE public.ai_usage_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('voice_minute', 'token', 'transcription', 'summary')),
  quantity INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- BILLING TABLES
-- ============================================================

-- Billing customers
CREATE TABLE public.billing_customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  email TEXT,
  name TEXT,
  payment_method_id TEXT,
  default_payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Subscriptions
CREATE TABLE public.subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  tier TEXT DEFAULT 'starter' CHECK (tier IN ('starter', 'professional', 'business', 'enterprise')),
  status TEXT DEFAULT 'active' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Invoices
CREATE TABLE public.invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  stripe_invoice_id TEXT UNIQUE,
  status TEXT,
  amount_due_cents INTEGER DEFAULT 0,
  amount_paid_cents INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  invoice_pdf TEXT,
  hosted_invoice_url TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Usage events
CREATE TABLE public.usage_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'voice_inbound_minute', 'voice_outbound_minute',
    'sms_sent', 'sms_received', 'mms_sent', 'mms_received',
    'recording_minute', 'transcription_minute',
    'ai_voice_minute', 'ai_token',
    'storage_byte', 'api_call'
  )),
  quantity REAL DEFAULT 1,
  unit_cost_cents INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  stripe_usage_record_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- A2P COMPLIANCE
-- ============================================================

-- A2P registrations
CREATE TABLE public.a2p_registrations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  brand_name TEXT NOT NULL,
  brand_status TEXT DEFAULT 'pending' CHECK (brand_status IN ('pending', 'approved', 'rejected', 'suspended')),
  campaign_name TEXT,
  campaign_status TEXT DEFAULT 'pending' CHECK (campaign_status IN ('pending', 'active', 'suspended', 'expired')),
  use_case TEXT,
  sample_messages TEXT[],
  opt_in_method TEXT,
  opt_out_handling TEXT DEFAULT 'STOP to unsubscribe',
  help_message TEXT DEFAULT 'Reply HELP for help',
  expected_volume TEXT,
  privacy_policy_url TEXT,
  terms_url TEXT,
  rejection_reason TEXT,
  twilio_brand_sid TEXT,
  twilio_campaign_sid TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SECURITY & AUDIT
-- ============================================================

-- Audit logs
CREATE TABLE public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trusted devices
CREATE TABLE public.trusted_devices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_name TEXT,
  device_type TEXT,
  device_fingerprint TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Security events
CREATE TABLE public.security_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notification settings
CREATE TABLE public.notification_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  sms_alerts BOOLEAN DEFAULT false,
  call_alerts BOOLEAN DEFAULT true,
  voicemail_alerts BOOLEAN DEFAULT true,
  message_alerts BOOLEAN DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Webhooks
CREATE TABLE public.webhooks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT,
  is_active BOOLEAN DEFAULT true,
  failure_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Integrations
CREATE TABLE public.integrations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('crm', 'scheduling', 'marketing', 'reputation', 'custom')),
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  credentials_encrypted TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_phone_numbers_org ON public.phone_numbers(organization_id);
CREATE INDEX idx_phone_numbers_status ON public.phone_numbers(status);
CREATE INDEX idx_number_assignments_user ON public.number_assignments(user_id);
CREATE INDEX idx_number_assignments_number ON public.number_assignments(phone_number_id);
CREATE INDEX idx_contacts_org ON public.contacts(organization_id);
CREATE INDEX idx_contacts_phone ON public.contacts(phone_number);
CREATE INDEX idx_conversations_org ON public.conversations(organization_id);
CREATE INDEX idx_conversations_contact ON public.conversations(contact_id);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_created ON public.messages(created_at);
CREATE INDEX idx_calls_org ON public.calls(organization_id);
CREATE INDEX idx_calls_started ON public.calls(started_at);
CREATE INDEX idx_calls_contact ON public.calls(contact_id);
CREATE INDEX idx_call_events_call ON public.call_events(call_id);
CREATE INDEX idx_recordings_call ON public.recordings(call_id);
CREATE INDEX idx_voicemail_org ON public.voicemail_messages(organization_id);
CREATE INDEX idx_audit_logs_org ON public.audit_logs(organization_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at);
CREATE INDEX idx_usage_events_org ON public.usage_events(organization_id);
CREATE INDEX idx_usage_events_type ON public.usage_events(event_type);

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twilio_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.number_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voicemail_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ivr_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ivr_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forwarding_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ring_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.a2p_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTION: Check org membership
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT organization_id FROM public.organization_members
  WHERE user_id = auth.uid() AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.has_org_role(org_id UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND is_active = true
    AND role = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.has_org_role_any(org_id UUID, required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND is_active = true
    AND role = ANY(required_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- User profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Organizations: members can view their orgs
CREATE POLICY "Members can view their organizations" ON public.organizations
  FOR SELECT USING (id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Owners can update organization" ON public.organizations
  FOR UPDATE USING (public.has_org_role(id, 'owner'));

CREATE POLICY "Authenticated users can create organizations" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Organization members: members can view other members in their org
CREATE POLICY "Members can view org members" ON public.organization_members
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Admins can manage org members" ON public.organization_members
  FOR ALL USING (public.has_org_role_any(organization_id, ARRAY['owner', 'admin']));

-- Roles: org members can view roles
CREATE POLICY "Members can view roles" ON public.roles
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Admins can manage roles" ON public.roles
  FOR ALL USING (public.has_org_role_any(organization_id, ARRAY['owner', 'admin']));

-- Permissions: org members can view
CREATE POLICY "Members can view permissions" ON public.permissions
  FOR SELECT USING (role_id IN (
    SELECT id FROM public.roles WHERE organization_id IN (SELECT public.get_user_org_ids())
  ));

-- Twilio accounts: admins only (never exposed to normal users via API)
CREATE POLICY "Admins can view twilio accounts" ON public.twilio_accounts
  FOR SELECT USING (public.has_org_role_any(organization_id, ARRAY['owner', 'admin']));

CREATE POLICY "Admins can manage twilio accounts" ON public.twilio_accounts
  FOR ALL USING (public.has_org_role_any(organization_id, ARRAY['owner', 'admin']));

-- Phone numbers: members can view assigned numbers, admins see all
CREATE POLICY "Members can view org phone numbers" ON public.phone_numbers
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_org_ids())
    AND (
      public.has_org_role_any(organization_id, ARRAY['owner', 'admin', 'manager'])
      OR id IN (
        SELECT phone_number_id FROM public.number_assignments
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage phone numbers" ON public.phone_numbers
  FOR ALL USING (public.has_org_role_any(organization_id, ARRAY['owner', 'admin']));

-- Number assignments: members can view, admins can manage
CREATE POLICY "Members can view assignments" ON public.number_assignments
  FOR SELECT USING (
    phone_number_id IN (
      SELECT id FROM public.phone_numbers
      WHERE organization_id IN (SELECT public.get_user_org_ids())
    )
  );

CREATE POLICY "Admins can manage assignments" ON public.number_assignments
  FOR ALL USING (
    phone_number_id IN (
      SELECT id FROM public.phone_numbers
      WHERE public.has_org_role_any(organization_id, ARRAY['owner', 'admin'])
    )
  );

-- Contacts: org members can view/manage
CREATE POLICY "Members can view contacts" ON public.contacts
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Members can manage contacts" ON public.contacts
  FOR ALL USING (organization_id IN (SELECT public.get_user_org_ids()));

-- Conversations: members can view based on number assignment
CREATE POLICY "Members can view conversations" ON public.conversations
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_org_ids())
    AND (
      public.has_org_role_any(organization_id, ARRAY['owner', 'admin', 'manager'])
      OR phone_number_id IN (
        SELECT phone_number_id FROM public.number_assignments
        WHERE user_id = auth.uid()
      )
      OR assigned_to = auth.uid()
    )
  );

CREATE POLICY "Members can manage conversations" ON public.conversations
  FOR ALL USING (organization_id IN (SELECT public.get_user_org_ids()));

-- Messages: same as conversations
CREATE POLICY "Members can view messages" ON public.messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE organization_id IN (SELECT public.get_user_org_ids())
      AND (
        public.has_org_role_any(organization_id, ARRAY['owner', 'admin', 'manager'])
        OR phone_number_id IN (
          SELECT phone_number_id FROM public.number_assignments
          WHERE user_id = auth.uid()
        )
        OR assigned_to = auth.uid()
      )
    )
  );

CREATE POLICY "Members can insert messages" ON public.messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE organization_id IN (SELECT public.get_user_org_ids())
    )
  );

-- Calls: members can view based on number assignment
CREATE POLICY "Members can view calls" ON public.calls
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_org_ids())
    AND (
      public.has_org_role_any(organization_id, ARRAY['owner', 'admin', 'manager'])
      OR phone_number_id IN (
        SELECT phone_number_id FROM public.number_assignments
        WHERE user_id = auth.uid()
      )
      OR answered_by = auth.uid()
      OR initiated_by = auth.uid()
    )
  );

CREATE POLICY "System can manage calls" ON public.calls
  FOR ALL USING (organization_id IN (SELECT public.get_user_org_ids()));

-- Call events: same as calls
CREATE POLICY "Members can view call events" ON public.call_events
  FOR SELECT USING (
    call_id IN (
      SELECT id FROM public.calls
      WHERE organization_id IN (SELECT public.get_user_org_ids())
    )
  );

CREATE POLICY "System can insert call events" ON public.call_events
  FOR INSERT WITH CHECK (
    call_id IN (
      SELECT id FROM public.calls
      WHERE organization_id IN (SELECT public.get_user_org_ids())
    )
  );

-- Recordings: same as calls
CREATE POLICY "Members can view recordings" ON public.recordings
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_org_ids())
    AND (
      public.has_org_role_any(organization_id, ARRAY['owner', 'admin', 'manager'])
      OR phone_number_id IN (
        SELECT phone_number_id FROM public.number_assignments
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can manage recordings" ON public.recordings
  FOR ALL USING (organization_id IN (SELECT public.get_user_org_ids()));

-- Voicemail: same pattern
CREATE POLICY "Members can view voicemail" ON public.voicemail_messages
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_org_ids())
    AND (
      public.has_org_role_any(organization_id, ARRAY['owner', 'admin', 'manager'])
      OR phone_number_id IN (
        SELECT phone_number_id FROM public.number_assignments
        WHERE user_id = auth.uid()
      )
      OR assigned_to = auth.uid()
    )
  );

CREATE POLICY "System can manage voicemail" ON public.voicemail_messages
  FOR ALL USING (organization_id IN (SELECT public.get_user_org_ids()));

-- IVR flows: org members can view, admins can manage
CREATE POLICY "Members can view IVR flows" ON public.ivr_flows
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Admins can manage IVR flows" ON public.ivr_flows
  FOR ALL USING (public.has_org_role_any(organization_id, ARRAY['owner', 'admin', 'manager']));

-- IVR nodes: same as flows
CREATE POLICY "Members can view IVR nodes" ON public.ivr_nodes
  FOR SELECT USING (ivr_flow_id IN (
    SELECT id FROM public.ivr_flows WHERE organization_id IN (SELECT public.get_user_org_ids())
  ));

CREATE POLICY "Admins can manage IVR nodes" ON public.ivr_nodes
  FOR ALL USING (ivr_flow_id IN (
    SELECT id FROM public.ivr_flows WHERE public.has_org_role_any(organization_id, ARRAY['owner', 'admin', 'manager'])
  ));

-- Forwarding rules: org members
CREATE POLICY "Members can view forwarding rules" ON public.forwarding_rules
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Admins can manage forwarding rules" ON public.forwarding_rules
  FOR ALL USING (public.has_org_role_any(organization_id, ARRAY['owner', 'admin']));

-- Ring groups
CREATE POLICY "Members can view ring groups" ON public.ring_groups
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Admins can manage ring groups" ON public.ring_groups
  FOR ALL USING (public.has_org_role_any(organization_id, ARRAY['owner', 'admin']));

-- Business hours
CREATE POLICY "Members can view business hours" ON public.business_hours
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Admins can manage business hours" ON public.business_hours
  FOR ALL USING (public.has_org_role_any(organization_id, ARRAY['owner', 'admin', 'manager']));

-- Holidays
CREATE POLICY "Members can view holidays" ON public.holidays
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Admins can manage holidays" ON public.holidays
  FOR ALL USING (public.has_org_role_any(organization_id, ARRAY['owner', 'admin', 'manager']));

-- AI agents
CREATE POLICY "Members can view AI agents" ON public.ai_agents
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Admins can manage AI agents" ON public.ai_agents
  FOR ALL USING (public.has_org_role_any(organization_id, ARRAY['owner', 'admin']));

-- AI knowledge sources
CREATE POLICY "Members can view knowledge sources" ON public.ai_knowledge_sources
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Admins can manage knowledge sources" ON public.ai_knowledge_sources
  FOR ALL USING (public.has_org_role_any(organization_id, ARRAY['owner', 'admin']));

-- AI usage events
CREATE POLICY "Members can view AI usage" ON public.ai_usage_events
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "System can insert AI usage" ON public.ai_usage_events
  FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_user_org_ids()));

-- Billing customers
CREATE POLICY "Billing admins can view billing" ON public.billing_customers
  FOR SELECT USING (public.has_org_role_any(organization_id, ARRAY['owner', 'admin', 'billing_admin']));

CREATE POLICY "Billing admins can manage billing" ON public.billing_customers
  FOR ALL USING (public.has_org_role_any(organization_id, ARRAY['owner', 'admin', 'billing_admin']));

-- Subscriptions
CREATE POLICY "Members can view subscription" ON public.subscriptions
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Billing admins can manage subscription" ON public.subscriptions
  FOR ALL USING (public.has_org_role_any(organization_id, ARRAY['owner', 'admin', 'billing_admin']));

-- Invoices
CREATE POLICY "Members can view invoices" ON public.invoices
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "System can manage invoices" ON public.invoices
  FOR ALL USING (organization_id IN (SELECT public.get_user_org_ids()));

-- Usage events
CREATE POLICY "Members can view usage" ON public.usage_events
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "System can insert usage" ON public.usage_events
  FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_user_org_ids()));

-- A2P registrations
CREATE POLICY "Members can view A2P" ON public.a2p_registrations
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Admins can manage A2P" ON public.a2p_registrations
  FOR ALL USING (public.has_org_role_any(organization_id, ARRAY['owner', 'admin']));

-- Audit logs: members can view their org logs
CREATE POLICY "Members can view audit logs" ON public.audit_logs
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- Trusted devices: users can manage their own
CREATE POLICY "Users can view own devices" ON public.trusted_devices
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own devices" ON public.trusted_devices
  FOR ALL USING (user_id = auth.uid());

-- Security events: admins can view
CREATE POLICY "Admins can view security events" ON public.security_events
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('owner', 'admin', 'security_admin')
    )
  );

CREATE POLICY "System can insert security events" ON public.security_events
  FOR INSERT WITH CHECK (true);

-- Notification settings: users can manage their own
CREATE POLICY "Users can view own notifications" ON public.notification_settings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own notifications" ON public.notification_settings
  FOR ALL USING (user_id = auth.uid());

-- Webhooks: admins can manage
CREATE POLICY "Admins can view webhooks" ON public.webhooks
  FOR SELECT USING (public.has_org_role_any(organization_id, ARRAY['owner', 'admin', 'developer']));

CREATE POLICY "Admins can manage webhooks" ON public.webhooks
  FOR ALL USING (public.has_org_role_any(organization_id, ARRAY['owner', 'admin', 'developer']));

-- Integrations: admins can manage
CREATE POLICY "Admins can view integrations" ON public.integrations
  FOR SELECT USING (public.has_org_role_any(organization_id, ARRAY['owner', 'admin']));

CREATE POLICY "Admins can manage integrations" ON public.integrations
  FOR ALL USING (public.has_org_role_any(organization_id, ARRAY['owner', 'admin']));

-- ============================================================
-- FUNCTIONS: Auto-update timestamps
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_phone_numbers_updated_at
  BEFORE UPDATE ON public.phone_numbers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_ivr_flows_updated_at
  BEFORE UPDATE ON public.ivr_flows
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_ai_agents_updated_at
  BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_billing_customers_updated_at
  BEFORE UPDATE ON public.billing_customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_ring_groups_updated_at
  BEFORE UPDATE ON public.ring_groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_a2p_registrations_updated_at
  BEFORE UPDATE ON public.a2p_registrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- FUNCTION: Auto-create user profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
