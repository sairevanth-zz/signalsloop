import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient, getSupabasePublicServerClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const getSupabase = () =>
  getSupabaseServiceRoleClient() ?? getSupabasePublicServerClient();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; releaseSlug: string }> }
) {
  const { slug, releaseSlug } = await params;
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

  const { data: release, error: releaseError } = await supabase
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
    .eq('project_id', project.id)
    .eq('slug', releaseSlug)
    .eq('is_published', true)
    .single();

  if (releaseError || !release) {
    console.error('[API /api/public/changelog/[slug]/[releaseSlug]] Release not found', {
      slug,
      releaseSlug,
      projectId: project.id,
      error: releaseError?.message || releaseError,
    });
    return NextResponse.json({
      error: 'Release not found',
      details: {
        slug,
        releaseSlug,
        projectId: project.id,
        errorMessage: releaseError?.message
      }
    }, { status: 404 });
  }

  return NextResponse.json({
    project,
    release: {
      ...release,
      changelog_entries: release.changelog_entries || [],
      changelog_media: release.changelog_media || [],
      changelog_feedback_links: release.changelog_feedback_links || [],
    },
  });
}
