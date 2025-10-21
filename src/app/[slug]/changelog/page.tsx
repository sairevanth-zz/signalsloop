import { notFound } from 'next/navigation';
import { Metadata } from 'next';
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

export async function generateMetadata({ params }: ChangelogPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await fetchPublicChangelog(slug);

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
    const data = await fetchPublicChangelog(slug);

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
