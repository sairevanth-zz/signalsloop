import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });
};

const getOrigin = (request: NextRequest) => {
  const headerOrigin = request.headers.get('origin');
  if (headerOrigin) return headerOrigin;
  try {
    return request.nextUrl.origin;
  } catch {
    return process.env.NEXT_PUBLIC_SITE_URL || 'https://signalsloop.com';
  }
};

export async function POST(request: NextRequest) {
  try {
    const { billingType, projectId, returnUrl } = await request.json();

    if (!billingType || !['monthly', 'annual'].includes(billingType)) {
      return NextResponse.json({ error: 'Invalid billing type' }, { status: 400 });
    }

    const stripe = getStripe();
    let prices:
      | Stripe.ApiList<Stripe.Price>
      | null = null;
    const ensurePricesLoaded = async () => {
      if (!prices) {
        prices = await stripe.prices.list({
          active: true,
          expand: ['data.product'],
        });
      }
      return prices;
    };

    // Find the appropriate price based on billing type
    let priceId: string;

    const envMonthlyPrice = process.env.STRIPE_MONTHLY_PRICE_ID;
    const envYearlyPrice = process.env.STRIPE_YEARLY_PRICE_ID;

    if (billingType === 'monthly' && envMonthlyPrice) {
      priceId = envMonthlyPrice;
    } else if (billingType === 'annual' && envYearlyPrice) {
      priceId = envYearlyPrice;
    } else if (billingType === 'monthly') {
      // Look for monthly Pro price
      const monthlyPrices = await ensurePricesLoaded();
      const monthlyPrice = monthlyPrices.data.find(price => 
        price.recurring?.interval === 'month' && 
        (price.product as Stripe.Product).name?.toLowerCase().includes('pro')
      );
      
      if (!monthlyPrice) {
        return NextResponse.json({ error: 'Monthly Pro price not found. Please contact support.' }, { status: 404 });
      }
      
      priceId = monthlyPrice.id;
    } else if (billingType === 'annual') {
      // Look for annual Pro price
      const annualPrices = await ensurePricesLoaded();
      const annualPrice = annualPrices.data.find(price => 
        price.recurring?.interval === 'year' && 
        (price.product as Stripe.Product).name?.toLowerCase().includes('pro')
      );
      
      if (!annualPrice) {
        // Fallback to monthly price if annual not found
        const monthlyPrices = await ensurePricesLoaded();
        const monthlyPrice = monthlyPrices.data.find(price => 
          price.recurring?.interval === 'month' && 
          (price.product as Stripe.Product).name?.toLowerCase().includes('pro')
        );
        
        if (!monthlyPrice) {
          return NextResponse.json({ error: 'Pro pricing not found. Please contact support.' }, { status: 404 });
        }
        
        priceId = monthlyPrice.id;
        console.log('Annual price not found, using monthly price as fallback');
      } else {
        priceId = annualPrice.id;
      }
    } else {
      return NextResponse.json({ error: 'Billing type not supported' }, { status: 400 });
    }

    if (!priceId) {
      console.error('Stripe price lookup failed for billing type:', billingType);
      return NextResponse.json(
        { error: `Stripe price not configured for ${billingType} billing. Please contact support.` },
        { status: 500 }
      );
    }

    const origin = getOrigin(request);
    const successUrl = (() => {
      if (typeof returnUrl === 'string' && returnUrl.length > 0) {
        if (returnUrl.includes('{CHECKOUT_SESSION_ID}')) {
          return returnUrl;
        }
        const separator = returnUrl.includes('?') ? '&' : '?';
        return `${returnUrl}${separator}session_id={CHECKOUT_SESSION_ID}`;
      }
      return `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    })();
    const cancelUrl = `${origin}/app/billing`;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      payment_method_collection: 'always',
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      tax_id_collection: {
        enabled: true,
      },
      automatic_tax: {
        enabled: true,
      },
      metadata: {
        billingType,
        source: 'homepage',
        projectId: projectId ?? '',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Homepage checkout error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to create checkout session',
      details: message
    }, { status: 500 });
  }
}
