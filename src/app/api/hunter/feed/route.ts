/**
 * Hunter Feed API
 * Get discovered feedback with filtering and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { FeedbackFeedResponse } from '@/types/hunter';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET /api/hunter/feed
 * Get discovered feedback feed with filters
 */
export async function GET(request: NextRequest) {
  try {
    // Use createServerClient for auth (reads cookies)
    const supabaseAuth = await createServerClient();

    // Check authentication
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use service role client for database operations
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database connection error' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const platform = searchParams.get('platform');
    const classification = searchParams.get('classification');
    const urgency = searchParams.get('urgency');
    const sentimentMin = searchParams.get('sentimentMin');
    const sentimentMax = searchParams.get('sentimentMax');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Verify user owns the project
    const { data: project } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .single();

    if (!project || project.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Build query
    let query = supabase
      .from('discovered_feedback')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId)
      .eq('is_duplicate', false)
      .eq('is_archived', false);

    // Apply filters
    if (platform) {
      query = query.eq('platform', platform);
    }

    if (classification) {
      query = query.eq('classification', classification);
    }

    if (urgency) {
      query = query.eq('urgency_score', parseInt(urgency));
    }

    if (sentimentMin) {
      query = query.gte('sentiment_score', parseFloat(sentimentMin));
    }

    if (sentimentMax) {
      query = query.lte('sentiment_score', parseFloat(sentimentMax));
    }

    if (dateFrom) {
      query = query.gte('discovered_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('discovered_at', dateTo);
    }

    // Apply pagination and ordering
    query = query
      .order('discovered_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: items, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json<FeedbackFeedResponse>({
      success: true,
      items: items || [],
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (error) {
    console.error('[Hunter Feed] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch feedback feed',
      },
      { status: 500 }
    );
  }
}
