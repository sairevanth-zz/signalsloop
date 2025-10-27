import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { resolveBillingContext } from '@/lib/billing';

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
    const { customerId, returnUrl, accountId, projectId } = await request.json();
    let resolvedCustomerId = customerId as string | null;

    if (!resolvedCustomerId && (accountId || projectId)) {
      const context = await resolveBillingContext(accountId || projectId);
      if (context?.profile?.stripe_customer_id) {
        resolvedCustomerId = context.profile.stripe_customer_id;
      }
    }

    if (!resolvedCustomerId) {
      return NextResponse.json(
        { error: 'Customer ID is required', details: 'No Stripe customer associated with this account.' },
        { status: 400 }
      );
    }

    // Create portal session
    const stripe = getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: resolvedCustomerId,
      return_url: returnUrl || `${request.nextUrl.origin}/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Portal session error:', error);
    return NextResponse.json({ 
      error: 'Failed to create portal session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
