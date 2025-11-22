/**
 * Ask SignalsLoop - Conversation Detail Page
 * View and interact with an existing conversation
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-client';
import { AskConversationView } from '@/components/ask/AskConversationView';
import { Loader2 } from 'lucide-react';

interface Conversation {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
}

interface Project {
  id: string;
  name: string;
}

function ConversationPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const conversationId = params.conversationId as string;
  const initialQuery = searchParams.get('q');

  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!supabase || !conversationId) return;

    const checkAuthAndLoadConversation = async () => {
      try {
        // Check authentication
        const { data: { session }, error: authError } = await supabase.auth.getSession();

        if (authError || !session) {
          console.log('No session, redirecting to login');
          router.push('/login?next=/dashboard/ask');
          return;
        }

        setAuthChecking(false);

        // Get conversation
        const { data: conversationData, error: conversationError } = await supabase
          .from('ask_conversations')
          .select('*')
          .eq('id', conversationId)
          .single();

        if (conversationError || !conversationData) {
          setError('Conversation not found');
          setLoading(false);
          return;
        }

        // Verify user owns this conversation
        if (conversationData.user_id !== session.user.id) {
          setError('You do not have access to this conversation');
          setLoading(false);
          return;
        }

        setConversation(conversationData);

        // Get project info
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, name')
          .eq('id', conversationData.project_id)
          .single();

        if (projectError || !projectData) {
          setError('Project not found');
          setLoading(false);
          return;
        }

        setProject(projectData);
        setLoading(false);
      } catch (err) {
        console.error('Error loading conversation:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    checkAuthAndLoadConversation();
  }, [supabase, conversationId, router]);

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
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !conversation || !project) {
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
            <h1 className="text-2xl font-bold mb-2">Error Loading Conversation</h1>
            <p className="text-muted-foreground mb-4">{error || 'Conversation not found'}</p>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => router.push('/dashboard/ask')}
              className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700"
            >
              Back to Ask SignalsLoop
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

  // Success state - render conversation view
  return (
    <AskConversationView
      conversationId={conversationId}
      projectId={project.id}
      projectName={project.name}
      initialQuery={initialQuery || undefined}
    />
  );
}

export default function ConversationPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    }>
      <ConversationPageContent />
    </Suspense>
  );
}
