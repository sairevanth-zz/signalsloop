/**
 * Stakeholder Query History API
 * Fetches past queries with filtering and analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const role = searchParams.get('role');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId parameter' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query
    let query = supabase
      .from('stakeholder_queries')
      .select('id, query_text, user_role, created_at, generation_time_ms, rating, response_components, is_favorite')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply role filter if specified
    if (role && role !== 'all') {
      query = query.eq('user_role', role);
    }

    const { data: queries, error } = await query;

    if (error) throw error;

    // Transform data
    const transformedQueries = queries?.map(q => ({
      id: q.id,
      query_text: q.query_text,
      user_role: q.user_role,
      created_at: q.created_at,
      generation_time_ms: q.generation_time_ms,
      rating: q.rating,
      component_count: Array.isArray(q.response_components) ? q.response_components.length : 0,
      is_favorite: q.is_favorite || false
    })) || [];

    return NextResponse.json({
      queries: transformedQueries,
      total: transformedQueries.length
    });
  } catch (error) {
    console.error('[History API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch query history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
