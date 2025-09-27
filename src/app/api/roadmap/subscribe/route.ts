import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function POST(request: NextRequest) {
  try {
    const { projectId, email } = await request.json();

    if (!projectId || !email) {
      return NextResponse.json(
        { error: 'Project ID and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if project exists and allows subscriptions
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, roadmap_subscribe_emails, is_private')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (!project.roadmap_subscribe_emails || project.is_private) {
      return NextResponse.json(
        { error: 'Email subscriptions not enabled for this project' },
        { status: 403 }
      );
    }

    // Generate subscription token
    const subscriptionToken = crypto.randomUUID();

    // Insert or update subscription
    const { error: subscriptionError } = await supabase
      .from('roadmap_subscriptions')
      .upsert({
        project_id: projectId,
        email: email.toLowerCase(),
        subscription_token: subscriptionToken,
        is_active: true
      }, {
        onConflict: 'project_id,email'
      });

    if (subscriptionError) {
      console.error('Subscription error:', subscriptionError);
      return NextResponse.json(
        { error: 'Failed to create subscription' },
        { status: 500 }
      );
    }

    // TODO: Send confirmation email
    // This would typically involve sending an email with the subscription token
    // for verification and unsubscribe functionality

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to roadmap updates'
    });

  } catch (error) {
    console.error('Roadmap subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Subscription token is required' },
        { status: 400 }
      );
    }

    // Deactivate subscription
    const { error } = await supabase
      .from('roadmap_subscriptions')
      .update({ is_active: false })
      .eq('subscription_token', token);

    if (error) {
      console.error('Unsubscribe error:', error);
      return NextResponse.json(
        { error: 'Failed to unsubscribe' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from roadmap updates'
    });

  } catch (error) {
    console.error('Roadmap unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
