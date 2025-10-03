import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Get the authenticated admin user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: admin }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { commentId, projectId } = await request.json();

    if (!commentId || !projectId) {
      return NextResponse.json({ error: 'Missing commentId or projectId' }, { status: 400 });
    }

    // Verify admin owns this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.owner_id !== admin.id) {
      return NextResponse.json({ error: 'Not authorized for this project' }, { status: 403 });
    }

    // Get the comment to find the post ID for updating comment count
    const { data: comment, error: commentFetchError } = await supabase
      .from('comments')
      .select('post_id')
      .eq('id', commentId)
      .single();

    if (commentFetchError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // First, delete all nested replies (comments with this comment as parent)
    const { error: deleteRepliesError } = await supabase
      .from('comments')
      .delete()
      .eq('parent_id', commentId);

    if (deleteRepliesError) {
      console.error('Error deleting replies:', deleteRepliesError);
      // Continue anyway - we'll still try to delete the parent comment
    }

    // Then delete the parent comment
    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      console.error('Error deleting comment:', deleteError);
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }

    // Update comment count on the post
    try {
      const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', comment.post_id);

      await supabase
        .from('posts')
        .update({ comment_count: count || 0 })
        .eq('id', comment.post_id);
    } catch (error) {
      console.error('Error updating comment count:', error);
      // Don't fail the request if count update fails
    }

    return NextResponse.json({ success: true, message: 'Comment deleted successfully' });

  } catch (error) {
    console.error('Delete comment API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
