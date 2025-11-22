/**
 * Ask SignalsLoop Anything - Main Chat Interface
 * AI-powered chat for querying product feedback
 */

'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-client';
import { AskChatInterface } from '@/components/ask/AskChatInterface';
import { Loader2 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  owner_id: string;
}

function AskPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Memoize the projectId to prevent unnecessary re-renders
  const projectIdParam = React.useMemo(() => searchParams.get('projectId'), [searchParams]);

  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const supabase = getSupabaseClient();

  useEffect(() => {
    // Only run once
    if (hasRun || !supabase) return;
    setHasRun(true);

    const checkAuthAndLoadProject = async () => {
      try {
        // Check authentication
        const { data: { session }, error: authError } = await supabase.auth.getSession();

        if (authError || !session) {
          console.log('No session, redirecting to login');
          router.push('/login?next=/dashboard/ask');
          return;
        }

        setAuthChecking(false);

        // Get project ID from search params or user's first project
        let projectId = projectIdParam;

        if (!projectId) {
          // Get user's first project
          const { data: projects, error: projectsError } = await supabase
            .from('projects')
            .select('id')
            .eq('owner_id', session.user.id)
            .limit(1)
            .single();

          if (projectsError || !projects) {
            setError('No project found. Please create a project first.');
            setLoading(false);
            return;
          }

          projectId = projects.id;
        }

        // Verify user has access to this project
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, name, owner_id')
          .eq('id', projectId)
          .single();

        if (projectError || !projectData) {
          setError('Project not found');
          setLoading(false);
          return;
        }

        // Check if user owns this project or is a member
        if (projectData.owner_id !== session.user.id) {
          const { data: member } = await supabase
            .from('members')
            .select('id')
            .eq('project_id', projectId)
            .eq('user_id', session.user.id)
            .single();

          if (!member) {
            setError('You do not have access to this project');
            setLoading(false);
            return;
          }
        }

        setProject(projectData);
        setLoading(false);
      } catch (err) {
        console.error('Error loading Ask page:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    checkAuthAndLoadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRun]);

  // Loading state while checking auth
  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Loading state while fetching data
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Ask SignalsLoop...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-2">Error Loading Ask SignalsLoop</h1>
            <p className="text-muted-foreground mb-4">{error || 'Failed to load Ask interface'}</p>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => router.push('/app')}
              className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700"
            >
              Go to Projects
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg border border-blue-600 bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state - render chat interface
  return <AskChatInterface projectId={project.id} projectName={project.name} />;
}

export default function AskPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Ask SignalsLoop...</p>
        </div>
      </div>
    }>
      <AskErrorBoundary>
        <AskPageContent />
      </AskErrorBoundary>
    </Suspense>
  );
}

class AskErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; message?: string; stack?: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: undefined, stack: undefined };
  }

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Something went wrong while loading Ask.',
    };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('Ask page error boundary:', error, info);
    this.setState({
      stack: info && typeof info === 'object' && 'componentStack' in info ? (info as { componentStack?: string }).componentStack : undefined,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4 text-center">
            <div className="text-lg font-semibold text-white">Ask SignalsLoop ran into a problem</div>
            <p className="text-sm text-muted-foreground">
              {this.state.message || 'Please refresh the page or try again in a moment.'}
            </p>
            {this.state.stack && (
              <pre className="text-left text-xs text-muted-foreground bg-muted/40 p-3 rounded max-h-48 overflow-auto">
                {this.state.stack}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                onClick={() => window.location.reload()}
              >
                Refresh
              </button>
              <button
                className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                onClick={() => (window.location.href = '/app')}
              >
                Back to Projects
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
