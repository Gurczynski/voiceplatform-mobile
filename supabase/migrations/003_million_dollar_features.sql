-- Million Dollar Features Database Schema

-- ============================================================
-- 1. AI CALL TRANSCRIPTION & SUMMARY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.call_transcripts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  call_id UUID REFERENCES public.calls(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  transcript_text TEXT,
  segments JSONB DEFAULT '[]',
  summary TEXT,
  action_items JSONB DEFAULT '[]',
  sentiment_score REAL,
  sentiment_label TEXT,
  topics TEXT[],
  key_phrases TEXT[],
  speaker_time JSONB DEFAULT '{}',
  ai_model TEXT DEFAULT 'whisper-1',
  processing_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. SMS CAMPAIGNS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sms_campaigns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  media_urls TEXT[],
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'canceled')),
  recipient_type TEXT DEFAULT 'segment' CHECK (recipient_type IN ('segment', 'all', 'tag', 'import')),
  segment_filters JSONB DEFAULT '{}',
  tag_filter TEXT,
  from_number_id UUID REFERENCES public.phone_numbers(id),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  total_replies INTEGER DEFAULT 0,
  opt_out_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sms_campaign_recipients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id UUID REFERENCES public.sms_campaigns(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id),
  phone_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'opted_out')),
  message_sid TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

-- ============================================================
-- 3. APPOINTMENT BOOKING
-- ============================================================
CREATE TABLE IF NOT EXISTS public.appointment_services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 30,
  buffer_minutes INTEGER DEFAULT 15,
  price_cents INTEGER,
  is_active BOOLEAN DEFAULT true,
  max_per_day INTEGER,
  location_type TEXT DEFAULT 'phone' CHECK (location_type IN ('phone', 'video', 'in_person', 'any')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.appointment_services(id),
  contact_id UUID REFERENCES public.contacts(id),
  assigned_to UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'America/New_York',
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'canceled', 'no_show')),
  location_type TEXT DEFAULT 'phone',
  location_details TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  follow_up_sent BOOLEAN DEFAULT false,
  notes TEXT,
  cancellation_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.availability_slots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. REVIEW REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.review_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id),
  call_id UUID REFERENCES public.calls(id),
  type TEXT DEFAULT 'google' CHECK (type IN ('google', 'yelp', 'facebook', 'custom')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'clicked', 'reviewed', 'opted_out')),
  review_url TEXT,
  sentiment_at_request TEXT,
  sent_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  rating INTEGER,
  review_text TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.review_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  auto_send BOOLEAN DEFAULT false,
  send_after_hours INTEGER DEFAULT 1,
  min_sentiment TEXT DEFAULT 'positive',
  review_platform TEXT DEFAULT 'google',
  review_url TEXT,
  message_template TEXT DEFAULT 'Hi {{name}}, thank you for calling! We''d love a review: {{url}}',
  follow_up_enabled BOOLEAN DEFAULT false,
  follow_up_days INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. CRM INTEGRATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id),
  crm_type TEXT NOT NULL,
  crm_id TEXT NOT NULL,
  crm_data JSONB DEFAULT '{}',
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, crm_type, crm_id)
);

CREATE TABLE IF NOT EXISTS public.crm_sync_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  integration_id UUID REFERENCES public.integrations(id),
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  entity_type TEXT,
  entity_id TEXT,
  status TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. WHITE LABEL
-- ============================================================
CREATE TABLE IF NOT EXISTS public.white_label_configs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  brand_name TEXT NOT NULL,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#1E293B',
  accent_color TEXT DEFAULT '#F59E0B',
  custom_domain TEXT,
  custom_css TEXT,
  email_from_name TEXT,
  email_from_address TEXT,
  login_page_text TEXT,
  footer_text TEXT,
  support_email TEXT,
  support_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. CALL COACHING
-- ============================================================
CREATE TABLE IF NOT EXISTS public.call_coaching_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  call_id UUID REFERENCES public.calls(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  coach_id UUID REFERENCES auth.users(id),
  agent_id UUID REFERENCES auth.users(id),
  mode TEXT DEFAULT 'listen' CHECK (mode IN ('listen', 'whisper', 'barge')),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 8. QA SCORECARDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.qa_scorecard_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qa_scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  call_id UUID REFERENCES public.calls(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  scorecard_id UUID REFERENCES public.qa_scorecard_templates(id),
  scored_by UUID REFERENCES auth.users(id),
  agent_id UUID REFERENCES auth.users(id),
  total_score REAL,
  max_score REAL,
  criteria_scores JSONB DEFAULT '{}',
  notes TEXT,
  ai_scored BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 9. TEAM CHAT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_channels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'channel' CHECK (type IN ('channel', 'direct', 'group')),
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  channel_id UUID REFERENCES public.chat_channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  last_read_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  channel_id UUID REFERENCES public.chat_channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  body TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  media_urls TEXT[],
  reply_to UUID REFERENCES public.chat_messages(id),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 10. PAYMENT COLLECTION
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id),
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'viewed', 'paid', 'expired', 'canceled')),
  stripe_payment_intent_id TEXT,
  stripe_checkout_url TEXT,
  payment_link TEXT,
  sent_via TEXT CHECK (sent_via IN ('sms', 'email', 'both')),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 11. PREDICTIVE ANALYTICS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lead_scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) NOT NULL,
  score REAL DEFAULT 0,
  factors JSONB DEFAULT '{}',
  predicted_action TEXT,
  confidence REAL,
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, contact_id)
);

CREATE TABLE IF NOT EXISTS public.call_insights (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  call_id UUID REFERENCES public.calls(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  intent TEXT,
  outcome TEXT,
  competitor_mentions TEXT[],
  price_mentions JSONB DEFAULT '[]',
  objections TEXT[],
  commitments TEXT[],
  next_steps TEXT[],
  lead_quality TEXT,
  conversion_probability REAL,
  ai_model TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 12. AI CALL SIMULATOR
-- ============================================================
CREATE TABLE IF NOT EXISTS public.training_scenarios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  scenario_type TEXT DEFAULT 'general' CHECK (scenario_type IN ('general', 'angry_customer', 'new_lead', 'billing_dispute', 'support_issue', 'urgent_request', 'custom')),
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  ai_personality TEXT,
  ai_objective TEXT,
  success_criteria JSONB DEFAULT '{}',
  max_duration_minutes INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  scenario_id UUID REFERENCES public.training_scenarios(id),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  score REAL,
  max_score REAL,
  feedback TEXT,
  transcript TEXT,
  duration_seconds INTEGER,
  criteria_met JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_call_transcripts_call ON public.call_transcripts(call_id);
CREATE INDEX idx_sms_campaigns_org ON public.sms_campaigns(organization_id);
CREATE INDEX idx_sms_campaign_recipients_campaign ON public.sms_campaign_recipients(campaign_id);
CREATE INDEX idx_appointments_org ON public.appointments(organization_id);
CREATE INDEX idx_appointments_start ON public.appointments(start_time);
CREATE INDEX idx_appointments_contact ON public.appointments(contact_id);
CREATE INDEX idx_review_requests_org ON public.review_requests(organization_id);
CREATE INDEX idx_chat_channels_org ON public.chat_channels(organization_id);
CREATE INDEX idx_chat_messages_channel ON public.chat_messages(channel_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at);
CREATE INDEX idx_payment_requests_org ON public.payment_requests(organization_id);
CREATE INDEX idx_lead_scores_org ON public.lead_scores(organization_id);
CREATE INDEX idx_call_insights_call ON public.call_insights(call_id);
CREATE INDEX idx_training_sessions_user ON public.training_sessions(user_id);

-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE public.call_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_scorecard_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================
CREATE POLICY "org_access" ON public.call_transcripts FOR ALL USING (public.is_org_member(organization_id));
CREATE POLICY "org_access" ON public.sms_campaigns FOR ALL USING (public.is_org_member(organization_id));
CREATE POLICY "org_access" ON public.sms_campaign_recipients FOR ALL USING (campaign_id IN (SELECT id FROM public.sms_campaigns WHERE public.is_org_member(organization_id)));
CREATE POLICY "org_access" ON public.appointment_services FOR ALL USING (public.is_org_member(organization_id));
CREATE POLICY "org_access" ON public.appointments FOR ALL USING (public.is_org_member(organization_id));
CREATE POLICY "org_access" ON public.availability_slots FOR ALL USING (public.is_org_member(organization_id));
CREATE POLICY "org_access" ON public.review_requests FOR ALL USING (public.is_org_member(organization_id));
CREATE POLICY "org_access" ON public.review_settings FOR ALL USING (public.is_org_member(organization_id));
CREATE POLICY "org_access" ON public.crm_contacts FOR ALL USING (public.is_org_member(organization_id));
CREATE POLICY "org_access" ON public.crm_sync_logs FOR ALL USING (public.is_org_member(organization_id));
CREATE POLICY "org_access" ON public.white_label_configs FOR ALL USING (public.is_org_member(organization_id));
CREATE POLICY "org_access" ON public.call_coaching_sessions FOR ALL USING (public.is_org_member(organization_id));
CREATE POLICY "org_access" ON public.qa_scorecard_templates FOR ALL USING (public.is_org_member(organization_id));
CREATE POLICY "org_access" ON public.qa_scores FOR ALL USING (public.is_org_member(organization_id));
CREATE POLICY "org_access" ON public.chat_channels FOR ALL USING (public.is_org_member(organization_id));
CREATE POLICY "org_access" ON public.chat_members FOR ALL USING (channel_id IN (SELECT id FROM public.chat_channels WHERE public.is_org_member(organization_id)));
CREATE POLICY "org_access" ON public.chat_messages FOR ALL USING (channel_id IN (SELECT id FROM public.chat_channels WHERE public.is_org_member(organization_id)));
CREATE POLICY "org_access" ON public.payment_requests FOR ALL USING (public.is_org_member(organization_id));
CREATE POLICY "org_access" ON public.lead_scores FOR ALL USING (public.is_org_member(organization_id));
CREATE POLICY "org_access" ON public.call_insights FOR ALL USING (public.is_org_member(organization_id));
CREATE POLICY "org_access" ON public.training_scenarios FOR ALL USING (public.is_org_member(organization_id));
CREATE POLICY "org_access" ON public.training_sessions FOR ALL USING (public.is_org_member(organization_id));

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER set_sms_campaigns_updated_at BEFORE UPDATE ON public.sms_campaigns FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_review_settings_updated_at BEFORE UPDATE ON public.review_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_white_label_configs_updated_at BEFORE UPDATE ON public.white_label_configs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_qa_scorecard_templates_updated_at BEFORE UPDATE ON public.qa_scorecard_templates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_chat_channels_updated_at BEFORE UPDATE ON public.chat_channels FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_payment_requests_updated_at BEFORE UPDATE ON public.payment_requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
