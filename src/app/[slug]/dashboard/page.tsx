/**
 * Mission Control Dashboard Page
 * AI-powered daily briefing and product health overview
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
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
  const supabase = getSupabaseServiceRoleClient();

  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
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

  // Note: Dashboard is currently publicly accessible (like roadmap page)
  // For production, implement authentication via middleware or client-side checks

  // Fetch briefing and metrics
  let briefing;
  let metrics;
  let hasError = false;
  let errorMessage = '';

  try {
    [briefing, metrics] = await Promise.all([
      getTodayBriefing(project.id),
      getDashboardMetrics(project.id),
    ]);
  } catch (error) {
    hasError = true;
    console.error('Error fetching dashboard data:', error);
    errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check if it's a missing OpenAI API key error
    const isOpenAIError = errorMessage.toLowerCase().includes('openai') ||
                          errorMessage.toLowerCase().includes('api key');

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div className="max-w-2xl w-full space-y-6">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Error Loading Dashboard</h1>
            <p className="text-slate-400 mb-4">We encountered an issue loading your Mission Control dashboard</p>
          </div>

          {/* Error details */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
            <h2 className="text-lg font-semibold text-red-400 mb-2">Error Details</h2>
            <p className="text-sm text-slate-300 font-mono">{errorMessage}</p>

            {isOpenAIError && (
              <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
                <p className="text-sm text-amber-400">
                  <strong>Missing OpenAI API Key:</strong> The Mission Control dashboard requires an OpenAI API key to generate AI briefings.
                  Please configure the <code className="bg-slate-800 px-2 py-1 rounded">OPENAI_API_KEY</code> environment variable.
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`/${slug}/board`}
              className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 text-center"
            >
              View Feedback Board Instead
            </a>
            <a
              href="/app/mission-control-help"
              className="rounded-lg border border-blue-600 bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 text-center"
            >
              Get Help & Troubleshooting
            </a>
          </div>

          {/* Debug info for developers */}
          <details className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <summary className="text-sm text-slate-400 cursor-pointer hover:text-slate-300">
              Technical Details (for developers)
            </summary>
            <div className="mt-4 space-y-2 text-xs text-slate-500 font-mono">
              <div>Project ID: {project.id}</div>
              <div>Project Slug: {slug}</div>
              <div>Timestamp: {new Date().toISOString()}</div>
              <div>Environment: {process.env.NODE_ENV}</div>
            </div>
          </details>
        </div>
      </div>
    );
  }

  // Get project owner's name for greeting
  const { data: userData } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', project.owner_id)
    .single();

  const userName = userData?.name || userData?.email?.split('@')[0] || undefined;

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
                href={`/dashboard/ask?projectId=${project.id}`}
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
