-- Seed data for testing
-- Sign up with email: test@example.com, password: testpassword123

DO $$
DECLARE
  org_id UUID;
  main_phone_id UUID;
  sales_phone_id UUID;
  toll_phone_id UUID;
  contact1_id UUID;
  contact2_id UUID;
  contact3_id UUID;
  contact4_id UUID;
  contact5_id UUID;
  conv1_id UUID;
  conv2_id UUID;
  conv3_id UUID;
BEGIN
  -- Create org
  INSERT INTO public.organizations (name, slug, mode, industry, timezone)
  VALUES ('Test Business', 'test-business', 'managed', 'technology', 'America/New_York')
  RETURNING id INTO org_id;

  -- Insert phone numbers
  INSERT INTO public.phone_numbers (organization_id, phone_number, formatted_number, friendly_name, type, status, capabilities, country_code, region, locality)
  VALUES (org_id, '+15551234567', '+1 (555) 123-4567', 'Main Line', 'local', 'purchased', '{"voice": true, "sms": true, "mms": true}', 'US', 'NY', 'New York')
  RETURNING id INTO main_phone_id;

  INSERT INTO public.phone_numbers (organization_id, phone_number, formatted_number, friendly_name, type, status, capabilities, country_code, region, locality)
  VALUES (org_id, '+15559876543', '+1 (555) 987-6543', 'Sales Line', 'local', 'assigned', '{"voice": true, "sms": true, "mms": false}', 'US', 'NY', 'New York')
  RETURNING id INTO sales_phone_id;

  INSERT INTO public.phone_numbers (organization_id, phone_number, formatted_number, friendly_name, type, status, capabilities, country_code)
  VALUES (org_id, '+18005551234', '+1 (800) 555-1234', 'Toll Free', 'toll_free', 'purchased', '{"voice": true, "sms": true, "mms": true}', 'US')
  RETURNING id INTO toll_phone_id;

  -- Insert contacts
  INSERT INTO public.contacts (organization_id, phone_number, formatted_phone, name, email, company, tags, is_vip)
  VALUES (org_id, '+15551112222', '+1 (555) 111-2222', 'John Smith', 'john@example.com', 'Acme Corp', ARRAY['lead', 'enterprise'], true)
  RETURNING id INTO contact1_id;

  INSERT INTO public.contacts (organization_id, phone_number, formatted_phone, name, email, company, tags, is_vip)
  VALUES (org_id, '+15553334444', '+1 (555) 333-4444', 'Sarah Johnson', 'sarah@techco.com', 'TechCo', ARRAY['customer'], false)
  RETURNING id INTO contact2_id;

  INSERT INTO public.contacts (organization_id, phone_number, formatted_phone, name, email, company, tags, is_vip)
  VALUES (org_id, '+15555556666', '+1 (555) 555-6666', 'Mike Wilson', 'mike@startup.io', 'StartupIO', ARRAY['prospect'], false)
  RETURNING id INTO contact3_id;

  INSERT INTO public.contacts (organization_id, phone_number, formatted_phone, name, email, company, tags, is_vip)
  VALUES (org_id, '+15557778888', '+1 (555) 777-8888', 'Emily Davis', 'emily@retail.com', 'RetailCo', ARRAY['customer', 'vip'], true)
  RETURNING id INTO contact4_id;

  INSERT INTO public.contacts (organization_id, phone_number, formatted_phone, name, email, company, tags, is_vip)
  VALUES (org_id, '+15559990000', '+1 (555) 999-0000', 'David Brown', null, null, ARRAY['support'], false)
  RETURNING id INTO contact5_id;

  -- Insert conversations
  INSERT INTO public.conversations (organization_id, contact_id, phone_number_id, status, last_message_at, last_message_preview, unread_count, priority)
  VALUES (org_id, contact1_id, main_phone_id, 'open', now() - interval '5 minutes', 'Thanks for the quick response!', 2, 'high')
  RETURNING id INTO conv1_id;

  INSERT INTO public.conversations (organization_id, contact_id, phone_number_id, status, last_message_at, last_message_preview, unread_count)
  VALUES (org_id, contact2_id, main_phone_id, 'pending', now() - interval '1 hour', 'Can we schedule a demo?', 0)
  RETURNING id INTO conv2_id;

  INSERT INTO public.conversations (organization_id, contact_id, phone_number_id, status, last_message_at, last_message_preview)
  VALUES (org_id, contact3_id, main_phone_id, 'resolved', now() - interval '2 days', 'Issue resolved, thank you!')
  RETURNING id INTO conv3_id;

  -- Insert messages for conversation 1 (John Smith)
  INSERT INTO public.messages (conversation_id, contact_id, phone_number_id, direction, type, body, status, created_at)
  VALUES
    (conv1_id, contact1_id, main_phone_id, 'inbound', 'sms', 'Hi, I need help with my account.', 'delivered', now() - interval '30 minutes'),
    (conv1_id, contact1_id, main_phone_id, 'outbound', 'sms', 'Hello John! I''d be happy to help. What seems to be the issue?', 'delivered', now() - interval '25 minutes'),
    (conv1_id, contact1_id, main_phone_id, 'inbound', 'sms', 'I can''t access my dashboard. Getting a 403 error.', 'delivered', now() - interval '20 minutes'),
    (conv1_id, contact1_id, main_phone_id, 'outbound', 'sms', 'Let me check that for you. Can you confirm your email address?', 'delivered', now() - interval '15 minutes'),
    (conv1_id, contact1_id, main_phone_id, 'inbound', 'sms', 'It''s john@example.com', 'delivered', now() - interval '10 minutes'),
    (conv1_id, contact1_id, main_phone_id, 'outbound', 'sms', 'Found it! Your account was temporarily locked. I''ve reset it. Please try again.', 'delivered', now() - interval '7 minutes'),
    (conv1_id, contact1_id, main_phone_id, 'inbound', 'sms', 'Thanks for the quick response!', 'delivered', now() - interval '5 minutes');

  -- Insert messages for conversation 2 (Sarah Johnson)
  INSERT INTO public.messages (conversation_id, contact_id, phone_number_id, direction, type, body, status, created_at)
  VALUES
    (conv2_id, contact2_id, main_phone_id, 'inbound', 'sms', 'Hi, I saw your product demo at the conference.', 'delivered', now() - interval '2 hours'),
    (conv2_id, contact2_id, main_phone_id, 'outbound', 'sms', 'Great to hear from you, Sarah! What interested you most?', 'delivered', now() - interval '1 hour 50 minutes'),
    (conv2_id, contact2_id, main_phone_id, 'inbound', 'sms', 'Can we schedule a demo for our team?', 'delivered', now() - interval '1 hour');

  -- Insert calls
  INSERT INTO public.calls (organization_id, contact_id, phone_number_id, direction, status, from_number, to_number, caller_name, duration_seconds, started_at, answered_at, ended_at, ai_summary, ai_sentiment)
  VALUES
    (org_id, contact1_id, main_phone_id, 'inbound', 'completed', '+15551112222', '+15551234567', 'John Smith', 245, now() - interval '2 hours', now() - interval '2 hours' + interval '5 seconds', now() - interval '2 hours' + interval '4 minutes 5 seconds', 'Customer called about account access issue. Resolved by resetting account lock.', 'neutral'),
    (org_id, contact2_id, main_phone_id, 'outbound', 'completed', '+15551234567', '+15553334444', 'Sarah Johnson', 180, now() - interval '1 day', now() - interval '1 day' + interval '10 seconds', now() - interval '1 day' + interval '3 minutes', 'Follow-up call about product demo scheduling.', 'positive'),
    (org_id, null, main_phone_id, 'inbound', 'no_answer', '+15550001111', '+15551234567', null, 0, now() - interval '3 hours', null, now() - interval '3 hours' + interval '20 seconds', null, null),
    (org_id, contact3_id, main_phone_id, 'inbound', 'completed', '+15555556666', '+15551234567', 'Mike Wilson', 420, now() - interval '2 days', now() - interval '2 days' + interval '3 seconds', now() - interval '2 days' + interval '7 minutes', 'Customer reported billing issue. Escalated to billing team.', 'negative');

  -- Insert voicemails
  INSERT INTO public.voicemail_messages (organization_id, phone_number_id, contact_id, from_number, duration_seconds, transcription, ai_summary, ai_priority, status, is_urgent)
  VALUES
    (org_id, main_phone_id, contact1_id, '+15551112222', 45, 'Hi, this is John from Acme Corp. I need urgent help with our account. Please call me back ASAP.', 'Urgent account issue from John at Acme Corp. Needs immediate callback.', 'high', 'new', true),
    (org_id, main_phone_id, null, '+15550001111', 30, 'Hello, I''m calling about your services. Please call me back at your earliest convenience.', 'General inquiry about services. Standard priority.', 'normal', 'new', false),
    (org_id, main_phone_id, contact2_id, '+15553334444', 60, 'Hi, this is Sarah from TechCo. Just wanted to confirm our demo scheduled for Thursday at 2 PM. Thanks!', 'Demo confirmation from Sarah at TechCo for Thursday 2PM.', 'normal', 'listened', false);

  -- Insert business hours
  INSERT INTO public.business_hours (organization_id, name, is_active, schedule, timezone, after_hours_action)
  VALUES (org_id, 'Default', true, '{
    "monday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "tuesday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "wednesday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "thursday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "friday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "saturday": {"enabled": false, "start": "10:00", "end": "14:00"},
    "sunday": {"enabled": false, "start": "09:00", "end": "17:00"}
  }', 'America/New_York', 'voicemail');

  -- Insert subscription
  INSERT INTO public.subscriptions (organization_id, tier, status, current_period_start, current_period_end, cancel_at_period_end)
  VALUES (org_id, 'professional', 'active', now() - interval '15 days', now() + interval '15 days', false);

  -- Insert AI agent
  INSERT INTO public.ai_agents (organization_id, name, description, personality, greeting, fallback_message, business_name, tone, is_active)
  VALUES (org_id, 'Alex - AI Receptionist', 'Professional AI receptionist for Test Business', 'professional', 'Thank you for calling Test Business! I''m Alex, your AI assistant. How can I help you today?', 'I''m sorry, I couldn''t understand that. Let me transfer you to a human agent.', 'Test Business', 'professional', true);

  -- Insert IVR flows
  INSERT INTO public.ivr_flows (organization_id, name, status, version, is_default, flow_data)
  VALUES (org_id, 'Main Menu', 'draft', 1, false, '{"nodes": [
    {"id": "1", "type": "incoming_call", "label": "Incoming Call", "config": {}, "position_x": 50, "position_y": 50},
    {"id": "2", "type": "play_greeting", "label": "Welcome Message", "config": {"text": "Thank you for calling. Press 1 for sales, 2 for support."}, "position_x": 50, "position_y": 130},
    {"id": "3", "type": "gather_input", "label": "Get Input", "config": {"maxDigits": 1}, "position_x": 50, "position_y": 210},
    {"id": "4", "type": "route_user", "label": "Sales Team", "config": {}, "position_x": 50, "position_y": 290},
    {"id": "5", "type": "voicemail", "label": "Voicemail", "config": {}, "position_x": 50, "position_y": 370}
  ], "edges": []}');

  INSERT INTO public.ivr_flows (organization_id, name, status, version, is_default, flow_data)
  VALUES (org_id, 'After Hours', 'published', 1, false, '{"nodes": [
    {"id": "1", "type": "incoming_call", "label": "Incoming Call", "config": {}, "position_x": 50, "position_y": 50},
    {"id": "2", "type": "play_greeting", "label": "After Hours Message", "config": {"text": "We are currently closed. Please leave a message."}, "position_x": 50, "position_y": 130},
    {"id": "3", "type": "voicemail", "label": "Voicemail", "config": {}, "position_x": 50, "position_y": 210}
  ], "edges": []}');

  INSERT INTO public.ivr_flows (organization_id, name, status, version, is_default, flow_data)
  VALUES (org_id, 'AI Receptionist', 'draft', 1, false, '{"nodes": [
    {"id": "1", "type": "incoming_call", "label": "Incoming Call", "config": {}, "position_x": 50, "position_y": 50},
    {"id": "2", "type": "ai_receptionist", "label": "AI Agent", "config": {}, "position_x": 50, "position_y": 130}
  ], "edges": []}');

  -- Insert audit log
  INSERT INTO public.audit_logs (organization_id, action, resource_type, resource_id, details)
  VALUES
    (org_id, 'organization.created', 'organization', org_id, '{"name": "Test Business"}'),
    (org_id, 'number.purchased', 'phone_number', main_phone_id, '{"phone_number": "+15551234567"}');

END $$;
