'use client';

/**
 * AskConversationView Component
 * View for existing conversation with messages
 */

import React, { useEffect, useRef } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { ConversationSidebar } from './ConversationSidebar';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useAskStore,
  useMessagesWithStreaming,
  useHasActiveConversation,
} from '@/stores/ask-store';

// ============================================================================
// Props Interface
// ============================================================================

export interface AskConversationViewProps {
  conversationId: string;
  projectId: string;
  projectName: string;
  initialQuery?: string; // From AskModal navigation
}

// ============================================================================
// Component
// ============================================================================

export function AskConversationView({
  conversationId,
  projectId,
  projectName,
  initialQuery,
}: AskConversationViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasSubmittedInitialQuery = useRef(false);

  const {
    setCurrentProjectId,
    loadConversation,
    sendMessage,
    isStreaming,
    currentConversation,
  } = useAskStore();

  const messages = useMessagesWithStreaming();
  const hasActiveConversation = useHasActiveConversation();

  // Initialize on mount
  useEffect(() => {
    setCurrentProjectId(projectId);
    loadConversation(conversationId);
  }, [conversationId, projectId, setCurrentProjectId, loadConversation]);

  // Submit initial query if provided (from AskModal)
  useEffect(() => {
    if (
      initialQuery &&
      !hasSubmittedInitialQuery.current &&
      hasActiveConversation &&
      !isStreaming
    ) {
      hasSubmittedInitialQuery.current = true;
      sendMessage(initialQuery);
    }
  }, [initialQuery, hasActiveConversation, isStreaming, sendMessage]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle follow-up message
  const handleSendMessage = async (query: string) => {
    try {
      await sendMessage(query);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Handle source click
  const handleSourceClick = (source: any) => {
    console.log('Source clicked:', source);
    // TODO: Navigate to source or show modal
  };

  // Handle feedback
  const handleFeedback = async (messageId: string, feedback: 'positive' | 'negative') => {
    const { submitFeedback } = useAskStore.getState();
    try {
      const rating = feedback === 'positive' ? 5 : 1;
      await submitFeedback(messageId, rating);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Conversation Sidebar */}
      <div className="w-64 flex-shrink-0 border-r">
        <ConversationSidebar projectId={projectId} />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b bg-card">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Link href="/app">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="size-4" />
                  Back to Projects
                </Button>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                <h1 className="text-lg font-semibold truncate">
                  {currentConversation?.title || 'New conversation'}
                </h1>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {projectName}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !isStreaming ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading conversation...</p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isStreaming={message.id === 'streaming' && isStreaming}
                  onSourceClick={handleSourceClick}
                  onFeedback={handleFeedback}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Chat Input */}
        <div className="border-t">
          <div className="max-w-4xl mx-auto">
            <ChatInput
              onSubmit={handleSendMessage}
              isLoading={isStreaming}
              placeholder="Ask a follow-up question..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
