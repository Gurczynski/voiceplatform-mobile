// Inbound Call Webhook from Twilio - Routes calls based on IVR, business hours, AI
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createServiceClient } from '../_shared/utils.ts';

serve(async (req) => {
  try {
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callStatus = formData.get('CallStatus') as string;

    const supabase = createServiceClient();

    // Find the phone number config
    const { data: phoneNumber } = await supabase
      .from('phone_numbers')
      .select('*, ivr_flows(*), business_hours(*)')
      .eq('phone_number', to)
      .single();

    if (!phoneNumber) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, this number is not in service.</Say></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    const orgId = phoneNumber.organization_id;

    // Find or create contact
    let contactId: string;
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, is_blocked, is_vip')
      .eq('organization_id', orgId)
      .eq('phone_number', from)
      .single();

    if (existingContact) {
      contactId = existingContact.id;
      if (existingContact.is_blocked) {
        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response><Reject reason="blocked"/></Response>',
          { headers: { 'Content-Type': 'text/xml' } }
        );
      }
    } else {
      const { data: newContact } = await supabase
        .from('contacts')
        .insert({ organization_id: orgId, phone_number: from, formatted_phone: from })
        .select('id')
        .single();
      contactId = newContact?.id;
    }

    // Create call record
    await supabase.from('calls').insert({
      organization_id: orgId,
      contact_id: contactId,
      phone_number_id: phoneNumber.id,
      direction: 'inbound',
      status: 'ringing',
      from_number: from,
      to_number: to,
      twilio_sid: callSid,
    });

    // Check business hours
    const isWithinBusinessHours = checkBusinessHours(phoneNumber.business_hours);

    // Route based on configuration
    let twiml = '';

    if (phoneNumber.ai_receptionist_enabled) {
      // AI Receptionist - forward to AI webhook
      const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || '';
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Please wait while we connect you to our AI assistant.</Say>
  <Redirect>${baseUrl}/functions/v1/ai-receptionist-webhook</Redirect>
</Response>`;
    } else if (phoneNumber.ivr_flow_id && phoneNumber.ivr_flows) {
      // IVR Flow - generate TwiML from flow definition
      twiml = generateIvrTwiML(phoneNumber.ivr_flows, from, existingContact);
    } else if (!isWithinBusinessHours) {
      // After hours
      const bh = phoneNumber.business_hours;
      if (bh?.after_hours_action === 'forward' && bh.after_hours_forward_number) {
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for calling. We are currently closed. Transferring you now.</Say>
  <Dial>${bh.after_hours_forward_number}</Dial>
</Response>`;
      } else {
        // Default to voicemail
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for calling. We are currently unavailable. Please leave a message after the tone.</Say>
  <Record maxLength="120" action="/functions/v1/call-status-webhook" transcribe="true"/>
  <Say>Goodbye.</Say>
  <Hangup/>
</Response>`;
      }
    } else {
      // Ring assigned users
      const { data: assignments } = await supabase
        .from('number_assignments')
        .select('user_id, team_id')
        .eq('phone_number_id', phoneNumber.id)
        .eq('can_receive_calls', true);

      if (assignments?.length) {
        // Ring first assigned user (simplified - in production, use ring groups)
        const userId = assignments[0].user_id;
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="20" action="/functions/v1/call-status-webhook">
    <Client>${userId}</Client>
  </Dial>
  <Say>Sorry, no one is available to take your call. Please leave a message.</Say>
  <Record maxLength="120" action="/functions/v1/call-status-webhook" transcribe="true"/>
  <Hangup/>
</Response>`;
      } else if (phoneNumber.forwarding_number) {
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="20">${phoneNumber.forwarding_number}</Dial>
  <Say>Sorry, no one is available. Please leave a message.</Say>
  <Record maxLength="120" action="/functions/v1/call-status-webhook" transcribe="true"/>
  <Hangup/>
</Response>`;
      } else {
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for calling. Please leave a message after the tone.</Say>
  <Record maxLength="120" action="/functions/v1/call-status-webhook" transcribe="true"/>
  <Hangup/>
</Response>`;
      }
    }

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Error in inbound call webhook:', error);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, an error occurred. Please try again later.</Say><Hangup/></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }
});

function checkBusinessHours(bh: any): boolean {
  if (!bh || !bh.is_active) return true; // Default to open if no config

  const now = new Date();
  const timezone = bh.timezone || 'America/New_York';
  const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const dayOfWeek = localTime.toLocaleLowerCase().slice(0, 3) + localTime.toLocaleLowerCase().slice(3);
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[localTime.getDay()];

  const schedule = bh.schedule?.[dayName];
  if (!schedule || !schedule.enabled) return false;

  const currentTime = `${localTime.getHours().toString().padStart(2, '0')}:${localTime.getMinutes().toString().padStart(2, '0')}`;
  return currentTime >= schedule.start && currentTime <= schedule.end;
}

function generateIvrTwiML(flow: any, callerNumber: string, contact: any): string {
  if (!flow?.flow_data?.nodes?.length) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for calling. Please leave a message.</Say>
  <Record maxLength="120"/>
  <Hangup/>
</Response>`;
  }

  // Find the root node (incoming call)
  const nodes = flow.flow_data.nodes;
  const edges = flow.flow_data.edges;
  const rootNode = nodes.find((n: any) => n.type === 'incoming_call') || nodes[0];

  // Generate TwiML by traversing the flow
  let twiml = '<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n';
  twiml += processIvrNode(rootNode, nodes, edges, callerNumber, contact);
  twiml += '</Response>';

  return twiml;
}

function processIvrNode(node: any, nodes: any[], edges: any[], callerNumber: string, contact: any): string {
  if (!node) return '';

  let twiml = '';

  switch (node.type) {
    case 'play_greeting':
      if (node.config?.audioUrl) {
        twiml += `  <Play>${node.config.audioUrl}</Play>\n`;
      } else if (node.config?.text) {
        twiml += `  <Say>${node.config.text}</Say>\n`;
      }
      break;

    case 'gather_input':
      twiml += `  <Gather numDigits="${node.config?.maxDigits || 1}" timeout="${node.config?.timeout || 5}">\n`;
      if (node.config?.prompt) {
        twiml += `    <Say>${node.config.prompt}</Say>\n`;
      }
      twiml += `  </Gather>\n`;
      break;

    case 'route_to_user':
      twiml += `  <Dial timeout="20">\n`;
      twiml += `    <Client>${node.config?.userId || ''}</Client>\n`;
      twiml += `  </Dial>\n`;
      break;

    case 'forward_external':
      twiml += `  <Dial timeout="20">${node.config?.forwardNumber || ''}</Dial>\n`;
      break;

    case 'voicemail':
      twiml += `  <Say>${node.config?.greeting || 'Please leave a message after the tone.'}</Say>\n`;
      twiml += `  <Record maxLength="120" transcribe="true"/>\n`;
      break;

    case 'hangup':
      twiml += `  <Say>${node.config?.message || 'Goodbye.'}</Say>\n`;
      twiml += `  <Hangup/>\n`;
      break;
  }

  // Follow edges to next node
  const nextEdge = edges.find((e: any) => e.source === node.id);
  if (nextEdge) {
    const nextNode = nodes.find((n: any) => n.id === nextEdge.target);
    twiml += processIvrNode(nextNode, nodes, edges, callerNumber, contact);
  }

  return twiml;
}
