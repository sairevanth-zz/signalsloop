import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient, getSupabasePublicServerClient } from '@/lib/supabase-client';

const getSupabase = () =>
  getSupabaseServiceRoleClient() ?? getSupabasePublicServerClient();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase client not configured' },
      { status: 500 }
    );
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, slug')
    .eq('slug', slug)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const { data: releases, error: releasesError } = await supabase
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
      )
    `)
    .eq('project_id', project.id)
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  if (releasesError) {
    console.error('[public changelog] failed to load releases', releasesError);
    return NextResponse.json({ error: 'Failed to load releases' }, { status: 500 });
  }

  const normalizedReleases = (releases || []).map((release) => ({
    ...release,
    changelog_entries: release.changelog_entries || [],
    changelog_media: release.changelog_media || [],
  }));

  return NextResponse.json({
    project,
    releases: normalizedReleases,
  });
}
