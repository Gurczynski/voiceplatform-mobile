-- Scheduled Jobs Table
CREATE TABLE IF NOT EXISTS public.scheduled_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  
  -- Job type
  type TEXT NOT NULL CHECK (type IN ('sms', 'voice', 'email')),
  
  -- What to send
  template_name TEXT,
  message_body TEXT,
  voice_script TEXT,
  subject TEXT,
  
  -- Who to send to
  recipient_type TEXT DEFAULT 'contact' CHECK (recipient_type IN ('contact', 'phone', 'group', 'all_contacts')),
  contact_id UUID REFERENCES public.contacts(id),
  phone_number TEXT,
  contact_group TEXT,
  
  -- From which number
  from_number_id UUID REFERENCES public.phone_numbers(id),
  
  -- Scheduling
  schedule_type TEXT DEFAULT 'once' CHECK (schedule_type IN ('once', 'daily', 'weekly', 'monthly', 'custom')),
  scheduled_at TIMESTAMPTZ,
  cron_expression TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  
  -- Recurrence end
  recurrence_end TIMESTAMPTZ,
  max_occurrences INTEGER,
  occurrence_count INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'paused', 'canceled')),
  
  -- Execution tracking
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Results
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  
  -- Error tracking
  last_error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Scheduled Job Executions (log of each run)
CREATE TABLE IF NOT EXISTS public.scheduled_job_executions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_id UUID REFERENCES public.scheduled_jobs(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  
  -- Execution details
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  -- Results
  recipients_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  -- Error
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_scheduled_jobs_org ON public.scheduled_jobs(organization_id);
CREATE INDEX idx_scheduled_jobs_status ON public.scheduled_jobs(status);
CREATE INDEX idx_scheduled_jobs_next_run ON public.scheduled_jobs(next_run_at);
CREATE INDEX idx_scheduled_jobs_type ON public.scheduled_jobs(type);
CREATE INDEX idx_scheduled_job_executions_job ON public.scheduled_job_executions(job_id);

-- Enable RLS
ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_job_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view scheduled jobs" ON public.scheduled_jobs
  FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "Members can manage scheduled jobs" ON public.scheduled_jobs
  FOR ALL USING (public.is_org_member(organization_id));

CREATE POLICY "Members can view job executions" ON public.scheduled_job_executions
  FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "System can manage job executions" ON public.scheduled_job_executions
  FOR ALL USING (public.is_org_member(organization_id));

-- Updated_at trigger
CREATE TRIGGER set_scheduled_jobs_updated_at
  BEFORE UPDATE ON public.scheduled_jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
