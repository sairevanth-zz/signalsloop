import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getSupabaseServiceRoleClient, getSupabasePublicServerClient } from '@/lib/supabase-client';
import PublicChangelog from '@/components/PublicChangelog';

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

async function fetchReleasesViaApi(projectId: string) {
  const response = await fetch(`${getBaseUrl()}/api/projects-by-id/${projectId}/changelog`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    console.error('Fallback release fetch failed', await response.text());
    return [];
  }

  return response.json();
}

export async function generateMetadata({ params }: ChangelogPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getSupabaseServiceRoleClient() ?? getSupabasePublicServerClient();
  
  try {
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('slug', slug)
      .single();

    if (!project) {
      return {
        title: 'Changelog Not Found',
        description: 'The requested changelog could not be found.',
      };
    }

    return {
      title: `${project.name} - Changelog`,
      description: `Stay updated with the latest changes and improvements to ${project.name}.`,
      openGraph: {
        title: `${project.name} - Changelog`,
        description: `Stay updated with the latest changes and improvements to ${project.name}.`,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${project.name} - Changelog`,
        description: `Stay updated with the latest changes and improvements to ${project.name}.`,
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
  const supabase = getSupabaseServiceRoleClient() ?? getSupabasePublicServerClient();

  // Check if Supabase client was initialized
  if (!supabase) {
    console.error('Supabase client not initialized for changelog page');
    notFound();
  }

  try {
    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, slug')
      .eq('slug', slug)
      .single();

    if (projectError) {
      console.error('Error fetching project:', projectError, 'for slug:', slug);
    }

    if (projectError || !project) {
      console.log('Project not found for slug:', slug);
      notFound();
    }

    // Get published changelog releases
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

    let effectiveReleases = releases || [];
    if (releasesError || !releases) {
      console.error('Error fetching releases via Supabase, using fallback:', releasesError);
      effectiveReleases = await fetchReleasesViaApi(project.id);
    }

    const normalizedReleases = (effectiveReleases || []).map((release) => ({
      ...release,
      changelog_entries: release.changelog_entries || [],
      changelog_media: release.changelog_media || [],
    }));

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {project.name} Changelog
            </h1>
            <p className="text-lg text-gray-600">
              Stay updated with the latest changes and improvements.
            </p>
          </div>

          <Suspense fallback={
            <div className="space-y-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          }>
            <PublicChangelog 
              project={project} 
              releases={normalizedReleases} 
            />
          </Suspense>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading changelog:', error);
    notFound();
  }
}
