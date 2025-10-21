import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient, getSupabasePublicServerClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const getSupabase = () =>
  getSupabaseServiceRoleClient() ?? getSupabasePublicServerClient();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const slug = searchParams.get('slug') || 'wdsds';

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

  // Get all releases (including unpublished for debugging)
  const { data: releases, error: releasesError } = await supabase
    .from('changelog_releases')
    .select('id, title, slug, is_published, published_at, release_type, version')
    .eq('project_id', project.id)
    .order('published_at', { ascending: false });

  if (releasesError) {
    return NextResponse.json({
      error: 'Failed to fetch releases',
      releasesError: releasesError.message,
      project
    }, { status: 500 });
  }

  return NextResponse.json({
    project,
    releases: releases || [],
    totalReleases: releases?.length || 0,
    publishedReleases: releases?.filter(r => r.is_published).length || 0,
  });
}
