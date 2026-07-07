// Stripe Checkout - Create checkout session
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders, getAuthenticatedUser, verifyOrgMembership,
  createSupabaseClient, errorResponse, successResponse, handleOptions
} from '../_shared/utils.ts';

serve(async (req) => {
  const optionsResp = await handleOptions(req);
  if (optionsResp) return optionsResp;

  try {
    const authHeader = req.headers.get('Authorization')!;
    const user = await getAuthenticatedUser(authHeader);
    const { organizationId, priceId, tier } = await req.json();

    const supabase = createSupabaseClient(authHeader);
    const membership = await verifyOrgMembership(supabase, user.id, organizationId);

    if (!['owner', 'admin', 'billing_admin'].includes(membership.role)) {
      return errorResponse('Insufficient permissions', 403);
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) return errorResponse('Stripe not configured');

    // Get or create Stripe customer
    const { data: billingCustomer } = await supabase
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .single();

    let customerId = billingCustomer?.stripe_customer_id;

    if (!customerId) {
      // Create Stripe customer
      const customerResp = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
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
        return errorResponse(`Stripe error: ${err}`, 502);
      }

      const customer = await customerResp.json();
      customerId = customer.id;

      // Store customer
      await supabase.from('billing_customers').upsert({
        organization_id: organizationId,
        stripe_customer_id: customerId,
        email: user.email,
      });
    }

    // Create Checkout Session
    const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || '';
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:8081';

    const checkoutResp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: customerId,
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        mode: 'subscription',
        success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/billing/cancel`,
        'subscription_data[metadata][organization_id]': organizationId,
        'subscription_data[metadata][tier]': tier || 'starter',
      }),
    });

    if (!checkoutResp.ok) {
      const err = await checkoutResp.text();
      return errorResponse(`Stripe error: ${err}`, 502);
    }

    const session = await checkoutResp.json();

    return successResponse({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
});
