import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Yearly checkout request for projectId:', projectId);

    // Get project data from Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    // Check if this is account-level billing (user ID as project ID)
    if (projectId && projectId.length > 20) {
      console.log('🔍 Detected account-level yearly checkout');
      
      // For account-level billing, we need to handle it differently
      // Since we don't have stripe_customer_id set up yet, we'll create a fallback
      console.log('⚠️ Account-level billing detected but no Stripe customer ID setup');
      
      // Create a Stripe Checkout session without requiring existing customer
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: process.env.STRIPE_YEARLY_PRICE_ID || 'price_yearly_placeholder',
            quantity: 1,
          },
        ],
        mode: 'subscription',
        billing_address_collection: 'required',
        tax_id_collection: {
          enabled: true,
        },
        automatic_tax: {
          enabled: true,
        },
        customer_update: {
          address: 'auto',
        },
        subscription_data: {
          metadata: {
            account_id: projectId,
            upgrade_type: 'yearly'
          },
        },
        success_url: `${request.headers.get('origin')}/app/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${request.headers.get('origin')}/app/billing?cancelled=true`,
        metadata: {
          account_id: projectId,
          upgrade_type: 'yearly'
        },
      });

      console.log('✅ Account-level yearly checkout session created:', session.id);
      return NextResponse.json({ 
        url: session.url,
        session_id: session.id
      });
    }

    // Project-level billing (existing logic)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('stripe_customer_id, name, slug')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Error fetching project:', projectError);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (!project.stripe_customer_id) {
      console.log('⚠️ Project has no Stripe customer ID, creating new checkout session');
      
      // Create checkout session without existing customer
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: process.env.STRIPE_YEARLY_PRICE_ID || 'price_yearly_placeholder',
            quantity: 1,
          },
        ],
        mode: 'subscription',
        billing_address_collection: 'required',
        tax_id_collection: {
          enabled: true,
        },
        automatic_tax: {
          enabled: true,
        },
        customer_update: {
          address: 'auto',
        },
        subscription_data: {
          metadata: {
            project_id: projectId,
            project_slug: project.slug,
          },
        },
        success_url: `${request.headers.get('origin')}/${project.slug}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${request.headers.get('origin')}/${project.slug}/billing?cancelled=true`,
        metadata: {
          project_id: projectId,
          project_slug: project.slug,
          upgrade_type: 'yearly'
        },
      });

      console.log('✅ New yearly checkout session created:', session.id);
      return NextResponse.json({ 
        url: session.url,
        session_id: session.id
      });
    }

    // Create Stripe Checkout session for yearly plan
    const session = await stripe.checkout.sessions.create({
      customer: project.stripe_customer_id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_YEARLY_PRICE_ID || 'price_yearly_placeholder', // You'll need to set this in your environment
          quantity: 1,
        },
      ],
      mode: 'subscription',
      billing_address_collection: 'required',
      tax_id_collection: {
        enabled: true,
      },
      automatic_tax: {
        enabled: true,
      },
      customer_update: {
        address: 'auto',
      },
      subscription_data: {
        metadata: {
          project_id: projectId,
          project_slug: project.slug,
        },
      },
      success_url: `${request.headers.get('origin')}/${project.slug}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/${project.slug}/billing?cancelled=true`,
      metadata: {
        project_id: projectId,
        project_slug: project.slug,
        upgrade_type: 'yearly'
      },
    });

    console.log('✅ Yearly checkout session created:', session.id);

    return NextResponse.json({ 
      url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('Error creating yearly checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
