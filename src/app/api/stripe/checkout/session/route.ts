import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  resolveBillingContext,
  resolveBillingContextByCustomerId,
  upsertAccountBillingProfile,
  syncAccountProfileToProject,
} from '@/lib/billing';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

// Lazy getter for Stripe client to avoid build-time initialization
function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
  });
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    if (!session || session.mode !== 'subscription') {
      return NextResponse.json({ error: 'Invalid checkout session' }, { status: 400 });
    }

    const metadata = session.metadata || {};
    const customerId = session.customer as string | null;
    const projectIdentifier =
      metadata.project_id || metadata.projectId || (session.client_reference_id ?? undefined);
    const accountIdentifier =
      metadata.account_user_id || metadata.account_id || metadata.user_id;

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 });
    }

    let context =
      (projectIdentifier && (await resolveBillingContext(projectIdentifier, supabase))) ||
      (accountIdentifier && (await resolveBillingContext(accountIdentifier, supabase))) ||
      (customerId && (await resolveBillingContextByCustomerId(customerId, supabase))) ||
      null;

    if (!context && customerId) {
      try {
        const customer = await getStripe().customers.retrieve(customerId);
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
      return NextResponse.json(
        { error: 'Unable to resolve billing context for checkout completion' },
        { status: 404 }
      );
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Finalize checkout session error:', error);
    return NextResponse.json({ error: 'Failed to finalize checkout session' }, { status: 500 });
  }
}
