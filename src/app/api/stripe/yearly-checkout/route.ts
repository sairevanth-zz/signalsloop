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

    // Get project data from Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

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
      return NextResponse.json(
        { error: 'No billing account found' },
        { status: 400 }
      );
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
      subscription_data: {
        metadata: {
          project_id: projectId,
          project_slug: project.slug,
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?cancelled=true`,
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
