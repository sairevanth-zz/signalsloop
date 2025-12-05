/**
 * API Route: Push Notification Preferences
 * GET/PATCH /api/notifications/preferences
 *
 * Manages notification preferences for push subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { updatePreferences } from '@/lib/notifications/web-push';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET - Retrieve notification preferences
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json(
        { error: 'endpoint is required' },
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

    // Get subscription preferences
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('preferences')
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      preferences: data.preferences,
    });
  } catch (error) {
    console.error('[Preferences API] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to get preferences' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update notification preferences
 */
export async function PATCH(request: NextRequest) {
  try {
    const { endpoint, preferences } = await request.json();

    if (!endpoint || !preferences) {
      return NextResponse.json(
        { error: 'endpoint and preferences are required' },
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

    // Update preferences
    const success = await updatePreferences(user.id, endpoint, preferences);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences updated',
    });
  } catch (error) {
    console.error('[Preferences API] PATCH Error:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
