// Stripe Pricing Configuration for OhTry Mobile
// Live Stripe Keys

export const STRIPE_CONFIG = {
  publishableKey: 'pk_live_51NXcOBIVcy0ivhSuX6OeSrMQutt4HL7zBxEoQTp22HA3FSWCa1fZP1AwKtBeNR2RFBs7Gb0AA4CjGCPMKIxdeFdo004eeJel6T',
  
  // Price IDs - Create these in Stripe Dashboard
  prices: {
    starter: {
      monthly: 'price_starter_monthly',      // $29/mo
      annual: 'price_starter_annual',        // $290/year
    },
    professional: {
      monthly: 'price_professional_monthly',  // $79/mo
      annual: 'price_professional_annual',    // $790/year
    },
    business: {
      monthly: 'price_business_monthly',      // $199/mo
      annual: 'price_business_annual',        // $1990/year
    },
    enterprise: {
      monthly: 'price_enterprise_monthly',    // $499/mo
      annual: 'price_enterprise_annual',      // $4990/year
    },
  },

  // Add-on prices
  addons: {
    extraLocalNumber: 'price_addon_local_number',
    extraTollFree: 'price_addon_toll_free',
    extraUser: 'price_addon_user',
    aiVoice100: 'price_addon_ai_voice_100',
    aiVoice500: 'price_addon_ai_voice_500',
    aiMessages500: 'price_addon_ai_msg_500',
    aiMessages2000: 'price_addon_ai_msg_2000',
    storage10gb: 'price_addon_storage_10',
    storage50gb: 'price_addon_storage_50',
    advancedAnalytics: 'price_addon_analytics',
    customBranding: 'price_addon_branding',
    apiAccess: 'price_addon_api',
    prioritySupport: 'price_addon_support',
  },
};

export const PLANS = {
  starter: {
    name: 'Starter',
    description: 'Perfect for solo entrepreneurs',
    monthlyPrice: 29,
    annualPrice: 290,
    features: [
      '1 phone number',
      '1 user',
      'Unlimited calls & SMS',
      'Basic IVR',
      'Voicemail',
      'Business hours',
      'Basic analytics',
    ],
    limits: {
      users: 1,
      numbers: 1,
      aiVoiceMinutes: 0,
      aiMessages: 0,
      storageGB: 1,
    },
  },
  professional: {
    name: 'Professional',
    description: 'For small teams that need AI',
    monthlyPrice: 79,
    annualPrice: 790,
    popular: true,
    features: [
      '5 phone numbers',
      '5 users',
      'Everything in Starter',
      'AI Receptionist (100 min/mo)',
      'AI SMS Assistant (500/mo)',
      'Call recording',
      'Ring groups',
      'Advanced IVR',
      'Team permissions',
    ],
    limits: {
      users: 5,
      numbers: 5,
      aiVoiceMinutes: 100,
      aiMessages: 500,
      storageGB: 5,
    },
  },
  business: {
    name: 'Business',
    description: 'For growing companies',
    monthlyPrice: 199,
    annualPrice: 1990,
    features: [
      '20 phone numbers',
      '25 users',
      'Everything in Professional',
      'AI Receptionist (500 min/mo)',
      'AI SMS Assistant (2000/mo)',
      'Workflow automation',
      'API access',
      'Webhooks',
      'Custom branding',
      'Priority support',
    ],
    limits: {
      users: 25,
      numbers: 20,
      aiVoiceMinutes: 500,
      aiMessages: 2000,
      storageGB: 25,
    },
  },
  enterprise: {
    name: 'Enterprise',
    description: 'For large organizations',
    monthlyPrice: 499,
    annualPrice: 4990,
    features: [
      'Unlimited everything',
      'AI Receptionist (2000 min/mo)',
      'AI SMS Assistant (10000/mo)',
      'SSO/SAML',
      'White label',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
    ],
    limits: {
      users: -1,
      numbers: -1,
      aiVoiceMinutes: 2000,
      aiMessages: 10000,
      storageGB: 100,
    },
  },
};

export const TRIAL_CONFIG = {
  durationDays: 14,
  tier: 'professional',
  requirePaymentMethod: false,
};

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export function getAnnualSavingsPercent(monthly: number, annual: number): number {
  const monthlyTotal = monthly * 12;
  const savings = monthlyTotal - annual;
  return Math.round((savings / monthlyTotal) * 100);
}
