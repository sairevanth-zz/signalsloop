import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

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
    const { successUrl, cancelUrl } = await request.json();

    // Create Stripe checkout session (test version - creates price on the fly)
    const stripe = getStripe();
    
    // Create a test product and price
    const product = await stripe.products.create({
      name: 'SignalSloop Pro (Test)',
      description: 'Test subscription for SignalSloop Pro',
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 1900, // $19.00 in cents
      currency: 'usd',
      recurring: { interval: 'month' },
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${request.nextUrl.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${request.nextUrl.origin}/payment-test`,
      metadata: {
        test: 'true',
        projectId: 'test-project',
      },
    });

    return NextResponse.json({ 
      url: session.url,
      sessionId: session.id,
      message: 'Test checkout session created successfully'
    });

  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}
