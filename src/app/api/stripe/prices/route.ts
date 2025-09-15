import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil',
  });
};

export async function GET() {
  try {
    const stripe = getStripe();
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
    });

    const formattedPrices = prices.data.map(price => ({
      id: price.id,
      product: {
        id: price.product as string,
        name: (price.product as Stripe.Product).name,
        description: (price.product as Stripe.Product).description,
      },
      unit_amount: price.unit_amount,
      currency: price.currency,
      recurring: price.recurring,
      active: price.active,
    }));

    return NextResponse.json({ prices: formattedPrices });
  } catch (error) {
    console.error('Failed to fetch prices:', error);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
