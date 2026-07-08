// Stripe Checkout - Create checkout session for subscription
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders, getAuthenticatedUser, verifyOrgMembership,
  createSupabaseClient, createServiceClient, logAuditEvent,
  errorResponse, successResponse, handleOptions
} from '../_shared/utils.ts';

// Price mapping - replace with actual Stripe Price IDs
const PRICE_MAP: Record<string, Record<string, string>> = {
  starter: {
    monthly: Deno.env.get('STRIPE_STARTER_MONTHLY') || 'price_starter_monthly',
    annual: Deno.env.get('STRIPE_STARTER_ANNUAL') || 'price_starter_annual',
  },
  professional: {
    monthly: Deno.env.get('STRIPE_PROFESSIONAL_MONTHLY') || 'price_professional_monthly',
    annual: Deno.env.get('STRIPE_PROFESSIONAL_ANNUAL') || 'price_professional_annual',
  },
  business: {
    monthly: Deno.env.get('STRIPE_BUSINESS_MONTHLY') || 'price_business_monthly',
    annual: Deno.env.get('STRIPE_BUSINESS_ANNUAL') || 'price_business_annual',
  },
  enterprise: {
    monthly: Deno.env.get('STRIPE_ENTERPRISE_MONTHLY') || 'price_enterprise_monthly',
    annual: Deno.env.get('STRIPE_ENTERPRISE_ANNUAL') || 'price_enterprise_annual',
  },
};

serve(async (req) => {
  const optionsResp = await handleOptions(req);
  if (optionsResp) return optionsResp;

  try {
    const authHeader = req.headers.get('Authorization')!;
    const user = await getAuthenticatedUser(authHeader);
    const { organizationId, tier, billingCycle, addonId } = await req.json();

    const supabase = createSupabaseClient(authHeader);
    const membership = await verifyOrgMembership(supabase, user.id, organizationId);

    if (!['owner', 'admin', 'billing_admin'].includes(membership.role)) {
      return errorResponse('Insufficient permissions', 403);
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return errorResponse('Stripe not configured. Add STRIPE_SECRET_KEY to Edge Function secrets.');

    // Get or create Stripe customer
    const { data: billing } = await supabase
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .single();

    let customerId = billing?.stripe_customer_id;

    if (!customerId) {
      // Create Stripe customer
      const customerResp = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: user.email || '',
          name: `Organization ${organizationId}`,
          'metadata[supabase_user_id]': user.id,
          'metadata[organization_id]': organizationId,
        }),
      });

      if (!customerResp.ok) {
        const err = await customerResp.text();
        return errorResponse(`Failed to create customer: ${err}`, 502);
      }

      const customer = await customerResp.json();
      customerId = customer.id;

      // Store customer
      await createServiceClient().from('billing_customers').upsert({
        organization_id: organizationId,
        stripe_customer_id: customerId,
        email: user.email,
      });
    }

    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:8081';

    // Build checkout session params
    const params: Record<string, string> = {
      customer: customerId,
      'mode': 'subscription',
      'success_url': `${appUrl}/settings/billing?success=true`,
      'cancel_url': `${appUrl}/settings/billing?canceled=true`,
      'subscription_data[metadata][organization_id]': organizationId,
      'subscription_data[metadata][tier]': tier || 'starter',
    };

    // Add line item
    if (addonId) {
      // Add-on purchase
      params['line_items[0][price]'] = addonId;
      params['line_items[0][quantity]'] = '1';
    } else {
      // Subscription
      const cycle = billingCycle || 'monthly';
      const priceId = PRICE_MAP[tier]?.[cycle];
      
      if (!priceId || priceId.startsWith('price_')) {
        // Use test price if not configured
        params['line_items[0][price_data[product_data[name]]]'] = `VoicePlatform ${tier} (${cycle})`;
        params['line_items[0][price_data[unit_amount]]'] = String(
          tier === 'starter' ? (cycle === 'monthly' ? 2900 : 29000) :
          tier === 'professional' ? (cycle === 'monthly' ? 7900 : 79000) :
          tier === 'business' ? (cycle === 'monthly' ? 19900 : 199000) :
          (cycle === 'monthly' ? 49900 : 499000)
        );
        params['line_items[0][price_data[currency]]'] = 'usd';
        params['line_items[0][price_data[recurring[interval]]]'] = cycle === 'monthly' ? 'month' : 'year';
      } else {
        params['line_items[0][price]'] = priceId;
      }
      params['line_items[0][quantity]'] = '1';
    }

    // Create Checkout Session
    const checkoutResp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params),
    });

    if (!checkoutResp.ok) {
      const err = await checkoutResp.text();
      return errorResponse(`Stripe error: ${err}`, 502);
    }

    const session = await checkoutResp.json();

    // Log audit event
    await logAuditEvent(supabase, organizationId, user.id, 'billing.checkout_created', 'subscription', undefined, {
      tier,
      billingCycle,
      sessionId: session.id,
    });

    return successResponse({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
});
