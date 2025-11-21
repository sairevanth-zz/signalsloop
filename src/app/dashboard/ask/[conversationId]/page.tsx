/**
 * Ask SignalsLoop - Conversation Detail Page
 * View and interact with an existing conversation
 */

import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { AskConversationView } from '@/components/ask/AskConversationView';

interface ConversationPageProps {
  params: Promise<{
    conversationId: string;
  }>;
  searchParams: Promise<{
    q?: string; // Initial query from AskModal
  }>;
}

export async function generateMetadata({ params }: ConversationPageProps): Promise<Metadata> {
  const { conversationId } = await params;

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { title: 'Conversation' };
  }

  try {
    const { data: conversation } = await supabase
      .from('ask_conversations')
      .select('title')
      .eq('id', conversationId)
      .single();

    return {
      title: conversation?.title || 'Ask SignalsLoop Conversation',
      description: 'AI-powered conversation about your product feedback',
    };
  } catch (error) {
    return { title: 'Conversation' };
  }
}

export default async function ConversationPage({
  params,
  searchParams,
}: ConversationPageProps) {
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

  const { conversationId } = await params;
  const search = await searchParams;

  // Get conversation
  const { data: conversation, error: conversationError } = await supabase
    .from('ask_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (conversationError || !conversation) {
    notFound();
  }

  // Verify user owns this conversation
  if (conversation.user_id !== user.id) {
    notFound();
  }

  // Get project info
  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', conversation.project_id)
    .single();

  if (!project) {
    notFound();
  }

  return (
    <AskConversationView
      conversationId={conversationId}
      projectId={project.id}
      projectName={project.name}
      initialQuery={search.q}
    />
  );
}
