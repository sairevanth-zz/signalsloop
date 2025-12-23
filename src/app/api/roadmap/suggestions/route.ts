/**
 * Roadmap Suggestions API
 * GET /api/roadmap/suggestions
 *
 * Fetch roadmap suggestions with filtering and sorting
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * GET /api/roadmap/suggestions
 * Fetch roadmap suggestions with filters
 *
 * Query params:
 * - projectId: string (required)
 * - priorities: string[] (optional) - Filter by priority levels
 * - minScore: number (optional) - Minimum priority score
 * - search: string (optional) - Search in theme names
 * - sort: string (optional) - Sort field (priority_score, theme_name)
 * - order: 'asc' | 'desc' (optional) - Sort order
 * - limit: number (optional) - Max results
 * - offset: number (optional) - Pagination offset
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const priorities = searchParams.get('priorities')?.split(',');
    const minScore = searchParams.get('minScore') ? Number(searchParams.get('minScore')) : undefined;
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'priority_score';
    const order = searchParams.get('order') || 'desc';
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 100;
    const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : 0;

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

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Build query
    let query = supabase
      .from('roadmap_suggestions')
      .select(`
        *,
        themes (
          id,
          theme_name,
          frequency,
          avg_sentiment,
          first_seen
        )
      `, { count: 'exact' })
      .eq('project_id', projectId);

    // Apply filters
    if (priorities && priorities.length > 0) {
      query = query.in('priority_level', priorities);
    }

    if (minScore !== undefined) {
      query = query.gte('priority_score', minScore);
    }

    if (search) {
      // Search in theme names (requires join)
      query = query.ilike('themes.theme_name', `%${search}%`);
    }

    // Apply sorting
    const ascending = order === 'asc';
    if (sort === 'theme_name') {
      query = query.order('themes.theme_name', { ascending });
    } else {
      query = query.order(sort as any, { ascending });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: suggestions, error, count } = await query;

    if (error) {
      throw new Error(`Error fetching suggestions: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      suggestions: suggestions || [],
      total: count || 0,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error fetching roadmap suggestions:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
