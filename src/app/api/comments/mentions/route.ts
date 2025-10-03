import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/comments/mentions
 * Process mentions in a comment and create mention records
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { commentId, commentText, postId, projectId } = body;

    if (!commentId || !commentText || !postId || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Call the database function to process mentions
    const { data, error } = await supabase.rpc('process_comment_mentions', {
      p_comment_id: commentId,
      p_comment_text: commentText,
      p_post_id: postId,
      p_project_id: projectId
    });

    if (error) {
      console.error('Error processing mentions:', error);
      return NextResponse.json(
        { error: 'Failed to process mentions' },
        { status: 500 }
      );
    }

    // Get the created mentions
    const { data: mentions, error: mentionsError } = await supabase
      .from('comment_mentions')
      .select('*')
      .eq('comment_id', commentId);

    if (mentionsError) {
      console.error('Error fetching mentions:', mentionsError);
    }

    return NextResponse.json({
      success: true,
      mentionCount: data || 0,
      mentions: mentions || []
    });

  } catch (error) {
    console.error('Error in mentions API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/comments/mentions?commentId=xxx
 * Get mentions for a specific comment
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('comment_mentions')
      .select('*')
      .eq('comment_id', commentId);

    if (error) {
      console.error('Error fetching mentions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch mentions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mentions: data || []
    });

  } catch (error) {
    console.error('Error in mentions GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
