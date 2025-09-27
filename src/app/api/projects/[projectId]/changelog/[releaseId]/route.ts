import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; releaseId: string }> }
) {
  try {
    const { projectId, releaseId } = await params;
    const supabase = getSupabaseServiceRoleClient();

    const { data: release, error } = await supabase
      .from('changelog_releases')
      .select(`
        *,
        changelog_entries (
          id,
          title,
          description,
          entry_type,
          priority,
          icon,
          color,
          order_index
        ),
        changelog_media (
          id,
          file_url,
          file_type,
          alt_text,
          caption,
          display_order,
          is_video,
          video_thumbnail_url
        ),
        changelog_feedback_links (
          post_id,
          posts (
            id,
            title,
            slug
          )
        )
      `)
      .eq('project_id', projectId)
      .eq('id', releaseId)
      .single();

    if (error) {
      console.error('Error fetching release:', error);
      return NextResponse.json({ error: 'Release not found' }, { status: 404 });
    }

    return NextResponse.json(release);
  } catch (error) {
    console.error('Error in GET /api/projects/[projectId]/changelog/[releaseId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; releaseId: string }> }
) {
  try {
    const { projectId, releaseId } = await params;
    const supabase = getSupabaseServiceRoleClient();
    
    const body = await request.json();
    const updateData: any = {};

    // Handle different update types
    if (body.is_published !== undefined) {
      updateData.is_published = body.is_published;
      if (body.is_published && !body.published_at) {
        updateData.published_at = new Date().toISOString();
      }
    }

    if (body.is_featured !== undefined) {
      updateData.is_featured = body.is_featured;
    }

    if (body.title !== undefined) {
      updateData.title = body.title;
    }

    if (body.content !== undefined) {
      updateData.content = body.content;
    }

    if (body.excerpt !== undefined) {
      updateData.excerpt = body.excerpt;
    }

    if (body.release_type !== undefined) {
      updateData.release_type = body.release_type;
    }

    if (body.version !== undefined) {
      updateData.version = body.version;
    }

    if (body.tags !== undefined) {
      updateData.tags = body.tags;
    }

    if (body.slug !== undefined) {
      // Check if new slug is unique
      const { data: existingRelease } = await supabase
        .from('changelog_releases')
        .select('id')
        .eq('project_id', projectId)
        .eq('slug', body.slug)
        .neq('id', releaseId)
        .single();

      if (existingRelease) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
      }

      updateData.slug = body.slug;
    }

    const { data: release, error } = await supabase
      .from('changelog_releases')
      .update(updateData)
      .eq('project_id', projectId)
      .eq('id', releaseId)
      .select()
      .single();

    if (error) {
      console.error('Error updating release:', error);
      return NextResponse.json({ error: 'Failed to update release' }, { status: 500 });
    }

    // If publishing, trigger webhooks and notifications
    if (body.is_published === true) {
      // TODO: Trigger webhooks and send notifications
      console.log('Release published, triggering notifications...');
    }

    return NextResponse.json(release);
  } catch (error) {
    console.error('Error in PATCH /api/projects/[projectId]/changelog/[releaseId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; releaseId: string }> }
) {
  try {
    const { projectId, releaseId } = await params;
    const supabase = getSupabaseServiceRoleClient();

    // Delete related data first (CASCADE should handle this, but being explicit)
    await supabase
      .from('changelog_entries')
      .delete()
      .eq('release_id', releaseId);

    await supabase
      .from('changelog_media')
      .delete()
      .eq('release_id', releaseId);

    await supabase
      .from('changelog_feedback_links')
      .delete()
      .eq('release_id', releaseId);

    // Delete the release
    const { error } = await supabase
      .from('changelog_releases')
      .delete()
      .eq('project_id', projectId)
      .eq('id', releaseId);

    if (error) {
      console.error('Error deleting release:', error);
      return NextResponse.json({ error: 'Failed to delete release' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/projects/[projectId]/changelog/[releaseId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
