/**
 * Project Outcomes Page
 *
 * Feature outcomes dashboard for a specific project (via slug).
 */

import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createServerClient } from '@/lib/supabase-client';
import { OutcomesDashboard } from '@/components/outcomes';

export const dynamic = 'force-dynamic';

interface OutcomesPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: OutcomesPageProps): Promise<Metadata> {
  const { slug } = await params;

  return {
    title: `${slug} - Feature Outcomes`,
    description: 'Track what happens after you ship features.',
  };
}

async function OutcomesContent({ slug }: { slug: string }) {
  const supabase = await createServerClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/${slug}/outcomes`);
  }

  // Get project by slug
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, slug, owner_id')
    .eq('slug', slug)
    .single();

  if (projectError || !project) {
    notFound();
  }

  // Verify user has access to this project
  if (project.owner_id !== user.id) {
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('project_id', project.id)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Access Denied</h1>
            <p className="text-slate-400">You don't have permission to view this page</p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <OutcomesDashboard projectId={project.id} projectSlug={project.slug} />
      </div>
    </div>
  );
}

export default async function OutcomesPage({ params }: OutcomesPageProps) {
  const { slug } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-gray-600">Loading outcomes...</p>
          </div>
        </div>
      }
    >
      <OutcomesContent slug={slug} />
    </Suspense>
  );
}
