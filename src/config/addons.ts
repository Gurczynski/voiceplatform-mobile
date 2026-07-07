// Add-ons Configuration with Pricing
// All prices in cents

export const ADDONS = {
  // Phone Numbers
  extraLocalNumber: {
    id: 'addon_local_number',
    name: 'Extra Local Number',
    description: 'Additional local phone number',
    icon: '📱',
    price: 500,           // $5/month
    unit: 'per month',
    category: 'numbers',
    cost: 115,            // $1.15 Twilio cost
    margin: 77,
  },
  extraTollFreeNumber: {
    id: 'addon_toll_free',
    name: 'Extra Toll-Free Number',
    description: 'Toll-free 800 number',
    icon: '📞',
    price: 1000,          // $10/month
    unit: 'per month',
    category: 'numbers',
    cost: 215,            // $2.15 Twilio cost
    margin: 78,
  },

  // Users
  extraUser: {
    id: 'addon_user',
    name: 'Extra User Seat',
    description: 'Additional team member',
    icon: '👤',
    price: 1500,          // $15/month
    unit: 'per month',
    category: 'users',
    cost: 0,
    margin: 100,
  },

  // AI Voice
  aiVoice100: {
    id: 'addon_ai_voice_100',
    name: '100 AI Voice Minutes',
    description: 'AI receptionist call time',
    icon: '🤖',
    price: 2000,          // $20
    unit: 'per month',
    category: 'ai',
    cost: 400,            // ~$4 AI cost
    margin: 80,
  },
  aiVoice500: {
    id: 'addon_ai_voice_500',
    name: '500 AI Voice Minutes',
    description: 'AI receptionist call time (best value)',
    icon: '🤖',
    price: 8000,          // $80
    unit: 'per month',
    category: 'ai',
    cost: 2000,           // ~$20 AI cost
    margin: 75,
    popular: true,
  },
  aiVoice1000: {
    id: 'addon_ai_voice_1000',
    name: '1000 AI Voice Minutes',
    description: 'AI receptionist call time (enterprise)',
    icon: '🤖',
    price: 14000,         // $140
    unit: 'per month',
    category: 'ai',
    cost: 4000,           // ~$40 AI cost
    margin: 71,
  },

  // AI Messages
  aiMessages500: {
    id: 'addon_ai_msg_500',
    name: '500 AI Messages',
    description: 'AI SMS assistant responses',
    icon: '💬',
    price: 1000,          // $10
    unit: 'per month',
    category: 'ai',
    cost: 100,            // ~$1 AI cost
    margin: 90,
  },
  aiMessages2000: {
    id: 'addon_ai_msg_2000',
    name: '2000 AI Messages',
    description: 'AI SMS assistant responses (best value)',
    icon: '💬',
    price: 3000,          // $30
    unit: 'per month',
    category: 'ai',
    cost: 400,            // ~$4 AI cost
    margin: 87,
    popular: true,
  },
  aiMessages10000: {
    id: 'addon_ai_msg_10000',
    name: '10000 AI Messages',
    description: 'AI SMS assistant responses (enterprise)',
    icon: '💬',
    price: 12000,         // $120
    unit: 'per month',
    category: 'ai',
    cost: 2000,           // ~$20 AI cost
    margin: 83,
  },

  // Storage
  recordingStorage10: {
    id: 'addon_storage_10',
    name: '10GB Recording Storage',
    description: 'Call recording storage',
    icon: '💾',
    price: 500,           // $5/month
    unit: 'per month',
    category: 'storage',
    cost: 25,             // $0.025 storage cost
    margin: 95,
  },
  recordingStorage50: {
    id: 'addon_storage_50',
    name: '50GB Recording Storage',
    description: 'Call recording storage (best value)',
    icon: '💾',
    price: 2000,          // $20/month
    unit: 'per month',
    category: 'storage',
    cost: 125,            // $0.125 storage cost
    margin: 94,
    popular: true,
  },

  // Transcription
  transcriptionHours10: {
    id: 'addon_transcription_10',
    name: '10 Hours Transcription',
    description: 'Call transcription time',
    icon: '📝',
    price: 1500,          // $15
    unit: 'per month',
    category: 'features',
    cost: 360,            // $0.006/min * 600min
    margin: 76,
  },

  // Features
  advancedAnalytics: {
    id: 'addon_analytics',
    name: 'Advanced Analytics',
    description: 'Detailed reporting & insights',
    icon: '📊',
    price: 2500,          // $25/month
    unit: 'per month',
    category: 'features',
    cost: 0,
    margin: 100,
  },
  customBranding: {
    id: 'addon_branding',
    name: 'Custom Branding',
    description: 'White-label your phone system',
    icon: '🎨',
    price: 5000,          // $50/month
    unit: 'per month',
    category: 'features',
    cost: 0,
    margin: 100,
  },
  apiAccess: {
    id: 'addon_api',
    name: 'API Access',
    description: 'REST API & webhooks',
    icon: '🔗',
    price: 2500,          // $25/month
    unit: 'per month',
    category: 'features',
    cost: 0,
    margin: 100,
  },
  prioritySupport: {
    id: 'addon_support',
    name: 'Priority Support',
    description: '24/7 phone & chat support',
    icon: '🛟',
    price: 5000,          // $50/month
    unit: 'per month',
    category: 'features',
    cost: 0,
    margin: 100,
  },
};

export type AddonKey = keyof typeof ADDONS;

export function getAddonPrice(key: AddonKey): number {
  return ADDONS[key].price;
}

export function getAddonProfit(key: AddonKey): number {
  return ADDONS[key].price - ADDONS[key].cost;
}

export function getAddonsByCategory(category: string) {
  return Object.entries(ADDONS)
    .filter(([_, addon]) => addon.category === category)
    .map(([key, addon]) => ({ key, ...addon }));
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export function formatPriceDecimal(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
