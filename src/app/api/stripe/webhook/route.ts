import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendProWelcomeEmail, sendCancellationEmail } from '@/lib/email';
import { ensureUserRecord } from '@/lib/users';
import {
  resolveBillingContext,
  resolveBillingContextByCustomerId,
  upsertAccountBillingProfile,
  syncAccountProfileToProject,
} from '@/lib/billing';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });
};

const getSupabase = () => {
  return getSupabaseServiceRoleClient();
};

const getEndpointSecret = () => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }
  return process.env.STRIPE_WEBHOOK_SECRET;
};

const maybeSendProWelcomeEmail = async (
  supabase: SupabaseClient,
  context: { userId: string; project: { id: string; name: string | null; pro_welcome_email_sent_at: string | null } | null }
) => {
  if (!context.project) {
    return;
  }

  const { project, userId } = context;

  if (project.pro_welcome_email_sent_at) {
    console.log('Pro welcome email already sent for project:', project.id);
    return;
  }

  let owner;
  try {
    owner = await ensureUserRecord(supabase, userId);
  } catch (ensureError) {
    console.error('Failed to ensure project owner before Pro welcome email:', ensureError);
    return;
  }

  if (!owner.email) {
    console.error('Project owner missing email for Pro welcome email:', {
      projectId: project.id,
      ownerId: userId,
    });
    return;
  }

  try {
    console.log('[PRO WELCOME] Attempting to send Pro welcome email to:', owner.email);
    await sendProWelcomeEmail({
      email: owner.email,
      name: owner.name,
      projectName: project.name ?? 'SignalsLoop workspace',
    });

    await supabase
      .from('projects')
      .update({ pro_welcome_email_sent_at: new Date().toISOString() })
      .eq('id', project.id);

    console.log('[PRO WELCOME] ✅ Sent Pro welcome email for project:', project.id);
  } catch (emailError) {
    console.error('[PRO WELCOME] ❌ Failed to send Pro welcome email:', emailError);
    console.error('[PRO WELCOME] Error details:', JSON.stringify(emailError, null, 2));
  }
};

const sendCancellationEmailsForCustomer = async (
  supabase: SupabaseClient,
  stripeCustomerId: string
) => {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, owner_id, cancellation_email_sent_at')
    .eq('stripe_customer_id', stripeCustomerId);

  if (error) {
    console.error('Failed to load projects for cancellation email:', { stripeCustomerId, error });
    return;
  }

  if (!projects?.length) {
    console.warn('No projects found for cancellation email send:', stripeCustomerId);
    return;
  }

  for (const project of projects) {
    if (project.cancellation_email_sent_at) {
      console.log('Cancellation email already sent for project:', project.id);
      continue;
    }

    let owner = null;

    const { data: ownerRecord, error: ownerError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', project.owner_id)
      .maybeSingle();

    if (ownerError && ownerError.code !== 'PGRST116') {
      console.error('Unable to load owner for cancellation email:', {
        projectId: project.id,
        ownerId: project.owner_id,
        error: ownerError,
      });
      continue;
    }

    owner = ownerRecord;

    if (!owner?.email) {
      try {
        owner = await ensureUserRecord(supabase, project.owner_id);
      } catch (ensureError) {
        console.error('Failed to ensure project owner before cancellation email:', {
          projectId: project.id,
          ownerId: project.owner_id,
          error: ensureError,
        });
        continue;
      }
    }

    if (!owner?.email) {
      console.error('Project owner missing email for cancellation email:', {
        projectId: project.id,
        ownerId: project.owner_id,
      });
      continue;
    }

    try {
      const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.signalsloop.com';
      console.log('[CANCELLATION] Attempting to send cancellation email to:', owner.email);
      await sendCancellationEmail({
        email: owner.email,
        name: owner.name,
        projectName: project.name,
        reactivationUrl: `${appUrl}/app`,
      });

      await supabase
        .from('projects')
        .update({ cancellation_email_sent_at: new Date().toISOString() })
        .eq('id', project.id);

      console.log('[CANCELLATION] ✅ Sent cancellation email for project:', project.id);
    } catch (emailError) {
      console.error('[CANCELLATION] ❌ Failed to send cancellation email:', {
        projectId: project.id,
        error: emailError,
      });
      console.error('[CANCELLATION] Error details:', JSON.stringify(emailError, null, 2));
    }
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature')!;

    let event: Stripe.Event;
    const stripe = getStripe();

    try {
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
          const metadata = session.metadata || {};
          const customerId = session.customer as string | null;
          const projectIdentifier =
            metadata.project_id ||
            metadata.projectId ||
            (session.client_reference_id ?? undefined);
          const accountIdentifier =
            metadata.account_user_id ||
            metadata.account_id ||
            metadata.user_id;

          let context =
            (projectIdentifier && (await resolveBillingContext(projectIdentifier, supabase))) ||
            (accountIdentifier && (await resolveBillingContext(accountIdentifier, supabase))) ||
            (customerId && (await resolveBillingContextByCustomerId(customerId, supabase))) ||
            null;

          if (!context && customerId) {
            try {
              const customer = await stripe.customers.retrieve(customerId);
              const customerEmail = (customer as Stripe.Customer).email;

              if (customerEmail) {
                const { data: userRecord } = await supabase
                  .from('users')
                  .select('id')
                  .eq('email', customerEmail)
                  .maybeSingle();

                if (userRecord?.id) {
                  context =
                    (await resolveBillingContext(userRecord.id, supabase)) ??
                    (await resolveBillingContextByCustomerId(customerId, supabase));
                }
              }
            } catch (lookupError) {
              console.error('Failed to lookup context by customer email:', lookupError);
            }
          }

          if (!context || !customerId) {
            console.error('Unable to resolve billing context for checkout completion', {
              sessionId: session.id,
              metadata,
            });
            break;
          }

          const billingCycle =
            metadata.upgrade_type === 'yearly'
              ? 'yearly'
              : metadata.upgrade_type === 'monthly'
              ? 'monthly'
              : metadata.interval === 'yearly'
              ? 'yearly'
              : metadata.interval === 'monthly'
              ? 'monthly'
              : null;

          const updatedProfile =
            (await upsertAccountBillingProfile(
              {
                user_id: context.userId,
                plan: 'pro',
                stripe_customer_id: customerId,
                subscription_id: session.subscription as string | null,
                subscription_status:
                  session.payment_status === 'paid' || session.payment_status === 'no_payment_required'
                    ? 'active'
                    : 'incomplete',
                cancel_at_period_end: false,
                billing_cycle: billingCycle,
              },
              supabase
            )) ?? context.profile;

          if (context.project && updatedProfile) {
            await syncAccountProfileToProject(context.project.id, updatedProfile, supabase);
          }

          await supabase.from('billing_events').insert({
            project_id: context.project?.id ?? null,
            event_type: 'subscription_created',
            stripe_session_id: session.id,
            stripe_customer_id: customerId,
            amount: session.amount_total,
            currency: session.currency,
            metadata: {
              subscription_id: session.subscription,
              payment_status: session.payment_status,
              upgrade_type: metadata.upgrade_type ?? null,
              account_user_id: context.userId,
            },
          });

          await maybeSendProWelcomeEmail(supabase, {
            userId: context.userId,
            project: context.project
              ? {
                  id: context.project.id,
                  name: context.project.name,
                  pro_welcome_email_sent_at: context.project.pro_welcome_email_sent_at,
                }
              : null,
          });

          console.log(
            `[Stripe] Subscription checkout completed for user ${context.userId}, customer ${customerId}`
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        const customerId = subscription.customer as string;
        const context = await resolveBillingContextByCustomerId(customerId, supabase);

        if (!context) {
          console.error('Unable to resolve billing context for subscription update', {
            customerId,
            subscriptionId: subscription.id,
          });
          break;
        }

        const currentPeriodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        const updatedProfile =
          (await upsertAccountBillingProfile(
            {
              user_id: context.userId,
              plan: subscription.status === 'canceled' ? 'free' : 'pro',
              stripe_customer_id: customerId,
              subscription_id: subscription.id,
              subscription_status: subscription.status,
              current_period_end: currentPeriodEnd,
              cancel_at_period_end: subscription.cancel_at_period_end ?? false,
            },
            supabase
          )) ?? context.profile;

        if (context.project && updatedProfile) {
          await syncAccountProfileToProject(context.project.id, updatedProfile, supabase);
        }

        // Send cancellation email immediately when user cancels (sets cancel_at_period_end to true)
        if (subscription.cancel_at_period_end === true) {
          await sendCancellationEmailsForCustomer(supabase, customerId);
        }

        // Log the event
        await supabase
          .from('billing_events')
          .insert({
            event_type: 'subscription_updated',
            stripe_customer_id: customerId,
            metadata: {
              subscription_id: subscription.id,
              status: subscription.status,
              cancel_at_period_end: subscription.cancel_at_period_end ?? false,
              account_user_id: context.userId,
            },
          });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        const customerId = subscription.customer as string;
        const context = await resolveBillingContextByCustomerId(customerId, supabase);

        if (!context) {
          console.error('Unable to resolve billing context for subscription deletion', {
            customerId,
            subscriptionId: subscription.id,
          });
          break;
        }

        const updatedProfile =
          (await upsertAccountBillingProfile(
            {
              user_id: context.userId,
              plan: 'free',
              stripe_customer_id: customerId,
              subscription_id: null,
              subscription_status: 'canceled',
              cancel_at_period_end: false,
            },
            supabase
          )) ?? context.profile;

        if (context.project && updatedProfile) {
          await syncAccountProfileToProject(context.project.id, updatedProfile, supabase);
        }

        await sendCancellationEmailsForCustomer(supabase, customerId);

        // Log the cancellation
        await supabase
          .from('billing_events')
          .insert({
            event_type: 'subscription_canceled',
            stripe_customer_id: customerId,
            metadata: {
              subscription_id: subscription.id,
              canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
              account_user_id: context.userId,
            },
          });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        const customerId = invoice.customer as string;
        const context = await resolveBillingContextByCustomerId(customerId, supabase);

        if (context) {
          const profile =
            (await upsertAccountBillingProfile(
              {
                user_id: context.userId,
                plan: 'pro',
                stripe_customer_id: customerId,
                subscription_id: (invoice.subscription as string) ?? context.profile?.subscription_id ?? null,
                subscription_status: 'active',
              },
              supabase
            )) ?? context.profile;

          if (context.project && profile) {
            await syncAccountProfileToProject(context.project.id, profile, supabase);
          }
        }

        // Log successful payment
        await supabase
          .from('billing_events')
          .insert({
            event_type: 'payment_succeeded',
            stripe_customer_id: customerId,
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
        const customerId = invoice.customer as string;
        const context = await resolveBillingContextByCustomerId(customerId, supabase);

        if (context) {
          const profile =
            (await upsertAccountBillingProfile(
              {
                user_id: context.userId,
                plan: 'pro',
                stripe_customer_id: customerId,
                subscription_id: (invoice.subscription as string) ?? context.profile?.subscription_id ?? null,
                subscription_status: 'past_due',
              },
              supabase
            )) ?? context.profile;

          if (context.project && profile) {
            await syncAccountProfileToProject(context.project.id, profile, supabase);
          }
        }
        
        // Log failed payment
        await supabase
          .from('billing_events')
          .insert({
            event_type: 'payment_failed',
            stripe_customer_id: customerId,
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
          .eq('stripe_customer_id', customerId);
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
