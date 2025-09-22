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
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Error fetching project:', projectError);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (!project.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Cancel the subscription at period end
    const subscription = await stripe.subscriptions.update(
      project.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    );

    // Update the project record
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Error updating project:', updateError);
    }

    console.log('✅ Subscription cancelled at period end:', subscription.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription will be cancelled at the end of the billing period',
      cancel_at: subscription.cancel_at
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
