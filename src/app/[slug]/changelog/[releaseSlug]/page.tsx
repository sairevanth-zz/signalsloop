import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import PublicChangelogRelease from '@/components/PublicChangelogRelease';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const runtime = 'nodejs';

interface ReleasePageProps {
  params: Promise<{ slug: string; releaseSlug: string }>;
}

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
};

async function fetchPublicRelease(slug: string, releaseSlug: string) {
  const response = await fetch(`${getBaseUrl()}/api/public/changelog/${slug}/${releaseSlug}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    console.error('[ChangelogRelease] Failed to load release via public API', {
      slug,
      releaseSlug,
      status: response.status,
      body: await response.text(),
    });
    throw new Error('Failed to load release');
  }

  return response.json() as Promise<{
    project: { id: string; name: string; slug: string };
    release: Record<string, unknown>;
  }>;
}

export async function generateMetadata({ params }: ReleasePageProps): Promise<Metadata> {
  const { slug, releaseSlug } = await params;
  try {
    const data = await fetchPublicRelease(slug, releaseSlug);

    if (!data) {
      return {
        title: 'Release Not Found',
        description: 'The requested release could not be found.',
      };
    }

    const release = data.release as { title?: string; excerpt?: string; published_at?: string; version?: string };
    const description = release.excerpt || `Check out the latest updates in ${release.title}`;

    return {
      title: `${release.title} - ${data.project.name}`,
      description,
      openGraph: {
        title: `${release.title} - ${data.project.name}`,
        description,
        type: 'article',
        publishedTime: release.published_at || undefined,
        authors: [data.project.name],
        tags: release.version ? [release.version] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${release.title} - ${data.project.name}`,
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
  try {
    const data = await fetchPublicRelease(slug, releaseSlug);

    if (!data) {
      notFound();
    }

    const normalizedRelease = {
      ...data.release,
      projects: data.project,
      changelog_entries: (data.release as { changelog_entries?: unknown[] }).changelog_entries || [],
      changelog_media: (data.release as { changelog_media?: unknown[] }).changelog_media || [],
      changelog_feedback_links: (data.release as { changelog_feedback_links?: unknown[] }).changelog_feedback_links || [],
    };

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

          <PublicChangelogRelease release={normalizedRelease} />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading release:', error);
    notFound();
  }
}
