import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { resolveBillingContext } from '@/lib/billing';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

type BillingCycle = 'monthly' | 'yearly';

interface CheckoutBody {
  billingCycle?: BillingCycle;
  projectId?: string;
  accountId?: string;
  priceId?: string;
  successUrl?: string;
  cancelUrl?: string;
}

const getDefaultPriceId = (cycle: BillingCycle): string | null => {
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutBody;
    const billingCycle: BillingCycle = body.billingCycle ?? 'monthly';
    const identifier = body.projectId || body.accountId;

    if (!identifier) {
      return NextResponse.json(
        { error: 'Project or account identifier is required' },
        { status: 400 }
      );
    }

    const context = await resolveBillingContext(identifier);
    if (!context) {
      return NextResponse.json(
        { error: 'Unable to resolve billing context' },
        { status: 404 }
      );
    }

    const priceId = body.priceId ?? getDefaultPriceId(billingCycle);
    if (!priceId) {
      console.error(
        `[stripe/checkout] Missing price for ${billingCycle}. ` +
          `STRIPE_MONTHLY_PRICE_ID=${process.env.STRIPE_MONTHLY_PRICE_ID}, ` +
          `STRIPE_YEARLY_PRICE_ID=${process.env.STRIPE_YEARLY_PRICE_ID}`
      );
    }

    if (!priceId) {
      return NextResponse.json(
        { error: `Missing Stripe price ID for ${billingCycle} billing` },
        { status: 500 }
      );
    }

    const successPath = buildReturnPath(context.project?.slug);
    const origin = request.headers.get('origin') || request.url.replace(/\/api\/.*/, '');

    const hasCustomer = Boolean(context.profile?.stripe_customer_id);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      billing_address_collection: 'required',
      allow_promotion_codes: true,
      tax_id_collection: { enabled: true },
      automatic_tax: { enabled: true },
      ...(hasCustomer
        ? {
            customer: context.profile!.stripe_customer_id!,
            customer_update: { address: 'auto' },
          }
        : {
            customer_creation: 'always',
          }),
      metadata: {
        account_user_id: context.userId,
        project_id: context.project?.id ?? '',
        upgrade_type: billingCycle,
      },
      subscription_data: {
        metadata: {
          account_user_id: context.userId,
          project_id: context.project?.id ?? '',
          upgrade_type: billingCycle,
        },
      },
      success_url:
        body.successUrl ||
        `${origin}${successPath}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        body.cancelUrl ||
        `${origin}${successPath}?cancelled=true`,
    });

    return NextResponse.json({
      url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
