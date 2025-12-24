/**
 * Mission Control Dashboard Page
 * AI-powered daily briefing and product health overview
 * Redesigned to match approved mockup
 */

import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import MissionControlDashboard from '@/components/dashboard/MissionControlDashboard';

export const dynamic = 'force-dynamic';

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
  // Create Supabase client with auth support (uses cookies)
  const supabase = await createServerClient();

  // Check authentication first
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/${slug}/dashboard`);
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
    // Check if user is a team member
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
            <p className="text-slate-400">You don't have permission to view this dashboard</p>
          </div>
        </div>
      );
    }
  }

  // Get user's name for greeting
  const { data: userData } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', project.owner_id)
    .single();

  const userName = userData?.name || userData?.email?.split('@')[0] || 'there';

  // Fetch real data for dashboard

  // 1. Churn alerts - get top critical/high alert
  const { data: churnAlert } = await supabase
    .from('churn_alerts')
    .select('id, title, description, severity, customer_health:customer_health_id(name, company)')
    .eq('project_id', project.id)
    .in('severity', ['critical', 'high'])
    .eq('status', 'new')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // 2. Recent themes - get most recent emerging/high-frequency theme
  const { data: recentTheme } = await supabase
    .from('themes')
    .select('id, name, description, frequency, is_emerging')
    .eq('project_id', project.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  // 3. Recent feedback - get last 5 posts
  const { data: recentFeedback } = await supabase
    .from('posts')
    .select('id, content, author_email, created_at, sentiment')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // 4. Get overall sentiment from recent posts
  const { data: sentimentData } = await supabase
    .from('posts')
    .select('sentiment')
    .eq('project_id', project.id)
    .not('sentiment', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20);

  // Calculate average sentiment (sentiment is 0-1, where > 0.5 is positive)
  let avgSentiment = 0.5; // neutral default
  if (sentimentData && sentimentData.length > 0) {
    const sum = sentimentData.reduce((acc, p) => acc + (p.sentiment || 0.5), 0);
    avgSentiment = sum / sentimentData.length;
  }

  // 5. Outcome monitors - get most recent completed
  const { data: recentOutcome } = await supabase
    .from('outcome_monitors')
    .select('id, title, status, feature_name')
    .eq('project_id', project.id)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  // 6. Active polls - get most recent active poll with vote count
  const { data: activePollData } = await supabase
    .from('polls')
    .select('id, title, vote_count, poll_options(count)')
    .eq('project_id', project.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Prepare dashboard data
  const dashboardData = {
    churnAlert: churnAlert ? {
      title: churnAlert.title,
      description: churnAlert.description,
      customerName: (churnAlert.customer_health as any)?.company || (churnAlert.customer_health as any)?.name || 'Unknown',
      severity: churnAlert.severity as 'critical' | 'high',
    } : null,

    theme: recentTheme ? {
      name: recentTheme.name,
      description: recentTheme.description || 'New pattern detected in user feedback',
      isEmerging: recentTheme.is_emerging,
    } : null,

    outcome: recentOutcome ? {
      title: recentOutcome.title,
      featureName: recentOutcome.feature_name,
    } : null,

    activePoll: activePollData ? {
      id: activePollData.id,
      title: activePollData.title,
      voteCount: activePollData.vote_count || 0,
      optionCount: (activePollData.poll_options as any)?.length || 0,
    } : null,

    recentActivity: recentFeedback?.map(f => ({
      id: f.id,
      content: f.content?.substring(0, 80) + (f.content && f.content.length > 80 ? '...' : ''),
      authorEmail: f.author_email,
      createdAt: f.created_at,
      sentiment: f.sentiment,
    })) || [],

    sentimentScore: avgSentiment,
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1e2228' }}>
      <MissionControlDashboard
        userName={userName}
        projectSlug={project.slug}
        projectId={project.id}
        dashboardData={dashboardData}
      />
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
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="flex gap-6">
        {/* Main content skeleton */}
        <div className="flex-1">
          <div className="mb-8">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-800 mb-4" />
            <div className="h-10 w-96 animate-pulse rounded bg-slate-800 mb-2" />
            <div className="h-10 w-80 animate-pulse rounded bg-slate-800" />
          </div>

          {/* Action cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl border border-slate-800 bg-slate-900/50 animate-pulse" />
            ))}
          </div>
        </div>

        {/* Right panel skeleton */}
        <div className="w-80 flex-shrink-0">
          <div className="h-96 rounded-xl border border-slate-800 bg-slate-900/50 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
