import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const supabase = getSupabaseServiceRoleClient();

    // Get all releases for the project (both published and draft)
    const { data: releases, error } = await supabase
      .from('changelog_releases')
      .select(`
        *,
        changelog_entries (
          id,
          title,
          description,
          entry_type,
          priority,
          order_index
        ),
        changelog_media (
          id,
          file_url,
          file_type,
          alt_text,
          caption,
          is_video
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching releases:', error);
      return NextResponse.json({ error: 'Failed to fetch releases' }, { status: 500 });
    }

    return NextResponse.json(releases);
  } catch (error) {
    console.error('Error in GET /api/projects/[projectId]/changelog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const supabase = getSupabaseServiceRoleClient();
    
    const body = await request.json();
    const {
      title,
      slug,
      content,
      excerpt,
      release_type,
      version,
      tags,
      is_featured,
      entries,
      media
    } = body;

    // Validate required fields
    if (!title || !slug || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if slug is unique
    const { data: existingRelease } = await supabase
      .from('changelog_releases')
      .select('id')
      .eq('project_id', projectId)
      .eq('slug', slug)
      .single();

    if (existingRelease) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }

    // Create the release
    const { data: release, error: releaseError } = await supabase
      .from('changelog_releases')
      .insert({
        project_id: projectId,
        title,
        slug,
        content,
        excerpt,
        release_type: release_type || 'minor',
        version,
        tags,
        is_featured: is_featured || false,
        is_published: false,
        published_at: null,
      })
      .select()
      .single();

    if (releaseError) {
      console.error('Error creating release:', releaseError);
      return NextResponse.json({ error: 'Failed to create release' }, { status: 500 });
    }

    // Create entries if provided
    if (entries && entries.length > 0) {
      const entriesWithReleaseId = entries.map((entry: any, index: number) => ({
        release_id: release.id,
        title: entry.title,
        description: entry.description,
        entry_type: entry.entry_type || 'feature',
        priority: entry.priority || 'medium',
        order_index: index,
      }));

      const { error: entriesError } = await supabase
        .from('changelog_entries')
        .insert(entriesWithReleaseId);

      if (entriesError) {
        console.error('Error creating entries:', entriesError);
        // Continue - entries are not critical for release creation
      }
    }

    // Create media if provided
    if (media && media.length > 0) {
      const mediaWithReleaseId = media.map((item: any, index: number) => ({
        release_id: release.id,
        file_url: item.file_url,
        file_type: item.file_type,
        alt_text: item.alt_text,
        caption: item.caption,
        is_video: item.is_video || false,
        video_thumbnail_url: item.video_thumbnail_url,
        display_order: index,
      }));

      const { error: mediaError } = await supabase
        .from('changelog_media')
        .insert(mediaWithReleaseId);

      if (mediaError) {
        console.error('Error creating media:', mediaError);
        // Continue - media is not critical for release creation
      }
    }

    return NextResponse.json(release, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/projects/[projectId]/changelog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
