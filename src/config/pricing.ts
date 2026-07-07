// Pricing Configuration with Cost Analysis
// All prices in cents for precision

export const PRICING = {
  // ============================================================
  // COST ANALYSIS (Your costs per unit)
  // ============================================================
  COSTS: {
    // Twilio Costs (your cost)
    TWILIO_VOICE_INBOUND_PER_MIN: 0.85,    // $0.0085/min
    TWILIO_VOICE_OUTBOUND_PER_MIN: 1.40,   // $0.014/min
    TWILIO_SMS_PER_SEGMENT: 0.79,          // $0.0079/segment
    TWILIO_MMS_PER_MESSAGE: 2.00,          // $0.02/message
    TWILIO_PHONE_NUMBER_PER_MONTH: 115,    // $1.15/month
    TWILIO_TOLL_FREE_PER_MONTH: 215,       // $2.15/month

    // AI Costs (your cost)
    OPENAI_GPT4O_INPUT_PER_1K: 0.25,       // $0.0025/1K tokens
    OPENAI_GPT4O_OUTPUT_PER_1K: 1.00,      // $0.01/1K tokens
    OPENAI_GPT4O_MINI_INPUT_PER_1K: 0.015, // $0.00015/1K tokens
    OPENAI_GPT4O_MINI_OUTPUT_PER_1K: 0.06, // $0.0006/1K tokens
    OPENAI_WHISPER_PER_MIN: 0.60,          // $0.006/min transcription
    OPENAI_TTS_PER_1K_CHARS: 1.50,         // $0.015/1K chars

    // Estimated per-interaction costs
    AI_VOICE_CALL_AVG_TOKENS: 500,          // avg tokens per AI turn
    AI_VOICE_CALL_TURNS_PER_MIN: 2,         // avg conversation turns per minute
    AI_SMS_AVG_TOKENS: 200,                 // avg tokens per AI SMS response

    // Infrastructure costs (monthly, per org)
    SUPABASE_BASE_COST: 0,                  // free tier covers MVP
    EDGE_FUNCTION_COST_PER_1M: 200,         // $2/1M invocations
    STORAGE_COST_PER_GB: 25,               // $0.025/GB/month
  },

  // ============================================================
  // SUBSCRIPTION TIERS (what you charge)
  // ============================================================
  TIERS: {
    starter: {
      name: 'Starter',
      monthlyPrice: 2900,                   // $29/month
      annualPrice: 29000,                   // $290/year (2 months free)
      maxUsers: 1,
      maxNumbers: 1,
      maxAIVoiceMinutes: 0,                 // No AI voice
      maxAIMessages: 0,                     // No AI SMS
      maxRecordingStorageGB: 1,
      features: [
        '1 phone number',
        '1 user',
        'Unlimited inbound/outbound calls',
        'SMS/MMS messaging',
        'Basic IVR',
        'Voicemail with transcription',
        'Call forwarding',
        'Business hours',
        'Basic analytics',
      ],
      profitMargin: 0.85,                   // 85% margin target
    },

    professional: {
      name: 'Professional',
      monthlyPrice: 7900,                   // $79/month
      annualPrice: 79000,                   // $790/year
      maxUsers: 5,
      maxNumbers: 5,
      maxAIVoiceMinutes: 100,               // 100 min/month AI voice
      maxAIMessages: 500,                   // 500 AI SMS/month
      maxRecordingStorageGB: 5,
      features: [
        '5 phone numbers',
        '5 users',
        'Everything in Starter',
        'Shared team inbox',
        'Call recording',
        'Ring groups',
        'Advanced IVR',
        'AI call summaries',
        'AI SMS assistant (500/mo)',
        'AI voice receptionist (100 min/mo)',
        'Team permissions',
        'Integrations',
      ],
      profitMargin: 0.80,                   // 80% margin target
    },

    business: {
      name: 'Business',
      monthlyPrice: 19900,                  // $199/month
      annualPrice: 199000,                  // $1990/year
      maxUsers: 25,
      maxNumbers: 20,
      maxAIVoiceMinutes: 500,               // 500 min/month AI voice
      maxAIMessages: 2000,                  // 2000 AI SMS/month
      maxRecordingStorageGB: 25,
      features: [
        '20 phone numbers',
        '25 users',
        'Everything in Professional',
        'AI receptionist (500 min/mo)',
        'AI routing & qualification',
        'AI SMS assistant (2000/mo)',
        'Workflow automation',
        'Call queues',
        'Departments',
        'Advanced reporting',
        'API access',
        'Webhooks',
        'Custom branding',
        'Priority support',
      ],
      profitMargin: 0.75,                   // 75% margin target
    },

    enterprise: {
      name: 'Enterprise',
      monthlyPrice: 49900,                  // $499/month
      annualPrice: 499000,                  // $4990/year
      maxUsers: -1,                         // Unlimited
      maxNumbers: -1,                       // Unlimited
      maxAIVoiceMinutes: 2000,              // 2000 min/month AI voice
      maxAIMessages: 10000,                 // 10000 AI SMS/month
      maxRecordingStorageGB: 100,
      features: [
        'Unlimited phone numbers',
        'Unlimited users',
        'Everything in Business',
        'AI receptionist (2000 min/mo)',
        'AI SMS assistant (10000/mo)',
        'Custom AI training',
        'SSO/SAML',
        'White label',
        'Dedicated support',
        'Custom integrations',
        'Compliance controls',
        'Advanced security',
        'SLA guarantee',
        'Dedicated account manager',
      ],
      profitMargin: 0.70,                   // 70% margin target
    },
  },

  // ============================================================
  // ADD-ONS (overage and extras)
  // ============================================================
  ADDONS: {
    extraPhoneLocal: {
      name: 'Extra Local Number',
      price: 500,                           // $5/month
      cost: 115,                            // $1.15 Twilio cost
    },
    extraPhoneTollFree: {
      name: 'Extra Toll-Free Number',
      price: 1000,                          // $10/month
      cost: 215,                            // $2.15 Twilio cost
    },
    extraUser: {
      name: 'Extra User',
      price: 1500,                          // $15/month
      cost: 0,                              // No direct cost
    },
    aiVoiceMinutes100: {
      name: '100 AI Voice Minutes',
      price: 2000,                          // $20
      cost: 400,                            // ~$4 AI cost
    },
    aiVoiceMinutes500: {
      name: '500 AI Voice Minutes',
      price: 8000,                          // $80
      cost: 2000,                           // ~$20 AI cost
    },
    aiMessages500: {
      name: '500 AI Messages',
      price: 1000,                          // $10
      cost: 100,                            // ~$1 AI cost
    },
    aiMessages2000: {
      name: '2000 AI Messages',
      price: 3000,                          // $30
      cost: 400,                            // ~$4 AI cost
    },
    recordingStorage10GB: {
      name: '10GB Recording Storage',
      price: 500,                           // $5/month
      cost: 25,                             // $0.025 storage cost
    },
    transcriptionHours: {
      name: '10 Hours Transcription',
      price: 1500,                          // $15
      cost: 360,                            // $0.006/min * 600min
    },
  },

  // ============================================================
  // PROFIT ANALYSIS
  // ============================================================
  getProfitAnalysis: (tier: string, usage: {
    voiceMinutes?: number;
    smsMessages?: number;
    aiVoiceMinutes?: number;
    aiMessages?: number;
    numbers?: number;
    users?: number;
  }) => {
    const tierConfig = PRICING.TIERS[tier as keyof typeof PRICING.TIERS];
    if (!tierConfig) return null;

    const costs = PRICING.COSTS;
    const revenue = tierConfig.monthlyPrice;

    // Calculate costs
    const voiceCost = ((usage.voiceMinutes || 0) * costs.TWILIO_VOICE_INBOUND_PER_MIN);
    const smsCost = ((usage.smsMessages || 0) * costs.TWILIO_SMS_PER_SEGMENT);
    const aiVoiceCost = ((usage.aiVoiceMinutes || 0) * costs.TWILIO_VOICE_INBOUND_PER_MIN) +
                        ((usage.aiVoiceMinutes || 0) * costs.AI_VOICE_CALL_TURNS_PER_MIN *
                         costs.AI_VOICE_CALL_AVG_TOKENS * costs.OPENAI_GPT4O_MINI_INPUT_PER_1K / 1000);
    const aiMessageCost = ((usage.aiMessages || 0) * costs.AI_SMS_AVG_TOKENS *
                           costs.OPENAI_GPT4O_MINI_INPUT_PER_1K / 1000);
    const numberCost = ((usage.numbers || 1) * costs.TWILIO_PHONE_NUMBER_PER_MONTH);

    const totalCost = voiceCost + smsCost + aiVoiceCost + aiMessageCost + numberCost;
    const profit = revenue - totalCost;
    const margin = profit / revenue;

    return {
      revenue,
      costs: {
        voice: Math.round(voiceCost),
        sms: Math.round(smsCost),
        aiVoice: Math.round(aiVoiceCost),
        aiMessages: Math.round(aiMessageCost),
        numbers: Math.round(numberCost),
        total: Math.round(totalCost),
      },
      profit: Math.round(profit),
      margin: Math.round(margin * 100),
      isProfit: profit > 0,
    };
  },
};

// ============================================================
// USAGE LIMITS ENFORCEMENT
// ============================================================

export async function checkUsageLimit(
  supabase: any,
  orgId: string,
  limitType: string
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  // Get subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('tier, status')
    .eq('organization_id', orgId)
    .single();

  if (!subscription || !['active', 'trialing'].includes(subscription.status)) {
    return { allowed: false, remaining: 0, limit: 0 };
  }

  const tierConfig = PRICING.TIERS[subscription.tier as keyof typeof PRICING.TIERS];
  if (!tierConfig) {
    return { allowed: false, remaining: 0, limit: 0 };
  }

  // Get current period usage
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let limit = 0;
  let usageType = '';

  switch (limitType) {
    case 'ai_voice_minutes':
      limit = tierConfig.maxAIVoiceMinutes;
      usageType = 'voice_minute';
      break;
    case 'ai_messages':
      limit = tierConfig.maxAIMessages;
      usageType = 'token';
      break;
    case 'phone_numbers':
      limit = tierConfig.maxNumbers;
      break;
    case 'users':
      limit = tierConfig.maxUsers;
      break;
    default:
      return { allowed: true, remaining: -1, limit: -1 };
  }

  // Unlimited
  if (limit === -1) {
    return { allowed: true, remaining: -1, limit: -1 };
  }

  // For numbers and users, count directly
  if (limitType === 'phone_numbers') {
    const { count } = await supabase
      .from('phone_numbers')
      .select('id', { count: 'exact' })
      .eq('organization_id', orgId)
      .in('status', ['purchased', 'assigned']);
    const remaining = limit - (count || 0);
    return { allowed: remaining > 0, remaining, limit };
  }

  if (limitType === 'users') {
    const { count } = await supabase
      .from('organization_members')
      .select('id', { count: 'exact' })
      .eq('organization_id', orgId)
      .eq('is_active', true);
    const remaining = limit - (count || 0);
    return { allowed: remaining > 0, remaining, limit };
  }

  // For AI usage, sum usage events
  const { data: usageEvents } = await supabase
    .from('ai_usage_events')
    .select('quantity')
    .eq('organization_id', orgId)
    .eq('event_type', usageType)
    .gte('created_at', periodStart.toISOString());

  const totalUsed = (usageEvents || []).reduce((sum: number, e: any) => sum + (e.quantity || 0), 0);
  const remaining = limit - totalUsed;

  return { allowed: remaining > 0, remaining: Math.max(0, remaining), limit };
}
