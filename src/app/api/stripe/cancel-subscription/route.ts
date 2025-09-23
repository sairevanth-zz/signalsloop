import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });
};

const getSupabase = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    throw new Error('Supabase configuration is missing');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
  );
};

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    
    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.plan !== 'pro') {
      return NextResponse.json({ error: 'No active Pro subscription found' }, { status: 400 });
    }

    // If there's a Stripe subscription, cancel it
    if (project.subscription_id) {
      const stripe = getStripe();
      
      try {
        await stripe.subscriptions.update(project.subscription_id, {
          cancel_at_period_end: true,
        });
      } catch (stripeError) {
        console.error('Stripe cancellation error:', stripeError);
        // Continue with database update even if Stripe fails
      }
    }

    // Update project in database
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
    }

    // Log the cancellation event
    await supabase
      .from('billing_events')
      .insert({
        project_id: projectId,
        event_type: 'subscription_cancelled',
        stripe_customer_id: project.stripe_customer_id,
        metadata: {
          cancelled_at: new Date().toISOString(),
          cancel_at_period_end: true,
        },
      });

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription cancelled successfully. You will retain Pro features until the end of your billing period.' 
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json({ 
      error: 'Failed to cancel subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}