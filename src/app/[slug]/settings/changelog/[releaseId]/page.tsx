import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseServiceRoleClient, getSupabasePublicServerClient } from '@/lib/supabase-client';
import { ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string; releaseId: string }>;
}

const getSupabase = () =>
  getSupabaseServiceRoleClient() ?? getSupabasePublicServerClient();

async function fetchRelease(slug: string, releaseId: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, slug')
    .eq('slug', slug)
    .single();

  if (projectError || !project) {
    return null;
  }

  const { data: release, error: releaseError } = await supabase
    .from('changelog_releases')
    .select(
      `
        *,
        changelog_entries (
          id,
          title,
          description,
          entry_type,
          priority,
          order_index
        )
      `
    )
    .eq('project_id', project.id)
    .eq('id', releaseId)
    .single();

  if (releaseError || !release) {
    return null;
  }

  return { project, release };
}

export default async function ReleaseDraftPage({ params }: PageProps) {
  const { slug, releaseId } = await params;
  const data = await fetchRelease(slug, releaseId);

  if (!data) {
    notFound();
  }

  const { project, release } = data;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href={`/${project.slug}/settings`}>
            <span className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to settings
            </span>
          </Link>
          <span className="text-xs uppercase tracking-wide text-gray-500">
            Draft Preview
          </span>
        </div>
        <div className="text-sm text-gray-500">
          {release.is_published ? 'Published' : 'Draft'} • {release.release_type || 'minor'}
          {release.version ? ` • v${release.version}` : ''}
        </div>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">{release.title}</h1>
      {release.excerpt && <p className="text-lg text-gray-600 mb-6">{release.excerpt}</p>}

      <div className="prose max-w-none">
        <ReactMarkdown>{release.content || ''}</ReactMarkdown>
      </div>

      {release.changelog_entries && release.changelog_entries.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-3">Entries</h2>
          <ul className="space-y-2">
            {release.changelog_entries
              .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
              .map((entry: any) => (
                <li key={entry.id} className="border rounded-md p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{entry.title}</span>
                    <span className="text-xs uppercase text-gray-500">{entry.entry_type}</span>
                  </div>
                  {entry.description && (
                    <p className="text-sm text-gray-700">{entry.description}</p>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
