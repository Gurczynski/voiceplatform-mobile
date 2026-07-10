// AI Chat - For mobile app text-based AI conversations using Ollama Cloud
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders, getAuthenticatedUser, verifyOrgMembership,
  createSupabaseClient, errorResponse, successResponse, handleOptions
} from '../_shared/utils.ts';

const OLLAMA_API_KEY = Deno.env.get('OLLAMA_API_KEY');
const OLLAMA_API_URL = Deno.env.get('OLLAMA_API_URL') || 'https://api.ollama.com';

serve(async (req) => {
  const optionsResp = await handleOptions(req);
  if (optionsResp) return optionsResp;

  try {
    const authHeader = req.headers.get('Authorization')!;
    const user = await getAuthenticatedUser(authHeader);
    const { organizationId, message, history } = await req.json();

    if (!message) return errorResponse('Message required');

    const supabase = createSupabaseClient(authHeader);
    await verifyOrgMembership(supabase, user.id, organizationId);

    // Get AI agent config
    const { data: aiAgent } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    // Get knowledge base
    const { data: knowledgeSources } = await supabase
      .from('ai_knowledge_sources')
      .select('title, content, type')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    const knowledgeContext = (knowledgeSources || [])
      .map(k => `${k.title}: ${k.content}`)
      .join('\n');

    const agentName = aiAgent?.name || 'AI Assistant';
    const businessName = aiAgent?.business_name || 'the business';
    const tone = aiAgent?.tone || 'professional';

    // Build messages for AI
    const messages = [
      {
        role: 'system',
        content: `You are ${agentName}, an AI assistant for ${businessName}.

Personality: ${tone}
${aiAgent?.personality || ''}

Your job:
- Answer questions politely and professionally
- Help with scheduling, information, and basic support
- Collect caller information when needed
- Never make up information you don't know
- Keep responses concise (under 150 words)

${aiAgent?.fallback_message ? `If you cannot help, say: "${aiAgent.fallback_message}"` : ''}

Knowledge Base:
${knowledgeContext || 'No specific knowledge base configured.'}

IMPORTANT: Keep responses natural and conversational. No markdown formatting.`,
      },
      ...(history || []).map((h: any) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    if (!OLLAMA_API_KEY) {
      // Fallback response when no API key
      const response = generateFallbackResponse(message, aiAgent);
      return successResponse({ response });
    }

    // Call Ollama Cloud API
    const ollamaResp = await fetch(`${OLLAMA_API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OLLAMA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'minimax-m3',
        messages,
        stream: false,
      }),
    });

    if (!ollamaResp.ok) {
      const err = await ollamaResp.text();
      console.error('Ollama error:', err);
      const response = generateFallbackResponse(message, aiAgent);
      return successResponse({ response });
    }

    const ollamaData = await ollamaResp.json();
    const response = ollamaData.message?.content || generateFallbackResponse(message, aiAgent);

    // Track token usage
    await supabase.from('ai_usage_events').insert({
      organization_id: organizationId,
      user_id: user.id,
      event_type: 'token',
      quantity: ollamaData.eval_count || 0,
      metadata: { type: 'ai_chat', model: 'minimax-m3' },
    });

    return successResponse({ response });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
});

function generateFallbackResponse(message: string, aiAgent: any): string {
  const input = message.toLowerCase();
  const businessName = aiAgent?.business_name || 'our business';

  if (input.includes('hour') || input.includes('open') || input.includes('when')) {
    return `Our regular business hours are Monday through Friday, 9 AM to 5 PM. Is there something specific I can help you with?`;
  }
  if (input.includes('price') || input.includes('cost') || input.includes('how much')) {
    return `For pricing information, I'd be happy to connect you with our sales team. Would you like me to take your details for a callback?`;
  }
  if (input.includes('appointment') || input.includes('schedule') || input.includes('book')) {
    return `I'd be happy to help you schedule an appointment. What day and time works best for you?`;
  }
  if (input.includes('support') || input.includes('help') || input.includes('issue')) {
    return `I understand you need support. Can you tell me more about the issue so I can direct you to the right team?`;
  }
  if (input.includes('location') || input.includes('address') || input.includes('where')) {
    return `I can help with that. Let me get our location details for you.`;
  }
  if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
    return `Hello! Welcome to ${businessName}. How can I assist you today?`;
  }
  if (input.includes('thank')) {
    return `You're welcome! Is there anything else I can help you with?`;
  }

  return `Thank you for your message. I'm here to help with any questions about ${businessName}. Could you tell me more about what you need?`;
}
