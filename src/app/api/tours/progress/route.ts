/**
 * API Route: Tour Progress
 * GET/POST /api/tours/progress
 *
 * Syncs tour completion progress with the server
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import {
  saveTourProgressToDatabase,
  getTourProgressFromDatabase,
} from '@/lib/tours/tour-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET - Retrieve tour progress for the current user
 */
export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
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

    // Get tour progress
    const progress = await getTourProgressFromDatabase(user.id);

    return NextResponse.json({
      success: true,
      progress: progress || {},
    });
  } catch (error) {
    console.error('[Tour Progress API] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to get tour progress' },
      { status: 500 }
    );
  }
}

/**
 * POST - Save tour progress
 */
export async function POST(request: NextRequest) {
  try {
    const { progress } = await request.json();

    if (!progress || typeof progress !== 'object') {
      return NextResponse.json(
        { error: 'progress object is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
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

    // Save tour progress
    const success = await saveTourProgressToDatabase(user.id, progress);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save tour progress' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tour progress saved',
    });
  } catch (error) {
    console.error('[Tour Progress API] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to save tour progress' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Reset tour progress (for testing)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { tourId } = await request.json();

    const supabase = getSupabaseServerClient();
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

    if (tourId) {
      // Reset specific tour
      const currentProgress = await getTourProgressFromDatabase(user.id);
      if (currentProgress) {
        delete currentProgress[tourId];
        await saveTourProgressToDatabase(user.id, currentProgress);
      }
    } else {
      // Reset all tours
      await saveTourProgressToDatabase(user.id, {});
    }

    return NextResponse.json({
      success: true,
      message: tourId ? `Tour "${tourId}" reset` : 'All tours reset',
    });
  } catch (error) {
    console.error('[Tour Progress API] DELETE Error:', error);
    return NextResponse.json(
      { error: 'Failed to reset tour progress' },
      { status: 500 }
    );
  }
}
