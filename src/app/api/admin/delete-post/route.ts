import { NextResponse } from 'next/server';
import { z } from 'zod';
import { secureAPI, validateAdminAuth } from '@/lib/api-security';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';

export const DELETE = secureAPI(
  async ({ body, user }) => {
    const { postId, projectId } = body!;
    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
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

    if (project.owner_id !== user!.id) {
      return NextResponse.json({ error: 'Not authorized for this project' }, { status: 403 });
    }

    // Delete the post (this will cascade delete comments, votes, etc. if set up in DB)
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      console.error('Error deleting post:', deleteError);
      return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Post deleted successfully' });
  },
  {
    enableRateLimit: true,
    requireAuth: true,
    authValidator: validateAdminAuth,
    bodySchema: z.object({
      postId: z.string().uuid(),
      projectId: z.string().uuid(),
    }),
  }
);
