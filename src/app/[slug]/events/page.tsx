/**
 * Events & Debugging Page
 * Real-time event monitoring, replay, and agent health tracking
 */

import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createServerClient } from '@/lib/supabase-client';
import { EventViewer } from '@/components/events/EventViewer';
import { AgentHealthMonitor } from '@/components/events/AgentHealthMonitor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Eye, Heart } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface EventsPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: EventsPageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Events & Debugging - ${slug}`,
    description: 'Monitor events, replay failed operations, and track agent health',
  };
}

async function EventsContent({ slug }: { slug: string }) {
  const supabase = await createServerClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/${slug}/events`);
  }

  // Get project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, slug, owner_id')
    .eq('slug', slug)
    .single();

  if (projectError || !project) {
    notFound();
  }

  // Verify access
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
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <Activity className="h-8 w-8 text-blue-500" />
                Events & Debugging
              </h1>
              <p className="text-slate-400">{project.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href={`/${slug}/dashboard`}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="viewer" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 p-1">
            <TabsTrigger
              value="viewer"
              className="flex items-center gap-2 data-[state=active]:bg-blue-600"
            >
              <Eye className="h-4 w-4" />
              Event Viewer
            </TabsTrigger>
            <TabsTrigger
              value="health"
              className="flex items-center gap-2 data-[state=active]:bg-green-600"
            >
              <Heart className="h-4 w-4" />
              Agent Health
            </TabsTrigger>
          </TabsList>

          <TabsContent value="viewer" className="mt-6">
            <EventViewer projectId={project.id} />
          </TabsContent>

          <TabsContent value="health" className="mt-6">
            <AgentHealthMonitor projectId={project.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default async function EventsPage({ params }: EventsPageProps) {
  const { slug } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <EventsContent slug={slug} />
    </Suspense>
  );
}
