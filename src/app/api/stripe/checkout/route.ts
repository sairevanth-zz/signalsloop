import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { resolveBillingContext } from '@/lib/billing';

// Lazy getter for Stripe client to avoid build-time initialization
function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
  });
}

type BillingCycle = 'monthly' | 'yearly';
type PlanType = 'pro' | 'premium';

interface CheckoutBody {
  billingCycle?: BillingCycle;
  plan?: PlanType;
  projectId?: string;
  accountId?: string;
  priceId?: string;
  successUrl?: string;
  cancelUrl?: string;
}

const getDefaultPriceId = (cycle: BillingCycle, plan: PlanType = 'pro'): string | null => {
  if (plan === 'premium') {
    if (cycle === 'yearly') {
      return (
        process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID ||
        null
      );
    }
    return (
      process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID ||
      null
    );
  }

  // Default: Pro plan
  if (cycle === 'yearly') {
    return (
      process.env.STRIPE_YEARLY_PRICE_ID ||
      process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID ||
      null
    );
  }

  return (
    process.env.STRIPE_MONTHLY_PRICE_ID ||
    process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID ||
    null
  );
};

const buildReturnPath = (slug?: string | null) => {
  if (slug && slug !== 'account') {
    return `/${slug}/billing`;
  }
  return '/app/billing';
};

/**
 * Shared checkout session creation logic
 * Exported for use by yearly-checkout route
 */
export async function createCheckoutSession(body: CheckoutBody, request: Request) {
  try {
    const body = (await request.json()) as CheckoutBody;
    const billingCycle: BillingCycle = body.billingCycle ?? 'monthly';
    const plan: PlanType = body.plan ?? 'pro';
    const identifier = body.projectId || body.accountId;

    console.log('🛒 Checkout request:', { billingCycle, plan, identifier, rawBillingCycle: body.billingCycle });

    // Validate billing cycle
    if (body.billingCycle && body.billingCycle !== 'monthly' && body.billingCycle !== 'yearly') {
      console.error('❌ Invalid billing cycle:', body.billingCycle);
      return NextResponse.json(
        { error: 'Invalid billing cycle', details: `Billing cycle must be 'monthly' or 'yearly', received: '${body.billingCycle}'` },
        { status: 400 }
      );
    }

    // Validate plan
    if (body.plan && body.plan !== 'pro' && body.plan !== 'premium') {
      console.error('❌ Invalid plan:', body.plan);
      return NextResponse.json(
        { error: 'Invalid plan', details: `Plan must be 'pro' or 'premium', received: '${body.plan}'` },
        { status: 400 }
      );
    }

    if (!identifier) {
      return NextResponse.json(
        { error: 'Project or account identifier is required' },
        { status: 400 }
      );
    }

    const context = await resolveBillingContext(identifier);
    if (!context) {
      console.error('❌ Could not resolve billing context for:', identifier);
      return NextResponse.json(
        { error: 'Unable to resolve billing context' },
        { status: 404 }
      );
    }

    console.log('✅ Billing context resolved:', {
      userId: context.userId,
      hasProfile: !!context.profile,
      hasProject: !!context.project,
      customerId: context.profile?.stripe_customer_id,
      subscriptionId: context.profile?.subscription_id,
      currentPlan: context.profile?.plan
    });

    const priceId = body.priceId ?? getDefaultPriceId(billingCycle, plan);
    if (!priceId) {
      console.error(
        `[stripe/checkout] Missing price for ${plan} ${billingCycle}. ` +
        `STRIPE_MONTHLY_PRICE_ID=${process.env.STRIPE_MONTHLY_PRICE_ID}, ` +
        `STRIPE_YEARLY_PRICE_ID=${process.env.STRIPE_YEARLY_PRICE_ID}, ` +
        `STRIPE_PREMIUM_MONTHLY_PRICE_ID=${process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID}, ` +
        `STRIPE_PREMIUM_YEARLY_PRICE_ID=${process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID}`
      );
    }

    if (!priceId) {
      return NextResponse.json(
        { error: `Missing Stripe price ID for ${plan} ${billingCycle} billing` },
        { status: 500 }
      );
    }

    const successPath = buildReturnPath(context.project?.slug);
    const origin = request.headers.get('origin') || request.url.replace(/\/api\/.*/, '');

    const hasCustomer = Boolean(context.profile?.stripe_customer_id);
    console.log('🔧 Creating checkout session:', { hasCustomer, priceId, billingCycle, plan });

    // Check if customer already has an active subscription
    if (hasCustomer && context.profile?.subscription_id) {
      console.log('⚠️ Customer already has subscription:', context.profile.subscription_id);

      // Check if the subscription exists in Stripe
      try {
        const existingSubscription = await getStripe().subscriptions.retrieve(context.profile.subscription_id);

        // Only block if subscription is active AND not set to cancel
        if (existingSubscription.status === 'active' && !existingSubscription.cancel_at_period_end) {
          console.error('❌ Customer already has active subscription, cannot create new checkout');
          return NextResponse.json(
            {
              error: 'Already subscribed',
              details: 'You already have an active subscription. Please manage your subscription through the billing portal instead.'
            },
            { status: 400 }
          );
        }

        // If subscription is canceling or already cancelled, allow new checkout
        if (existingSubscription.cancel_at_period_end) {
          console.log('✅ Existing subscription is set to cancel, allowing new checkout');
        }
      } catch (subError) {
        console.log('⚠️ Subscription not found in Stripe, continuing with checkout');
      }
    }

    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription' as const,
      billing_address_collection: 'required' as const,
      allow_promotion_codes: true,
      tax_id_collection: { enabled: true },
      automatic_tax: { enabled: true },
      ...(hasCustomer
        ? {
          customer: context.profile!.stripe_customer_id!,
          customer_update: {
            address: 'auto' as const,
            name: 'auto' as const,
          },
        }
        : {}),
      metadata: {
        account_user_id: context.userId,
        project_id: context.project?.id ?? '',
        upgrade_type: billingCycle,
        plan_type: plan,
      },
      subscription_data: {
        metadata: {
          account_user_id: context.userId,
          project_id: context.project?.id ?? '',
          upgrade_type: billingCycle,
          plan_type: plan,
        },
      },
      success_url:
        body.successUrl ||
        `${origin}${successPath}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        body.cancelUrl ||
        `${origin}${successPath}?cancelled=true`,
    };

    console.log('🚀 Creating Stripe checkout session...');
    const session = await getStripe().checkout.sessions.create(sessionConfig);
    console.log('✅ Checkout session created:', session.id);

    return NextResponse.json({
      url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    console.error('❌ Stripe checkout error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : undefined;

    console.error('Error details:', { message: errorMessage, stack: errorDetails });

    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler for checkout endpoint
 */
export async function POST(request: Request) {
  const body = (await request.json()) as CheckoutBody;
  return createCheckoutSession(body, request);
}
