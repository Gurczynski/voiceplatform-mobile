export interface Organization {
  id: string;
  name: string;
  slug: string;
  mode: 'managed' | 'byot';
  logo_url?: string;
  industry?: string;
  timezone: string;
  settings: Record<string, any>;
  features: Record<string, any>;
}

export interface UserProfile {
  id: string;
  full_name?: string;
  display_name?: string;
  avatar_url?: string;
  phone?: string;
  email?: string;
  timezone: string;
  mfa_enabled: boolean;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  is_active: boolean;
  user_profiles?: UserProfile;
}

export type UserRole = 'owner' | 'admin' | 'manager' | 'agent' | 'billing_admin' | 'developer' | 'security_admin';

export interface PhoneNumber {
  id: string;
  organization_id: string;
  phone_number: string;
  formatted_number: string;
  friendly_name?: string;
  type: 'local' | 'toll_free' | 'mobile' | 'short_code';
  status: 'available' | 'purchased' | 'assigned' | 'porting' | 'released' | 'suspended';
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  country_code: string;
  region?: string;
  locality?: string;
  recording_enabled: boolean;
  transcription_enabled: boolean;
  voicemail_enabled: boolean;
  ai_receptionist_enabled: boolean;
  created_at: string;
}

export interface NumberAssignment {
  id: string;
  phone_number_id: string;
  user_id?: string;
  team_id?: string;
  assignment_type: string;
  is_primary: boolean;
  can_make_calls: boolean;
  can_receive_calls: boolean;
  can_send_sms: boolean;
  can_receive_sms: boolean;
}

export interface Contact {
  id: string;
  organization_id: string;
  phone_number: string;
  formatted_phone?: string;
  name?: string;
  email?: string;
  company?: string;
  avatar_url?: string;
  tags: string[];
  is_vip: boolean;
  is_blocked: boolean;
  opt_out: boolean;
  last_contacted_at?: string;
}

export interface Conversation {
  id: string;
  organization_id: string;
  contact_id: string;
  phone_number_id: string;
  assigned_to?: string;
  status: 'open' | 'pending' | 'resolved' | 'archived';
  last_message_at?: string;
  last_message_preview?: string;
  unread_count: number;
  priority: string;
  tags: string[];
  contacts?: Contact;
  phone_numbers?: PhoneNumber;
}

export interface Message {
  id: string;
  conversation_id: string;
  contact_id: string;
  phone_number_id: string;
  sender_id?: string;
  direction: 'inbound' | 'outbound';
  type: 'sms' | 'mms' | 'secure';
  body?: string;
  media_urls: string[];
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered' | 'read';
  is_ai_generated: boolean;
  is_auto_reply: boolean;
  sent_at?: string;
  delivered_at?: string;
  created_at: string;
}

export interface Call {
  id: string;
  organization_id: string;
  contact_id?: string;
  phone_number_id?: string;
  direction: 'inbound' | 'outbound';
  status: 'ringing' | 'in_progress' | 'completed' | 'busy' | 'no_answer' | 'canceled' | 'failed';
  from_number: string;
  to_number: string;
  caller_name?: string;
  duration_seconds: number;
  recording_id?: string;
  answered_by?: string;
  initiated_by?: string;
  ai_summary?: string;
  ai_sentiment?: string;
  ai_action_items?: any[];
  twilio_sid?: string;
  started_at: string;
  answered_at?: string;
  ended_at?: string;
  contacts?: Contact;
  phone_numbers?: PhoneNumber;
}

export interface VoicemailMessage {
  id: string;
  organization_id: string;
  call_id?: string;
  phone_number_id: string;
  contact_id?: string;
  assigned_to?: string;
  from_number: string;
  duration_seconds: number;
  audio_url?: string;
  transcription?: string;
  ai_summary?: string;
  ai_priority: string;
  status: 'new' | 'listened' | 'resolved';
  is_urgent: boolean;
  created_at: string;
  contacts?: Contact;
}

export interface Recording {
  id: string;
  organization_id: string;
  call_id: string;
  phone_number_id?: string;
  status: 'processing' | 'completed' | 'failed' | 'deleted';
  duration_seconds: number;
  file_url?: string;
  transcription?: string;
  ai_summary?: string;
  created_at: string;
}

export interface IvrFlow {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  is_default: boolean;
  flow_data: {
    nodes: IvrNode[];
    edges: any[];
  };
  created_at: string;
}

export interface IvrNode {
  id: string;
  type: string;
  label: string;
  config: Record<string, any>;
  position_x: number;
  position_y: number;
}

export interface AiAgent {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  personality: string;
  voice_id?: string;
  greeting?: string;
  fallback_message?: string;
  business_name?: string;
  tone: string;
  is_active: boolean;
}

export interface Subscription {
  id: string;
  organization_id: string;
  tier: 'starter' | 'professional' | 'business' | 'enterprise';
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'paused';
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
}

export interface BusinessHours {
  id: string;
  organization_id: string;
  name: string;
  is_active: boolean;
  schedule: {
    [key: string]: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
  timezone: string;
  after_hours_action: string;
}

export interface RingGroup {
  id: string;
  organization_id: string;
  name: string;
  ring_strategy: 'simultaneous' | 'sequential' | 'round_robin';
  ring_seconds: number;
  is_active: boolean;
  members: any[];
}

export interface Automation {
  id: string;
  organization_id: string;
  name: string;
  trigger: string;
  conditions: any[];
  actions: any[];
  is_active: boolean;
}

export interface Webhook {
  id: string;
  organization_id: string;
  url: string;
  events: string[];
  is_active: boolean;
}

export interface Integration {
  id: string;
  organization_id: string;
  type: 'crm' | 'scheduling' | 'marketing' | 'reputation' | 'custom';
  name: string;
  provider: string;
  is_active: boolean;
}

export interface Invoice {
  id: string;
  organization_id: string;
  stripe_invoice_id: string;
  status: string;
  amount_due_cents: number;
  amount_paid_cents: number;
  currency: string;
  invoice_pdf?: string;
  hosted_invoice_url?: string;
  created_at: string;
}

export interface A2PRegistration {
  id: string;
  organization_id: string;
  brand_name: string;
  brand_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  campaign_name?: string;
  campaign_status: 'pending' | 'active' | 'suspended' | 'expired';
  use_case?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  created_at: string;
  user_profiles?: UserProfile;
}
