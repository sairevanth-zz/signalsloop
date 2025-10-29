import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { resolveBillingContext, upsertAccountBillingProfile, syncAccountProfileToProject } from '@/lib/billing';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil',
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

    console.log('🔍 Trial cancel context:', {
      profileIsTrial: context.profile?.is_trial,
      profileTrialStatus: context.profile?.trial_status,
      projectIsTrial: context.project?.is_trial,
      projectTrialStatus: context.project?.trial_status,
    });

    const isTrialActive =
      (context.profile?.is_trial ?? context.project?.is_trial ?? false) &&
      (context.profile?.trial_status ?? context.project?.trial_status) === 'active';

    console.log('✅ Is trial active?', isTrialActive);

    if (!isTrialActive) {
      console.error('❌ Trial not active. Details:', {
        is_trial: context.profile?.is_trial ?? context.project?.is_trial,
        trial_status: context.profile?.trial_status ?? context.project?.trial_status,
      });
      return NextResponse.json({
        error: 'Project is not in trial period',
        details: {
          is_trial: context.profile?.is_trial ?? context.project?.is_trial ?? false,
          trial_status: context.profile?.trial_status ?? context.project?.trial_status ?? null,
        }
      }, { status: 400 });
    }

    // Cancel the subscription in Stripe
    const subscriptionId =
      context.profile?.subscription_id ?? context.project?.subscription_id ?? null;

    if (subscriptionId) {
      const stripe = getStripe();
      await stripe.subscriptions.cancel(subscriptionId);
    }

    const nowIso = new Date().toISOString();
    const nextProfile = await upsertAccountBillingProfile({
      user_id: context.userId,
      plan: 'free',
      stripe_customer_id: context.profile?.stripe_customer_id ?? context.project?.stripe_customer_id ?? null,
      subscription_id: null,
      subscription_status: 'canceled',
      current_period_end: context.profile?.current_period_end ?? context.project?.current_period_end ?? null,
      cancel_at_period_end: false,
      billing_cycle: null,
      trial_start_date: context.profile?.trial_start_date ?? context.project?.trial_start_date ?? null,
      trial_end_date: context.profile?.trial_end_date ?? context.project?.trial_end_date ?? null,
      trial_status: 'cancelled',
      is_trial: false,
      trial_cancelled_at: nowIso,
    });

    if (!nextProfile) {
      return NextResponse.json({ error: 'Failed to update trial state' }, { status: 500 });
    }

    if (context.project) {
      await syncAccountProfileToProject(context.project.id, {
        ...nextProfile,
        subscription_status: 'canceled',
        subscription_id: null,
        plan: 'free',
        cancel_at_period_end: false,
        trial_status: 'cancelled',
        is_trial: false,
      });
    }

    // Log the trial cancellation
    const supabase = getSupabaseServiceRoleClient();
    await supabase
      .from('billing_events')
      .insert({
        project_id: context.project?.id ?? null,
        event_type: 'trial_canceled',
        stripe_customer_id: nextProfile.stripe_customer_id,
        metadata: {
          account_user_id: context.userId,
          subscription_id: subscriptionId,
          trial_start_date: nextProfile.trial_start_date,
          trial_end_date: nextProfile.trial_end_date,
          cancelled_at: nowIso,
        },
      });

    return NextResponse.json({ 
      success: true, 
      message: 'Trial cancelled successfully' 
    });

  } catch (error) {
    console.error('Trial cancellation error:', error);
    return NextResponse.json({ 
      error: 'Failed to cancel trial' 
    }, { status: 500 });
  }
}
