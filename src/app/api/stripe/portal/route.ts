import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { resolveBillingContext, upsertAccountBillingProfile } from '@/lib/billing';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });
};

export async function POST(request: NextRequest) {
  try {
    const { customerId, returnUrl, accountId, projectId } = await request.json();
    console.log('🔧 Portal session request:', { customerId, accountId, projectId, returnUrl });

    let resolvedCustomerId = customerId as string | null;

    if (!resolvedCustomerId && (accountId || projectId)) {
      console.log('🔍 Resolving billing context for:', accountId || projectId);
      const context = await resolveBillingContext(accountId || projectId);
      if (context?.profile?.stripe_customer_id) {
        resolvedCustomerId = context.profile.stripe_customer_id;
        console.log('✅ Resolved customer ID:', resolvedCustomerId);
      }
    }

    if (!resolvedCustomerId) {
      console.error('❌ No customer ID found');
      return NextResponse.json(
        { error: 'Customer ID is required', details: 'No Stripe customer associated with this account.' },
        { status: 400 }
      );
    }

    console.log('🚀 Creating Stripe portal session for customer:', resolvedCustomerId);
    const stripe = getStripe();
    const supabase = getSupabaseServiceRoleClient();

    // First, verify the customer exists, if not create a new one
    let finalCustomerId = resolvedCustomerId;
    try {
      const customer = await stripe.customers.retrieve(resolvedCustomerId);
      if (customer.deleted) {
        throw new Error('Customer was deleted');
      }
      console.log('✅ Customer exists in Stripe');
    } catch (customerError) {
      console.error('⚠️ Customer not found in Stripe, creating new customer:', resolvedCustomerId, customerError);

      // Get user email to create new Stripe customer
      if (!supabase) {
        console.error('❌ Supabase not available');
        return NextResponse.json({
          error: 'Database unavailable',
          details: 'Unable to create new customer. Please contact support.'
        }, { status: 500 });
      }

      // Try to get user email from context
      // First try using accountId/projectId if provided, otherwise look up by customer ID
      let context = null;
      if (accountId || projectId) {
        context = await resolveBillingContext(accountId || projectId);
      } else {
        // Look up user by the old customer ID
        const { resolveBillingContextByCustomerId } = await import('@/lib/billing');
        context = await resolveBillingContextByCustomerId(resolvedCustomerId);
      }

      if (!context?.userId) {
        console.error('❌ Could not resolve user context');
        return NextResponse.json({
          error: 'User not found',
          details: 'Unable to resolve user account. Please contact support.'
        }, { status: 400 });
      }

      // Get user email
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(context.userId);
      if (authError || !authUser?.user?.email) {
        console.error('❌ Could not get user email:', authError);
        return NextResponse.json({
          error: 'User email not found',
          details: 'Unable to retrieve account email. Please contact support.'
        }, { status: 400 });
      }

      // Create new Stripe customer
      console.log('🔧 Creating new Stripe customer for:', authUser.user.email);
      const newCustomer = await stripe.customers.create({
        email: authUser.user.email,
        metadata: {
          user_id: context.userId,
        }
      });

      finalCustomerId = newCustomer.id;
      console.log('✅ New Stripe customer created:', finalCustomerId);

      // Update database with new customer ID
      if (context.profile) {
        await upsertAccountBillingProfile({
          user_id: context.userId,
          stripe_customer_id: finalCustomerId,
        });
        console.log('✅ Updated account billing profile with new customer ID');
      }

      if (context.project) {
        await supabase
          .from('projects')
          .update({ stripe_customer_id: finalCustomerId })
          .eq('id', context.project.id);
        console.log('✅ Updated project with new customer ID');
      }
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: finalCustomerId,
      return_url: returnUrl || `${request.nextUrl.origin}/app/billing`,
      configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID || undefined,
    });

    console.log('✅ Portal session created successfully');
    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('❌ Portal session error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { message: errorMessage, stack: errorStack });

    return NextResponse.json({
      error: 'Failed to create portal session',
      details: errorMessage
    }, { status: 500 });
  }
}
