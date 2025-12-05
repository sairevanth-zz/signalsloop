/**
 * API Route: Push Notification Subscription
 * POST /api/notifications/subscribe
 *
 * Saves a push subscription for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { saveSubscription, getVapidPublicKey } from '@/lib/notifications/web-push';
import type { PushSubscriptionData } from '@/lib/notifications/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { subscription, projectId } = await request.json();

    if (!subscription || !projectId) {
      return NextResponse.json(
        { error: 'subscription and projectId are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify project access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Get user agent for device tracking
    const userAgent = request.headers.get('user-agent') || undefined;

    // Save subscription
    const subscriptionData: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      expirationTime: subscription.expirationTime,
    };

    const savedSubscription = await saveSubscription(
      user.id,
      projectId,
      subscriptionData,
      userAgent
    );

    if (!savedSubscription) {
      return NextResponse.json(
        { error: 'Failed to save subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subscription: {
        id: savedSubscription.id,
        preferences: savedSubscription.preferences,
      },
    });
  } catch (error) {
    console.error('[Subscribe API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve VAPID public key
 */
export async function GET() {
  const publicKey = getVapidPublicKey();

  if (!publicKey) {
    console.error('[Subscribe API] VAPID public key not found. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY env var.');
    return NextResponse.json(
      { 
        error: 'Push notifications not configured. NEXT_PUBLIC_VAPID_PUBLIC_KEY environment variable is missing.',
        hint: 'Add NEXT_PUBLIC_VAPID_PUBLIC_KEY to your Vercel environment variables'
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    publicKey,
  });
}
