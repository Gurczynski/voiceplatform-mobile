// Process Scheduled Jobs - Runs via cron or manual trigger
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createServiceClient } from '../_shared/utils.ts';

serve(async (req) => {
  try {
    const supabase = createServiceClient();
    const now = new Date().toISOString();

    // Get all pending jobs that should run now
    const { data: jobs, error } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .in('status', ['pending', 'running'])
      .or(`schedule_type.eq.once,and(schedule_type.neq.once,next_run_at.lte.${now})`)
      .limit(50);

    if (error) {
      console.error('Error fetching jobs:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ message: 'No jobs to process', processed: 0 }), { status: 200 });
    }

    const results = [];

    for (const job of jobs) {
      try {
        // Create execution record
        const { data: execution } = await supabase
          .from('scheduled_job_executions')
          .insert({
            job_id: job.id,
            organization_id: job.organization_id,
            status: 'running',
          })
          .select()
          .single();

        // Update job status
        await supabase
          .from('scheduled_jobs')
          .update({ status: 'running', last_run_at: now })
          .eq('id', job.id);

        let sentCount = 0;
        let failedCount = 0;
        let recipientsCount = 0;

        // Get recipients
        const recipients = await getRecipients(supabase, job);
        recipientsCount = recipients.length;

        // Send to each recipient
        for (const recipient of recipients) {
          try {
            if (job.type === 'sms') {
              await sendSMS(supabase, job, recipient);
            } else if (job.type === 'voice') {
              await makeVoiceCall(supabase, job, recipient);
            }
            sentCount++;
          } catch (e) {
            console.error(`Failed to send to ${recipient.phone}:`, e);
            failedCount++;
          }
        }

        // Update execution record
        await supabase
          .from('scheduled_job_executions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            recipients_count: recipientsCount,
            sent_count: sentCount,
            failed_count: failedCount,
          })
          .eq('id', execution?.id);

        // Update job
        const updates: any = {
          total_sent: (job.total_sent || 0) + sentCount,
          total_failed: (job.total_failed || 0) + failedCount,
          occurrence_count: (job.occurrence_count || 0) + 1,
        };

        // Calculate next run time for recurring jobs
        if (job.schedule_type !== 'once') {
          const nextRun = calculateNextRun(job);
          if (nextRun && (!job.max_occurrences || updates.occurrence_count < job.max_occurrences)) {
            updates.next_run_at = nextRun;
            updates.status = 'pending';
          } else {
            updates.status = 'completed';
            updates.completed_at = now;
          }
        } else {
          updates.status = 'completed';
          updates.completed_at = now;
        }

        await supabase
          .from('scheduled_jobs')
          .update(updates)
          .eq('id', job.id);

        results.push({ jobId: job.id, status: 'completed', sent: sentCount, failed: failedCount });
      } catch (e: any) {
        console.error(`Error processing job ${job.id}:`, e);

        // Update job with error
        await supabase
          .from('scheduled_jobs')
          .update({
            status: job.retry_count >= job.max_retries ? 'failed' : 'pending',
            last_error: e.message,
            retry_count: (job.retry_count || 0) + 1,
          })
          .eq('id', job.id);

        results.push({ jobId: job.id, status: 'failed', error: e.message });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), { status: 200 });
  } catch (error) {
    console.error('Process scheduled jobs error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

async function getRecipients(supabase: any, job: any): Promise<{ phone: string; name?: string; contactId?: string }[]> {
  if (job.recipient_type === 'phone' && job.phone_number) {
    return [{ phone: job.phone_number }];
  }

  if (job.recipient_type === 'contact' && job.contact_id) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, phone_number, name')
      .eq('id', job.contact_id)
      .single();
    if (contact) {
      return [{ phone: contact.phone_number, name: contact.name, contactId: contact.id }];
    }
  }

  if (job.recipient_type === 'group' && job.contact_group) {
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, phone_number, name')
      .eq('organization_id', job.organization_id)
      .contains('tags', [job.contact_group])
      .eq('opt_out', false);
    return (contacts || []).map((c: any) => ({ phone: c.phone_number, name: c.name, contactId: c.id }));
  }

  if (job.recipient_type === 'all_contacts') {
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, phone_number, name')
      .eq('organization_id', job.organization_id)
      .eq('opt_out', false);
    return (contacts || []).map((c: any) => ({ phone: c.phone_number, name: c.name, contactId: c.id }));
  }

  return [];
}

async function sendSMS(supabase: any, job: any, recipient: { phone: string; name?: string }) {
  // Get from number
  const { data: fromNumber } = await supabase
    .from('phone_numbers')
    .select('phone_number')
    .eq('id', job.from_number_id)
    .single();

  if (!fromNumber) throw new Error('From number not found');

  // Get Twilio credentials
  const { data: org } = await supabase
    .from('organizations')
    .select('twilio_subaccount_sid, twilio_subaccount_auth_token_encrypted, mode')
    .eq('id', job.organization_id)
    .single();

  let accountSid: string;
  let authToken: string;

  if (org?.mode === 'managed' && org.twilio_subaccount_sid) {
    accountSid = org.twilio_subaccount_sid;
    authToken = atob(org.twilio_subaccount_auth_token_encrypted);
  } else {
    const { data: twilioAccount } = await supabase
      .from('twilio_accounts')
      .select('account_sid, auth_token_encrypted')
      .eq('organization_id', job.organization_id)
      .eq('is_active', true)
      .single();
    if (!twilioAccount) throw new Error('No Twilio account');
    accountSid = twilioAccount.account_sid;
    authToken = atob(twilioAccount.auth_token_encrypted);
  }

  // Replace placeholders in message
  let message = job.message_body || '';
  message = message.replace(/\{\{name\}\}/g, recipient.name || 'Customer');
  message = message.replace(/\{\{phone\}\}/g, recipient.phone);

  // Send via Twilio
  const twilioResp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: fromNumber.phone_number,
        To: recipient.phone,
        Body: message,
      }),
    }
  );

  if (!twilioResp.ok) {
    const err = await twilioResp.text();
    throw new Error(`Twilio error: ${err}`);
  }

  // Track usage
  await supabase.from('usage_events').insert({
    organization_id: job.organization_id,
    event_type: 'sms_sent',
    quantity: 1,
    metadata: { scheduled_job_id: job.id, recipient: recipient.phone },
  });
}

async function makeVoiceCall(supabase: any, job: any, recipient: { phone: string; name?: string }) {
  const { data: fromNumber } = await supabase
    .from('phone_numbers')
    .select('phone_number')
    .eq('id', job.from_number_id)
    .single();

  if (!fromNumber) throw new Error('From number not found');

  const { data: org } = await supabase
    .from('organizations')
    .select('twilio_subaccount_sid, twilio_subaccount_auth_token_encrypted, mode')
    .eq('id', job.organization_id)
    .single();

  let accountSid: string;
  let authToken: string;

  if (org?.mode === 'managed' && org.twilio_subaccount_sid) {
    accountSid = org.twilio_subaccount_sid;
    authToken = atob(org.twilio_subaccount_auth_token_encrypted);
  } else {
    const { data: twilioAccount } = await supabase
      .from('twilio_accounts')
      .select('account_sid, auth_token_encrypted')
      .eq('organization_id', job.organization_id)
      .eq('is_active', true)
      .single();
    if (!twilioAccount) throw new Error('No Twilio account');
    accountSid = twilioAccount.account_sid;
    authToken = atob(twilioAccount.auth_token_encrypted);
  }

  // Replace placeholders in voice script
  let script = job.voice_script || job.message_body || '';
  script = script.replace(/\{\{name\}\}/g, recipient.name || 'Customer');

  const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || '';

  const twilioResp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: fromNumber.phone_number,
        To: recipient.phone,
        Url: `${baseUrl}/functions/v1/scheduled-voice-twiml`,
        StatusCallback: `${baseUrl}/functions/v1/call-status-webhook`,
        StatusCallbackMethod: 'POST',
      }),
    }
  );

  if (!twilioResp.ok) {
    const err = await twilioResp.text();
    throw new Error(`Twilio error: ${err}`);
  }

  await supabase.from('usage_events').insert({
    organization_id: job.organization_id,
    event_type: 'voice_outbound_minute',
    quantity: 1,
    metadata: { scheduled_job_id: job.id, recipient: recipient.phone },
  });
}

function calculateNextRun(job: any): string | null {
  const now = new Date();
  const tz = job.timezone || 'America/New_York';

  switch (job.schedule_type) {
    case 'daily': {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      return next.toISOString();
    }
    case 'weekly': {
      const next = new Date(now);
      next.setDate(next.getDate() + 7);
      return next.toISOString();
    }
    case 'monthly': {
      const next = new Date(now);
      next.setMonth(next.getMonth() + 1);
      return next.toISOString();
    }
    default:
      return null;
  }
}
