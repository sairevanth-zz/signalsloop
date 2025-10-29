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
    console.log('🔧 Portal session request:', { customerId, accountId, projectId, returnUrl });

    let resolvedCustomerId = customerId as string | null;

    if (!resolvedCustomerId && (accountId || projectId)) {
      console.log('🔍 Resolving billing context for:', accountId || projectId);
      const context = await resolveBillingContext(accountId || projectId);
      if (context?.profile?.stripe_customer_id) {
        resolvedCustomerId = context.profile.stripe_customer_id;
        console.log('✅ Resolved customer ID:', resolvedCustomerId);
      }
    }

    if (!resolvedCustomerId) {
      console.error('❌ No customer ID found');
      return NextResponse.json(
        { error: 'Customer ID is required', details: 'No Stripe customer associated with this account.' },
        { status: 400 }
      );
    }

    console.log('🚀 Creating Stripe portal session for customer:', resolvedCustomerId);
    const stripe = getStripe();

    // First, verify the customer exists
    try {
      await stripe.customers.retrieve(resolvedCustomerId);
      console.log('✅ Customer exists in Stripe');
    } catch (customerError) {
      console.error('❌ Customer not found in Stripe:', resolvedCustomerId, customerError);
      return NextResponse.json({
        error: 'Invalid customer',
        details: 'The Stripe customer ID is not valid. Please contact support.'
      }, { status: 400 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: resolvedCustomerId,
      return_url: returnUrl || `${request.nextUrl.origin}/app/billing`,
      configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID || undefined,
    });

    console.log('✅ Portal session created successfully');
    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('❌ Portal session error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { message: errorMessage, stack: errorStack });

    return NextResponse.json({
      error: 'Failed to create portal session',
      details: errorMessage
    }, { status: 500 });
  }
}
