import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { resolveBillingContext, upsertAccountBillingProfile, syncAccountProfileToProject } from '@/lib/billing';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });
};

export async function POST(request: NextRequest) {
  try {
    const { projectId, accountId } = await request.json();
    const identifier = projectId || accountId;

    if (!identifier) {
      return NextResponse.json({ error: 'Project or account identifier is required' }, { status: 400 });
    }

    const context = await resolveBillingContext(identifier);
    if (!context) {
      return NextResponse.json({ error: 'Unable to resolve billing context' }, { status: 404 });
    }

    const hasActiveProPlan =
      context.profile?.plan === 'pro' || context.project?.plan === 'pro';

    if (!hasActiveProPlan) {
      return NextResponse.json({ error: 'No active Pro subscription found' }, { status: 400 });
    }

    const stripeSubscriptionId =
      context.profile?.subscription_id ?? context.project?.subscription_id ?? null;

    // If there's a Stripe subscription, cancel it
    if (stripeSubscriptionId) {
      const stripe = getStripe();
      
      try {
        await stripe.subscriptions.update(stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      } catch (stripeError) {
        console.error('Stripe cancellation error:', stripeError);
        // Continue with database update even if Stripe fails
      }
    }

    const nextProfile = await upsertAccountBillingProfile({
      user_id: context.userId,
      plan: context.profile?.plan ?? (context.project?.plan ?? 'pro'),
      stripe_customer_id: context.profile?.stripe_customer_id ?? context.project?.stripe_customer_id ?? null,
      subscription_id: stripeSubscriptionId,
      subscription_status: 'active',
      current_period_end: context.profile?.current_period_end ?? context.project?.current_period_end ?? null,
      cancel_at_period_end: true,
      billing_cycle: context.profile?.billing_cycle ?? null,
      trial_start_date: context.profile?.trial_start_date ?? context.project?.trial_start_date ?? null,
      trial_end_date: context.profile?.trial_end_date ?? context.project?.trial_end_date ?? null,
      trial_status: context.profile?.trial_status ?? context.project?.trial_status ?? null,
      is_trial: context.profile?.is_trial ?? context.project?.is_trial ?? false,
      trial_cancelled_at: context.profile?.trial_cancelled_at ?? context.project?.trial_cancelled_at ?? null,
    });

    if (!nextProfile) {
      return NextResponse.json({ error: 'Failed to update subscription state' }, { status: 500 });
    }

    if (context.project) {
      await syncAccountProfileToProject(context.project.id, nextProfile);
    }

    // Log the cancellation event
    const supabase = getSupabaseServiceRoleClient();
    await supabase
      .from('billing_events')
      .insert({
        project_id: context.project?.id ?? null,
        event_type: 'subscription_cancelled',
        stripe_customer_id: nextProfile.stripe_customer_id,
        metadata: {
          cancelled_at: new Date().toISOString(),
          cancel_at_period_end: true,
          account_user_id: context.userId,
        },
      });

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription cancelled successfully. You will retain Pro features until the end of your billing period.' 
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json({ 
      error: 'Failed to cancel subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
