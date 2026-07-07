// Stripe Webhook Handler
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createServiceClient } from '../_shared/utils.ts';

serve(async (req) => {
  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    if (!sig) return new Response('Missing signature', { status: 400 });

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) return new Response('Webhook not configured', { status: 500 });

    // In production, verify the signature using Stripe's library
    // For MVP, parse the event
    let event;
    try {
      event = JSON.parse(body);
    } catch (err) {
      return new Response('Invalid payload', { status: 400 });
    }

    const supabase = createServiceClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orgId = session.subscription_data?.metadata?.organization_id ||
                      session.metadata?.organization_id;

        if (orgId && session.subscription) {
          // Update billing customer
          await supabase
            .from('billing_customers')
            .update({
              stripe_customer_id: session.customer,
              default_payment_method: session.payment_method_types?.[0],
            })
            .eq('organization_id', orgId);

          // Fetch subscription details from Stripe
          const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
          const subResp = await fetch(`https://api.stripe.com/v1/subscriptions/${session.subscription}`, {
            headers: { 'Authorization': `Bearer ${stripeSecretKey}` },
          });

          if (subResp.ok) {
            const sub = await subResp.json();
            await supabase
              .from('subscriptions')
              .update({
                stripe_subscription_id: sub.id,
                stripe_price_id: sub.items?.data?.[0]?.price?.id,
                status: sub.status === 'active' ? 'active' : sub.status,
                current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
                current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                cancel_at_period_end: sub.cancel_at_period_end,
              })
              .eq('organization_id', orgId);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const orgId = sub.metadata?.organization_id;

        if (orgId) {
          const tier = sub.metadata?.tier || 'starter';
          await supabase
            .from('subscriptions')
            .update({
              status: sub.status,
              tier,
              stripe_price_id: sub.items?.data?.[0]?.price?.id,
              current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
              cancel_at_period_end: sub.cancel_at_period_end,
            })
            .eq('organization_id', orgId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const orgId = sub.metadata?.organization_id;

        if (orgId) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              cancel_at_period_end: false,
            })
            .eq('organization_id', orgId);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const orgId = invoice.subscription_data?.metadata?.organization_id;

        if (orgId) {
          await supabase.from('invoices').upsert({
            organization_id: orgId,
            stripe_invoice_id: invoice.id,
            status: invoice.status,
            amount_due_cents: invoice.amount_due,
            amount_paid_cents: invoice.amount_paid,
            currency: invoice.currency,
            invoice_pdf: invoice.invoice_pdf,
            hosted_invoice_url: invoice.hosted_invoice_url,
            period_start: new Date(invoice.period_start * 1000).toISOString(),
            period_end: new Date(invoice.period_end * 1000).toISOString(),
          });

          // Update subscription status
          await supabase
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('stripe_subscription_id', invoice.subscription);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', invoice.subscription);
        break;
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return new Response('Error', { status: 500 });
  }
});
