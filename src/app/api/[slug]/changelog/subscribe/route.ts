import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-client';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = createClient();
    
    const body = await request.json();
    const { email, preferences = {} } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('slug', slug)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Generate subscription token
    const subscriptionToken = crypto.randomBytes(32).toString('hex');

    // Default notification preferences
    const defaultPreferences = {
      email: true,
      major: true,
      minor: true,
      patch: false,
      hotfix: true,
    };

    const notificationPreferences = { ...defaultPreferences, ...preferences };

    // Check if subscription already exists
    const { data: existingSubscription } = await supabase
      .from('changelog_subscriptions')
      .select('id, is_active')
      .eq('project_id', project.id)
      .eq('email', email)
      .single();

    if (existingSubscription) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from('changelog_subscriptions')
        .update({
          is_active: true,
          subscription_token: subscriptionToken,
          notification_preferences: notificationPreferences,
          subscribed_at: new Date().toISOString(),
        })
        .eq('id', existingSubscription.id);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Subscription updated successfully',
        token: subscriptionToken 
      });
    } else {
      // Create new subscription
      const { error: insertError } = await supabase
        .from('changelog_subscriptions')
        .insert({
          project_id: project.id,
          email,
          subscription_token: subscriptionToken,
          notification_preferences: notificationPreferences,
          is_active: true,
        });

      if (insertError) {
        console.error('Error creating subscription:', insertError);
        return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Successfully subscribed to changelog updates',
        token: subscriptionToken 
      });
    }
  } catch (error) {
    console.error('Error in subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = createClient();
    
    const body = await request.json();
    const { email, token } = body;

    if (!email || !token) {
      return NextResponse.json({ error: 'Email and token are required' }, { status: 400 });
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('slug', slug)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Deactivate subscription
    const { error: updateError } = await supabase
      .from('changelog_subscriptions')
      .update({ is_active: false })
      .eq('project_id', project.id)
      .eq('email', email)
      .eq('subscription_token', token);

    if (updateError) {
      console.error('Error unsubscribing:', updateError);
      return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully unsubscribed from changelog updates' 
    });
  } catch (error) {
    console.error('Error in unsubscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
