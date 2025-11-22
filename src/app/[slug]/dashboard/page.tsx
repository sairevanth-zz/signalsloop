/**
 * Mission Control Dashboard Page
 * AI-powered daily briefing and product health overview
 * Auth-protected client component
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-client';
import { MissionControlGrid, MissionControlGridSkeleton } from '@/components/dashboard/MissionControlGrid';
import type { DailyBriefingContent, DashboardMetrics } from '@/lib/ai/mission-control';
import { Loader2 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
}

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [briefing, setBriefing] = useState<DailyBriefingContent | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseClient();

  // Check authentication and load data
  useEffect(() => {
    if (!supabase || !slug) return;

    const checkAuthAndLoadData = async () => {
      try {
        // Check authentication
        const { data: { session }, error: authError } = await supabase.auth.getSession();

        if (authError || !session) {
          console.log('No session, redirecting to login');
          router.push(`/login?next=/${slug}/dashboard`);
          return;
        }

        setAuthChecking(false);

        // Load project data
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, name, slug, owner_id')
          .eq('slug', slug)
          .single();

        if (projectError || !projectData) {
          setError('Project not found');
          setLoading(false);
          return;
        }

        setProject(projectData);

        // Check if user is owner
        const userIsOwner = projectData.owner_id === session.user.id;
        setIsOwner(userIsOwner);

        // If not owner, redirect to board (Mission Control is for owners only)
        if (!userIsOwner) {
          router.push(`/${slug}/board`);
          return;
        }

        // Load user name
        const { data: userData } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', session.user.id)
          .single();

        setUserName(userData?.name || userData?.email?.split('@')[0] || undefined);

        // Load dashboard data from API (briefing endpoint returns both briefing and metrics)
        const briefingResponse = await fetch(`/api/dashboard/briefing?projectId=${projectData.id}`);

        if (briefingResponse.ok) {
          const data = await briefingResponse.json();
          setBriefing(data.briefing?.content || null);
          setMetrics(data.metrics || null);
        } else {
          console.error('Failed to load dashboard data:', await briefingResponse.text());
          setError('Failed to load dashboard data. Please try again.');
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading dashboard:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    checkAuthAndLoadData();
  }, [supabase, slug, router]);

  // Loading state while checking auth
  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Loading state while fetching data
  if (loading) {
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

  // Error state
  if (error || !project || !briefing || !metrics) {
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
            <p className="text-sm text-slate-300 font-mono">{error || 'Failed to load dashboard data'}</p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`/${slug}/board`}
              className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 text-center"
            >
              View Feedback Board Instead
            </a>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg border border-blue-600 bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 text-center"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state - render dashboard
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
          briefing={briefing}
          metrics={metrics}
          userName={userName}
          projectId={project.id}
        />
      </div>
    </div>
  );
}
