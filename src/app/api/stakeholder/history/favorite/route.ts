/**
 * Stakeholder Query Favorites API
 * Toggle favorite status for queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { queryId, projectId } = body;

    if (!queryId || !projectId) {
      return NextResponse.json(
        { error: 'Missing queryId or projectId parameter' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current favorite status
    const { data: currentQuery, error: fetchError } = await supabase
      .from('stakeholder_queries')
      .select('is_favorite')
      .eq('id', queryId)
      .eq('project_id', projectId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch query: ${fetchError.message}`);
    }

    if (!currentQuery) {
      return NextResponse.json(
        { error: 'Query not found' },
        { status: 404 }
      );
    }

    // Toggle favorite status
    const newFavoriteStatus = !currentQuery.is_favorite;

    const { error: updateError } = await supabase
      .from('stakeholder_queries')
      .update({ is_favorite: newFavoriteStatus })
      .eq('id', queryId)
      .eq('project_id', projectId);

    if (updateError) {
      throw new Error(`Failed to update favorite status: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      is_favorite: newFavoriteStatus
    });
  } catch (error) {
    console.error('[Favorite API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to toggle favorite status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
