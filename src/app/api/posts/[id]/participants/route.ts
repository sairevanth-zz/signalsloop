import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * GET /api/posts/[id]/participants
 * Get all participants in a post (for @ mention autocomplete)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const { id: postId } = await params;
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('search') || '';

    // Call the database function to get participants
    const { data, error } = await supabase.rpc('get_post_participants', {
      p_post_id: postId,
      p_search_term: searchTerm || null
    });

    if (error) {
      console.error('Error fetching participants:', error);
      return NextResponse.json(
        { error: 'Failed to fetch participants' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      participants: data || []
    });

  } catch (error) {
    console.error('Error in participants API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
