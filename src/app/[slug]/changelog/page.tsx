import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import PublicChangelog from '@/components/PublicChangelog';
import { getSupabaseServiceRoleClient, getSupabasePublicServerClient } from '@/lib/supabase-client';

// Enable dynamic params for this route
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const runtime = 'nodejs';

interface ChangelogPageProps {
  params: Promise<{ slug: string }>;
}

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
};

const getSupabase = () =>
  getSupabaseServiceRoleClient() ?? getSupabasePublicServerClient();

async function fetchPublicChangelog(slug: string) {
  const response = await fetch(`${getBaseUrl()}/api/public/changelog/${slug}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    console.error('[ChangelogPage] Failed to load changelog via public API', {
      slug,
      status: response.status,
      body: await response.text(),
    });
    throw new Error('Failed to load changelog');
  }

  return response.json() as Promise<{
    project: { id: string; name: string; slug: string };
    releases: Array<Record<string, unknown>>;
  }>;
}

async function fetchChangelogViaSupabase(slug: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, slug')
    .eq('slug', slug)
    .single();

  if (projectError || !project) {
    console.error('[ChangelogPage] Supabase project lookup failed', {
      slug,
      error: projectError?.message || projectError,
    });
    return null;
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
    console.error('[ChangelogPage] Supabase release lookup failed', {
      slug,
      projectId: project.id,
      error: releasesError?.message || releasesError,
    });
    return null;
  }

  const normalizedReleases = (releases || []).map((release) => ({
    ...release,
    changelog_entries: release.changelog_entries || [],
    changelog_media: release.changelog_media || [],
  }));

  return { project, releases: normalizedReleases };
}

async function loadChangelog(slug: string) {
  try {
    const apiData = await fetchPublicChangelog(slug);
    if (apiData) {
      const normalizedReleases = (apiData.releases || []).map((release) => ({
        ...release,
        changelog_entries: (release as { changelog_entries?: unknown[] }).changelog_entries || [],
        changelog_media: (release as { changelog_media?: unknown[] }).changelog_media || [],
      }));
      return { project: apiData.project, releases: normalizedReleases };
    }
  } catch (error) {
    console.error('[ChangelogPage] Public API fetch failed', { slug, error });
  }

  return fetchChangelogViaSupabase(slug);
}

export async function generateMetadata({ params }: ChangelogPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await loadChangelog(slug);

    if (!data) {
      return {
        title: 'Changelog Not Found',
        description: 'The requested changelog could not be found.',
      };
    }

    return {
      title: `${data.project.name} - Changelog`,
      description: `Stay updated with the latest changes and improvements to ${data.project.name}.`,
      openGraph: {
        title: `${data.project.name} - Changelog`,
        description: `Stay updated with the latest changes and improvements to ${data.project.name}.`,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${data.project.name} - Changelog`,
        description: `Stay updated with the latest changes and improvements to ${data.project.name}.`,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Changelog',
      description: 'Stay updated with the latest changes and improvements.',
    };
  }
}

export default async function ChangelogPage({ params }: ChangelogPageProps) {
  const { slug } = await params;
  try {
    const data = await loadChangelog(slug);

    if (!data) {
      notFound();
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {data.project.name} Changelog
            </h1>
            <p className="text-lg text-gray-600">
              Stay updated with the latest changes and improvements.
            </p>
          </div>

          <PublicChangelog 
            project={data.project} 
            releases={data.releases} 
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading changelog:', error);
    notFound();
  }
}
