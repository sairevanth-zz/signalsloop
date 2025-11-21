/**
 * Mission Control Dashboard Page
 * AI-powered daily briefing and product health overview
 */

import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { getTodayBriefing, getDashboardMetrics } from '@/lib/ai/mission-control';
import { MissionControlGrid, MissionControlGridSkeleton } from '@/components/dashboard/MissionControlGrid';

interface DashboardPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: DashboardPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return { title: 'Dashboard Not Found' };
    }

    const { data: project } = await supabase
      .from('projects')
      .select('name, slug')
      .eq('slug', slug)
      .single();

    if (!project) {
      return {
        title: 'Dashboard Not Found',
        description: 'The requested dashboard could not be found.',
      };
    }

    const title = `${project.name} Mission Control`;
    const description = `AI-powered dashboard for ${project.name}. Daily briefings, sentiment analysis, and product intelligence.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        siteName: 'SignalsLoop',
        type: 'website',
        locale: 'en_US',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return { title: 'Dashboard' };
  }
}

async function DashboardContent({ slug }: { slug: string }) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Database Error</h1>
          <p className="text-slate-400">Unable to connect to database</p>
        </div>
      </div>
    );
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

  // Check authentication and authorization
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/${slug}/dashboard`);
  }

  // Verify user owns this project
  if (project.owner_id !== user.id) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="text-slate-400">You don't have permission to view this dashboard</p>
        </div>
      </div>
    );
  }

  // Fetch briefing and metrics
  let briefing;
  let metrics;

  try {
    [briefing, metrics] = await Promise.all([
      getTodayBriefing(project.id),
      getDashboardMetrics(project.id),
    ]);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Error Loading Dashboard</h1>
          <p className="text-slate-400">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  // Get user name from metadata or email
  const { data: userData } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', user.id)
    .single();

  const userName = userData?.name || user.user_metadata?.full_name || userData?.email?.split('@')[0] || undefined;

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Mission Control</h1>
              <p className="text-slate-400">{project.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/dashboard/ask"
                className="rounded-lg border border-purple-600/50 bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-purple-700 hover:to-blue-700 hover:shadow-lg hover:shadow-purple-500/20"
              >
                💬 Ask AI
              </a>
              <a
                href={`/${slug}/board`}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
              >
                View Feedback Board
              </a>
              <a
                href={`/${slug}/roadmap`}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
              >
                View Roadmap
              </a>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <MissionControlGrid
          briefing={briefing.content}
          metrics={metrics}
          userName={userName}
          projectId={project.id}
        />
      </div>
    </div>
  );
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { slug } = await params;

  return (
    <Suspense fallback={<DashboardLoadingState />}>
      <DashboardContent slug={slug} />
    </Suspense>
  );
}

function DashboardLoadingState() {
  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 w-64 animate-pulse rounded bg-slate-800" />
              <div className="h-4 w-32 animate-pulse rounded bg-slate-800" />
            </div>
            <div className="flex gap-4">
              <div className="h-10 w-40 animate-pulse rounded-lg bg-slate-800" />
              <div className="h-10 w-32 animate-pulse rounded-lg bg-slate-800" />
            </div>
          </div>
        </div>

        {/* Grid skeleton */}
        <MissionControlGridSkeleton />
      </div>
    </div>
  );
}
