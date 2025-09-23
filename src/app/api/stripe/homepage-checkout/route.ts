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
    const { billingType } = await request.json();

    if (!billingType || !['monthly', 'annual'].includes(billingType)) {
      return NextResponse.json({ error: 'Invalid billing type' }, { status: 400 });
    }

    // Get Stripe prices
    const stripe = getStripe();
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
    });

    // Find the appropriate price based on billing type
    let priceId: string;
    
    if (billingType === 'monthly') {
      // Look for monthly Pro price
      const monthlyPrice = prices.data.find(price => 
        price.recurring?.interval === 'month' && 
        (price.product as Stripe.Product).name?.toLowerCase().includes('pro')
      );
      
      if (!monthlyPrice) {
        return NextResponse.json({ error: 'Monthly Pro price not found. Please contact support.' }, { status: 404 });
      }
      
      priceId = monthlyPrice.id;
    } else {
      // Look for annual Pro price
      const annualPrice = prices.data.find(price => 
        price.recurring?.interval === 'year' && 
        (price.product as Stripe.Product).name?.toLowerCase().includes('pro')
      );
      
      if (!annualPrice) {
        // Fallback to monthly price if annual not found
        const monthlyPrice = prices.data.find(price => 
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
    }

    // Create Stripe checkout session with 7-day trial
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 7,
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'create_invoice'
          }
        }
      },
      payment_method_collection: 'always', // Collect payment method but don't charge during trial
      collect_shipping_address: false, // Don't collect shipping address
      phone_number_collection: {
        enabled: false, // Don't require phone number
      },
      success_url: `${request.nextUrl.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/#pricing`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      tax_id_collection: {
        enabled: true,
      },
      metadata: {
        billingType,
        source: 'homepage',
        trial: 'true',
        trial_days: '7'
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Homepage checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
