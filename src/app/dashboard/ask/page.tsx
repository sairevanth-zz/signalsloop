/**
 * Ask SignalsLoop Anything - Main Chat Interface
 * AI-powered chat for querying product feedback
 */

import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { AskChatInterface } from '@/components/ask/AskChatInterface';

export const metadata: Metadata = {
  title: 'Ask SignalsLoop Anything',
  description: 'AI-powered chat interface for querying your product feedback and insights',
};

interface AskPageProps {
  searchParams: Promise<{
    projectId?: string;
  }>;
}

export default async function AskPage({ searchParams }: AskPageProps) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Database Error</h1>
          <p className="text-muted-foreground">Unable to connect to database</p>
        </div>
      </div>
    );
  }

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/dashboard/ask');
  }

  // Get project ID from search params or user's first project
  const params = await searchParams;
  let projectId = params.projectId;

  if (!projectId) {
    // Get user's first project
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .single();

    if (projects) {
      projectId = projects.id;
    }
  }

  if (!projectId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">No Project Found</h1>
          <p className="text-muted-foreground">
            Please create a project first to use Ask SignalsLoop.
          </p>
        </div>
      </div>
    );
  }

  // Verify user has access to this project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, owner_id')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    notFound();
  }

  // Check if user owns this project or is a member
  if (project.owner_id !== user.id) {
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      notFound();
    }
  }

  return <AskChatInterface projectId={projectId} projectName={project.name} />;
}
