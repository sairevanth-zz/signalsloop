import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { resolveBillingContext, upsertAccountBillingProfile } from '@/lib/billing';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const getYearlyPriceId = (): string | null => {
  return (
    process.env.STRIPE_YEARLY_PRICE_ID ||
    process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID ||
    null
  );
};

export async function POST(request: NextRequest) {
  try {
    const { projectId, accountId } = await request.json();
    const identifier = projectId || accountId;

    console.log('📅 Upgrade to yearly request:', { identifier });

    if (!identifier) {
      return NextResponse.json(
        { error: 'Project or account identifier is required' },
        { status: 400 }
      );
    }

    const context = await resolveBillingContext(identifier);
    if (!context) {
      console.error('❌ Could not resolve billing context');
      return NextResponse.json(
        { error: 'Unable to resolve billing context' },
        { status: 404 }
      );
    }

    const yearlyPriceId = getYearlyPriceId();
    if (!yearlyPriceId) {
      console.error('❌ Yearly price ID not configured');
      return NextResponse.json(
        { error: 'Yearly pricing is not configured' },
        { status: 500 }
      );
    }

    // Check if user has an active subscription
    if (!context.profile?.subscription_id) {
      console.error('❌ No subscription found');
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    console.log('🔍 Retrieving subscription:', context.profile.subscription_id);

    // Get the current subscription
    const subscription = await stripe.subscriptions.retrieve(context.profile.subscription_id);

    if (subscription.status !== 'active') {
      console.error('❌ Subscription is not active:', subscription.status);
      return NextResponse.json(
        { error: `Cannot upgrade subscription with status: ${subscription.status}` },
        { status: 400 }
      );
    }

    // Check if already on yearly
    const currentItem = subscription.items.data[0];
    if (currentItem.price.id === yearlyPriceId) {
      console.log('ℹ️ Already on yearly plan');
      return NextResponse.json(
        { error: 'You are already on the yearly plan' },
        { status: 400 }
      );
    }

    console.log('🚀 Updating subscription to yearly...');

    // Update the subscription to yearly pricing
    const updatedSubscription = await stripe.subscriptions.update(
      context.profile.subscription_id,
      {
        items: [
          {
            id: currentItem.id,
            price: yearlyPriceId,
          },
        ],
        proration_behavior: 'always_invoice',
        cancel_at_period_end: false, // Ensure subscription continues
      }
    );

    console.log('✅ Subscription updated to yearly:', updatedSubscription.id);

    // Update database
    if (context.profile) {
      await upsertAccountBillingProfile({
        user_id: context.userId,
        subscription_status: updatedSubscription.status,
        current_period_end: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: false,
        billing_cycle: 'yearly',
      });
      console.log('✅ Updated account billing profile');
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully upgraded to yearly billing',
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        current_period_end: updatedSubscription.current_period_end,
      },
    });
  } catch (error) {
    console.error('❌ Upgrade to yearly error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', { message: errorMessage });

    return NextResponse.json(
      {
        error: 'Failed to upgrade to yearly',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
