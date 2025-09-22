import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil',
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

    // Check if project is in trial
    if (!project.is_trial || project.trial_status !== 'active') {
      return NextResponse.json({ error: 'Project is not in trial period' }, { status: 400 });
    }

    // Cancel the subscription in Stripe
    if (project.subscription_id) {
      const stripe = getStripe();
      await stripe.subscriptions.cancel(project.subscription_id);
    }

    // Update project status
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        trial_status: 'cancelled',
        trial_cancelled_at: new Date().toISOString(),
        is_trial: false,
        plan: 'free',
        subscription_status: 'canceled',
        subscription_id: null,
        downgraded_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Failed to update project after trial cancellation:', updateError);
      throw updateError;
    }

    // Log the trial cancellation
    await supabase
      .from('billing_events')
      .insert({
        project_id: projectId,
        event_type: 'trial_canceled',
        stripe_customer_id: project.stripe_customer_id,
        metadata: {
          subscription_id: project.subscription_id,
          trial_start_date: project.trial_start_date,
          trial_end_date: project.trial_end_date,
          cancelled_at: new Date().toISOString(),
        },
      });

    return NextResponse.json({ 
      success: true, 
      message: 'Trial cancelled successfully' 
    });

  } catch (error) {
    console.error('Trial cancellation error:', error);
    return NextResponse.json({ 
      error: 'Failed to cancel trial' 
    }, { status: 500 });
  }
}
