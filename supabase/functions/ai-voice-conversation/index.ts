// AI Voice Conversation - WebRTC Voice Agent using OpenAI Realtime API
// This enables real-time AI voice conversations over phone calls

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createServiceClient } from '../_shared/utils.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');

serve(async (req) => {
  try {
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const speechResult = formData.get('SpeechResult') as string;
    const confidence = formData.get('Confidence') as string;

    const supabase = createServiceClient();

    // Find phone number and AI agent config
    const { data: phoneNumber } = await supabase
      .from('phone_numbers')
      .select('id, organization_id')
      .eq('phone_number', to)
      .single();

    if (!phoneNumber) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, this number is not available.</Say><Hangup/></Response>',
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

    // Get knowledge base
    const { data: knowledgeSources } = await supabase
      .from('ai_knowledge_sources')
      .select('title, content, type')
      .eq('organization_id', phoneNumber.organization_id)
      .eq('is_active', true);

    // Build knowledge context
    const knowledgeContext = (knowledgeSources || [])
      .map(k => `${k.title}: ${k.content}`)
      .join('\n');

    // Track AI usage
    await supabase.from('ai_usage_events').insert({
      organization_id: phoneNumber.organization_id,
      event_type: 'voice_minute',
      quantity: 1,
      metadata: { call_sid: callSid, type: 'ai_voice' },
    });

    // If this is the first call (no speech yet), greet
    if (!speechResult) {
      const greeting = aiAgent.greeting || `Thank you for calling ${aiAgent.business_name || 'our business'}. I'm ${aiAgent.name}, your AI assistant. How can I help you today?`;

      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${greeting}</Say>
  <Gather input="speech" timeout="10" speechTimeout="auto" action="/functions/v1/ai-voice-conversation" method="POST">
    <Say voice="Polly.Joanna">I'm listening...</Say>
  </Gather>
  <Say voice="Polly.Joanna">I didn't hear anything. Let me try again.</Say>
  <Gather input="speech" timeout="10" speechTimeout="auto" action="/functions/v1/ai-voice-conversation" method="POST">
    <Say voice="Polly.Joanna">Please tell me how I can help.</Say>
  </Gather>
  <Say voice="Polly.Joanna">I'm sorry, I'm having trouble hearing you. Please call back or leave a message.</Say>
  <Record maxLength="120" transcribe="true"/>
  <Hangup/>
</Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // Process with AI
    const aiResponse = await generateAIResponse(
      speechResult,
      aiAgent,
      knowledgeContext,
      callSid,
      phoneNumber.organization_id
    );

    // Determine if we should transfer, end, or continue
    const shouldTransfer = aiResponse.toLowerCase().includes('transfer') ||
                           aiResponse.toLowerCase().includes('connect you');
    const shouldEnd = aiResponse.toLowerCase().includes('goodbye') ||
                      aiResponse.toLowerCase().includes('thank you for calling');

    let twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(aiResponse)}</Say>`;

    if (shouldTransfer) {
      // Transfer to human
      const { data: assignments } = await supabase
        .from('number_assignments')
        .select('user_id')
        .eq('phone_number_id', phoneNumber.id)
        .eq('can_receive_calls', true)
        .limit(1);

      if (assignments?.length) {
        twiml += `
  <Dial timeout="20" action="/functions/v1/call-status-webhook">
    <Client>${assignments[0].user_id}</Client>
  </Dial>`;
      }
    }

    if (!shouldEnd) {
      twiml += `
  <Gather input="speech" timeout="10" speechTimeout="auto" action="/functions/v1/ai-voice-conversation" method="POST">
    <Say voice="Polly.Joanna">Is there anything else I can help with?</Say>
  </Gather>`;
    }

    twiml += `
  <Say voice="Polly.Joanna">Thank you for calling ${aiAgent.business_name || 'us'}. Goodbye!</Say>
  <Hangup/>
</Response>`;

    return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });

  } catch (error) {
    console.error('AI Voice error:', error);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, an error occurred. Please call back later.</Say><Hangup/></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }
});

async function generateAIResponse(
  userSpeech: string,
  aiAgent: any,
  knowledgeContext: string,
  callSid: string,
  orgId: string
): Promise<string> {
  if (!OPENAI_API_KEY) {
    return generateFallbackResponse(userSpeech, aiAgent);
  }

  try {
    const systemPrompt = `You are ${aiAgent.name}, an AI receptionist for ${aiAgent.business_name || 'the business'}.

Personality: ${aiAgent.personality || 'professional'}
Tone: ${aiAgent.tone || 'professional'}

Your job:
- Answer caller questions politely and professionally
- Help with scheduling, information, and basic support
- Collect caller information when needed (name, reason, callback number)
- Transfer to a human when you cannot help
- Never make up information you don't know
- Keep responses concise (under 100 words for voice)

${aiAgent.fallback_message ? `If you cannot help, say: "${aiAgent.fallback_message}"` : ''}

Knowledge Base:
${knowledgeContext || 'No specific knowledge base configured.'}

IMPORTANT: Keep responses natural and conversational for voice. No markdown, no bullet points.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userSpeech },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI error:', await response.text());
      return generateFallbackResponse(userSpeech, aiAgent);
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || '';

    // Track token usage
    await createServiceClient().from('ai_usage_events').insert({
      organization_id: orgId,
      event_type: 'token',
      quantity: data.usage?.total_tokens || 0,
      metadata: { call_sid: callSid, model: 'gpt-4o-mini' },
    });

    return aiText || generateFallbackResponse(userSpeech, aiAgent);

  } catch (error) {
    console.error('AI generation error:', error);
    return generateFallbackResponse(userSpeech, aiAgent);
  }
}

function generateFallbackResponse(userSpeech: string, aiAgent: any): string {
  const input = userSpeech.toLowerCase();
  const businessName = aiAgent.business_name || 'our business';

  if (input.includes('appointment') || input.includes('schedule') || input.includes('book')) {
    return `I'd be happy to help you schedule an appointment. Let me check our availability and transfer you to our scheduling team.`;
  }
  if (input.includes('price') || input.includes('cost') || input.includes('quote') || input.includes('how much')) {
    return `For pricing information, I can connect you with our sales team. Would you like me to transfer you, or I can take your details and have someone call you back?`;
  }
  if (input.includes('support') || input.includes('help') || input.includes('issue') || input.includes('problem')) {
    return `I understand you need support. Let me gather some information and connect you with the right team member.`;
  }
  if (input.includes('hours') || input.includes('open') || input.includes('when')) {
    return `Our regular business hours are Monday through Friday, 9 AM to 5 PM. Is there something specific I can help you with?`;
  }
  if (input.includes('location') || input.includes('address') || input.includes('where')) {
    return `I can provide our location details. Let me transfer you to our front desk who can give you directions.`;
  }
  if (input.includes('human') || input.includes('person') || input.includes('agent') || input.includes('representative')) {
    return `Of course, let me transfer you to a team member right away. Please hold for just a moment.`;
  }
  if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
    return `Hello! Thank you for calling ${businessName}. How can I assist you today?`;
  }
  if (input.includes('thank')) {
    return `You're welcome! Is there anything else I can help you with today?`;
  }
  if (input.includes('bye') || input.includes('goodbye')) {
    return `Thank you for calling ${businessName}. Have a great day! Goodbye.`;
  }

  return `I understand you're asking about "${userSpeech}". Let me connect you with someone who can help with that. One moment please.`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
