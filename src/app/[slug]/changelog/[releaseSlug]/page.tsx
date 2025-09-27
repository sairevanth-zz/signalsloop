import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase-client';
import PublicChangelogRelease from '@/components/PublicChangelogRelease';
import Link from 'next/link';
import { ArrowLeft, Calendar, Tag } from 'lucide-react';

interface ReleasePageProps {
  params: Promise<{ slug: string; releaseSlug: string }>;
}

export async function generateMetadata({ params }: ReleasePageProps): Promise<Metadata> {
  const { slug, releaseSlug } = await params;
  const supabase = createClient();
  
  try {
    const { data: release } = await supabase
      .from('changelog_releases')
      .select(`
        title,
        excerpt,
        published_at,
        release_type,
        version,
        projects!inner (
          name,
          slug
        )
      `)
      .eq('projects.slug', slug)
      .eq('slug', releaseSlug)
      .eq('is_published', true)
      .single();

    if (!release) {
      return {
        title: 'Release Not Found',
        description: 'The requested release could not be found.',
      };
    }

    const description = release.excerpt || `Check out the latest updates in ${release.title}`;

    return {
      title: `${release.title} - ${release.projects.name}`,
      description,
      openGraph: {
        title: `${release.title} - ${release.projects.name}`,
        description,
        type: 'article',
        publishedTime: release.published_at,
        authors: [release.projects.name],
        tags: release.version ? [release.version] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${release.title} - ${release.projects.name}`,
        description,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Release',
      description: 'Check out the latest updates and improvements.',
    };
  }
}

export default async function ReleasePage({ params }: ReleasePageProps) {
  const { slug, releaseSlug } = await params;
  const supabase = createClient();

  try {
    // Get release details with all related data
    const { data: release, error: releaseError } = await supabase
      .from('changelog_releases')
      .select(`
        *,
        projects!inner (
          id,
          name,
          slug
        ),
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
      .eq('projects.slug', slug)
      .eq('slug', releaseSlug)
      .eq('is_published', true)
      .single();

    if (releaseError || !release) {
      notFound();
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <nav className="mb-8">
            <Link 
              href={`/${slug}/changelog`}
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Changelog
            </Link>
          </nav>

          <Suspense fallback={
            <div className="bg-white rounded-lg border border-gray-200 p-8 animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-8"></div>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          }>
            <PublicChangelogRelease release={release} />
          </Suspense>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading release:', error);
    notFound();
  }
}
