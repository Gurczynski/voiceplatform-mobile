// AI Receptionist Webhook - Handles calls with AI
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createServiceClient } from '../_shared/utils.ts';

serve(async (req) => {
  try {
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const speechResult = formData.get('SpeechResult') as string;
    const confidence = formData.get('Confidence') as string;
    const digits = formData.get('Digits') as string;

    const supabase = createServiceClient();

    // Find the phone number and AI agent config
    const { data: phoneNumber } = await supabase
      .from('phone_numbers')
      .select('id, organization_id, ai_receptionist_enabled')
      .eq('phone_number', to)
      .single();

    if (!phoneNumber) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, an error occurred.</Say><Hangup/></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // Get AI agent config
    const { data: aiAgent } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('organization_id', phoneNumber.organization_id)
      .eq('is_active', true)
      .single();

    if (!aiAgent) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Thank you for calling. Please leave a message.</Say><Record maxLength="120"/><Hangup/></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // Get knowledge base for context
    const { data: knowledgeSources } = await supabase
      .from('ai_knowledge_sources')
      .select('title, content, type')
      .eq('organization_id', phoneNumber.organization_id)
      .eq('is_active', true);

    // Build AI context
    const businessName = aiAgent.business_name || 'our business';
    const personality = aiAgent.personality || 'professional';
    const greeting = aiAgent.greeting || `Hello, thank you for calling ${businessName}. How can I help you today?`;

    // If no speech yet (first call), greet and gather input
    if (!speechResult && !digits) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${greeting}</Say>
  <Gather input="speech dtmf" timeout="5" speechTimeout="auto" action="/functions/v1/ai-receptionist-webhook" method="POST">
    <Say voice="Polly.Joanna">Please tell me how I can help you, or press 0 to leave a message.</Say>
  </Gather>
  <Say voice="Polly.Joanna">I didn't hear anything. Let me transfer you to voicemail.</Say>
  <Record maxLength="120" transcribe="true"/>
  <Hangup/>
</Response>`;

      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // Process the caller's input with AI
    const callerInput = speechResult || '';

    // Track AI usage
    await supabase.from('ai_usage_events').insert({
      organization_id: phoneNumber.organization_id,
      event_type: 'token',
      quantity: callerInput.length,
      metadata: { call_sid: callSid, type: 'receptionist_input' },
    });

    // Simple keyword-based routing (in production, use OpenAI/Anthropic API)
    const input = callerInput.toLowerCase();
    let response = '';

    if (input.includes('appointment') || input.includes('schedule') || input.includes('book')) {
      response = `I'd be happy to help you schedule an appointment. Let me transfer you to our scheduling team.`;
    } else if (input.includes('price') || input.includes('cost') || input.includes('quote')) {
      response = `For pricing information, I can transfer you to our sales team or send you details via text. Would you like me to do that?`;
    } else if (input.includes('support') || input.includes('help') || input.includes('issue') || input.includes('problem')) {
      response = `I understand you need support. Let me connect you with our support team.`;
    } else if (input.includes('billing') || input.includes('invoice') || input.includes('payment')) {
      response = `For billing inquiries, I can transfer you to our billing department.`;
    } else if (input.includes('hours') || input.includes('open') || input.includes('location')) {
      response = `I can help with that. Let me look up our business hours and location for you.`;
    } else if (input.includes('human') || input.includes('person') || input.includes('agent') || input.includes('representative')) {
      response = `Of course, let me transfer you to a team member right away.`;
    } else if (input.includes('voicemail') || input.includes('message') || input.includes('leave')) {
      response = `I'll transfer you to our voicemail system where you can leave a detailed message.`;
    } else {
      response = `I understand you're asking about "${callerInput}". Let me connect you with someone who can help with that.`;
    }

    // Generate TwiML response
    const shouldTransfer = !input.includes('voicemail') && !input.includes('message');
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${response}</Say>
  ${
    shouldTransfer
      ? `<Dial timeout="20" action="/functions/v1/call-status-webhook">
           <Number>${Deno.env.get('DEFAULT_FORWARD_NUMBER') || '+15551234567'}</Number>
         </Dial>
         <Say voice="Polly.Joanna">Sorry, I couldn't reach anyone. Please leave a message.</Say>
         <Record maxLength="120" transcribe="true"/>`
      : `<Record maxLength="120" transcribe="true"/>`
  }
  <Say voice="Polly.Joanna">Thank you for calling ${businessName}. Goodbye.</Say>
  <Hangup/>
</Response>`;

    // Log the AI interaction
    await supabase.from('call_events').insert({
      call_id: null, // Will be linked when call record is found
      event_type: 'ai_receptionist_interaction',
      data: {
        caller_input: callerInput,
        ai_response: response,
        confidence: parseFloat(confidence || '0'),
      },
    });

    return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
  } catch (error) {
    console.error('AI receptionist error:', error);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, an error occurred. Please leave a message.</Say><Record maxLength="120"/><Hangup/></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }
});
