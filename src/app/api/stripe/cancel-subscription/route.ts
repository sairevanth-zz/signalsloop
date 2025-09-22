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

    console.log('🔍 Cancel subscription request for projectId:', projectId);

    // Get project data from Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    // Check if this is account-level billing (user ID as project ID)
    if (projectId && projectId.length > 20) {
      console.log('🔍 Detected account-level cancel subscription');
      
      // For account-level billing, we don't have a subscription_id yet
      // This is a mock response for now
      console.log('⚠️ Account-level billing detected but no subscription setup yet');
      
      return NextResponse.json({ 
        success: true, 
        message: 'Subscription cancellation request received. No active subscription found for account-level billing.',
        cancel_at: null
      });
    }

    // Project-level billing (existing logic)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('stripe_customer_id, subscription_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Error fetching project:', projectError);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (!project.subscription_id) {
      console.log('⚠️ Project has no subscription ID, returning mock response');
      return NextResponse.json({ 
        success: true, 
        message: 'No active subscription found. You are currently on a free plan.',
        cancel_at: null
      });
    }

    // Cancel the subscription at period end
    const subscription = await stripe.subscriptions.update(
      project.subscription_id,
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
