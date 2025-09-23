import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });
};

const getSupabase = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    throw new Error('Supabase configuration is missing');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
  );
};

const getEndpointSecret = () => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }
  return process.env.STRIPE_WEBHOOK_SECRET;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      const stripe = getStripe();
      const endpointSecret = getEndpointSecret();
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    const supabase = getSupabase();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription') {
          const projectId = session.metadata?.projectId;
          const source = session.metadata?.source;
          
          if (projectId) {
            // Project-specific checkout
            const updateData = {
              plan: 'pro',
              stripe_customer_id: session.customer as string,
              subscription_id: session.subscription as string,
              subscription_status: 'active',
              upgraded_at: new Date().toISOString(),
            };

            // Update project to Pro plan
            const { error } = await supabase
              .from('projects')
              .update(updateData)
              .eq('id', projectId);

            if (error) {
              console.error('Failed to upgrade project:', error);
              throw error;
            }

            // Log the upgrade event
            await supabase
              .from('billing_events')
              .insert({
                project_id: projectId,
                event_type: 'subscription_created',
                stripe_session_id: session.id,
                stripe_customer_id: session.customer as string,
                amount: session.amount_total,
                currency: session.currency,
                metadata: {
                  subscription_id: session.subscription,
                  payment_status: session.payment_status,
                },
              });

            console.log(`Project ${projectId} upgraded to Pro via Stripe`);
          } else if (source === 'homepage') {
            // Homepage checkout - find or create user's primary project
            const customerId = session.customer as string;
            
            // Get customer email from Stripe
            const customer = await stripe.customers.retrieve(customerId);
            const customerEmail = (customer as Stripe.Customer).email;
            
            if (!customerEmail) {
              console.error('No email found for customer:', customerId);
              break;
            }
            
            // Find user by email
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id')
              .eq('email', customerEmail)
              .single();
            
            if (userError || !userData) {
              console.error('User not found for email:', customerEmail);
              break;
            }
            
            // Find user's primary project
            const { data: projectData, error: projectError } = await supabase
              .from('projects')
              .select('id')
              .eq('owner_id', userData.id)
              .order('created_at', { ascending: true })
              .limit(1)
              .single();
            
            if (projectError || !projectData) {
              console.error('No project found for user:', userData.id);
              break;
            }
            
            const updateData = {
              plan: 'pro',
              stripe_customer_id: session.customer as string,
              subscription_id: session.subscription as string,
              subscription_status: 'active',
              upgraded_at: new Date().toISOString(),
            };

            // Update project to Pro plan
            const { error: updateError } = await supabase
              .from('projects')
              .update(updateData)
              .eq('id', projectData.id);

            if (updateError) {
              console.error('Failed to upgrade project:', updateError);
              throw updateError;
            }

            // Log the upgrade event
            await supabase
              .from('billing_events')
              .insert({
                project_id: projectData.id,
                event_type: 'subscription_created',
                stripe_session_id: session.id,
                stripe_customer_id: session.customer as string,
                amount: session.amount_total,
                currency: session.currency,
                metadata: {
                  subscription_id: session.subscription,
                  payment_status: session.payment_status,
                  source: 'homepage',
                },
              });

            console.log(`Project ${projectData.id} upgraded to Pro via homepage checkout`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        const updateData: any = {
          subscription_status: subscription.status,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cancel_at_period_end: (subscription as any).cancel_at_period_end,
        };


        // Update subscription status in database
        const { error } = await supabase
          .from('projects')
          .update(updateData)
          .eq('stripe_customer_id', subscription.customer as string);

        if (error) {
          console.error('Failed to update subscription:', error);
          throw error;
        }

        // Log the event
        await supabase
          .from('billing_events')
          .insert({
            event_type: 'subscription_updated',
            stripe_customer_id: subscription.customer as string,
            metadata: {
              subscription_id: subscription.id,
              status: subscription.status,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              cancel_at_period_end: (subscription as any).cancel_at_period_end,
            },
          });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        const updateData = {
          plan: 'free',
          subscription_status: 'canceled',
          subscription_id: null,
          downgraded_at: new Date().toISOString(),
        };

        // Downgrade project to free plan
        const { error } = await supabase
          .from('projects')
          .update(updateData)
          .eq('stripe_customer_id', subscription.customer as string);

        if (error) {
          console.error('Failed to downgrade project:', error);
          throw error;
        }

        // Log the cancellation
        await supabase
          .from('billing_events')
          .insert({
            event_type: 'subscription_canceled',
            stripe_customer_id: subscription.customer as string,
            metadata: {
              subscription_id: subscription.id,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              canceled_at: new Date((subscription as any).canceled_at! * 1000).toISOString(),
            },
          });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Log successful payment
        await supabase
          .from('billing_events')
          .insert({
            event_type: 'payment_succeeded',
            stripe_customer_id: invoice.customer as string,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            metadata: {
              invoice_id: invoice.id,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              subscription_id: (invoice as any).subscription as string,
              period_start: new Date(invoice.period_start * 1000).toISOString(),
              period_end: new Date(invoice.period_end * 1000).toISOString(),
            },
          });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Log failed payment
        await supabase
          .from('billing_events')
          .insert({
            event_type: 'payment_failed',
            stripe_customer_id: invoice.customer as string,
            amount: invoice.amount_due,
            currency: invoice.currency,
            metadata: {
              invoice_id: invoice.id,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              subscription_id: (invoice as any).subscription as string,
              failure_reason: invoice.last_finalization_error?.message,
            },
          });

        // Optionally, update project status to indicate payment issues
        await supabase
          .from('projects')
          .update({
            subscription_status: 'past_due',
            payment_failed_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', invoice.customer as string);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
