import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient, getSupabasePublicServerClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const getSupabase = () =>
  getSupabaseServiceRoleClient() ?? getSupabasePublicServerClient();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const slug = searchParams.get('slug') || 'wdsds';
  const releaseSlug = searchParams.get('releaseSlug') || 'new-test';

  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase client not configured' },
      { status: 500 }
    );
  }

  // Get project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, slug')
    .eq('slug', slug)
    .single();

  if (projectError || !project) {
    return NextResponse.json({
      error: 'Project not found',
      slug,
      projectError: projectError?.message
    }, { status: 404 });
  }

  // Get the specific release
  const { data: release, error: releaseError } = await supabase
    .from('changelog_releases')
    .select(`
      id,
      title,
      slug,
      content,
      excerpt,
      release_type,
      version,
      is_published,
      published_at,
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
    .eq('slug', releaseSlug)
    .eq('is_published', true)
    .single();

  if (releaseError || !release) {
    // Also check without is_published filter to see if it exists
    const { data: unpublishedRelease } = await supabase
      .from('changelog_releases')
      .select('id, title, slug, is_published')
      .eq('project_id', project.id)
      .eq('slug', releaseSlug)
      .single();

    return NextResponse.json({
      error: 'Release not found',
      slug,
      releaseSlug,
      projectId: project.id,
      releaseError: releaseError?.message,
      unpublishedRelease,
      debugInfo: {
        queriedProjectId: project.id,
        queriedSlug: releaseSlug,
        queriedIsPublished: true
      }
    }, { status: 404 });
  }

  return NextResponse.json({
    project,
    release,
    success: true
  });
}
