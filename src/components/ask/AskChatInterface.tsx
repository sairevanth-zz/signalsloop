'use client';

/**
 * AskChatInterface Component
 * Main chat interface with sidebar and message area
 */

import React, { useEffect, useRef } from 'react';
import { Sparkles, TrendingUp, Lightbulb, Target, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ConversationSidebar } from './ConversationSidebar';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useAskStore,
  useMessagesWithStreaming,
} from '@/stores/ask-store';
import { useMemo } from 'react';

// ============================================================================
// Props Interface
// ============================================================================

export interface AskChatInterfaceProps {
  projectId: string;
  projectName: string;
}

// ============================================================================
// Starter Questions
// ============================================================================

const STARTER_QUESTIONS = [
  {
    icon: TrendingUp,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    question: 'How is customer sentiment trending this month?',
    description: 'Analyze sentiment patterns and trends',
  },
  {
    icon: Lightbulb,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
    question: 'What features are customers asking for most?',
    description: 'Discover top feature requests',
  },
  {
    icon: Target,
    iconColor: 'text-red-600',
    iconBg: 'bg-red-100',
    question: 'What are the most urgent customer complaints?',
    description: 'Identify critical issues',
  },
];

// ============================================================================
// Component
// ============================================================================

export function AskChatInterface({ projectId, projectName }: AskChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const setCurrentProjectId = useAskStore((state) => state.setCurrentProjectId);
  const clearConversation = useAskStore((state) => state.clearConversation);
  const startNewConversation = useAskStore((state) => state.startNewConversation);
  const sendMessage = useAskStore((state) => state.sendMessage);
  const isStreaming = useAskStore((state) => state.isStreaming);
  const suggestedQuestions = useAskStore((state) => state.suggestedQuestions);

  const messages = useMessagesWithStreaming();
  const safeMessages = useMemo(
    () =>
      (messages || []).filter(
        (m) =>
          m &&
          typeof m === 'object' &&
          typeof (m as { id?: unknown }).id === 'string' &&
          'content' in m
      ),
    [messages]
  );

  // Initialize on mount
  useEffect(() => {
    setCurrentProjectId(projectId);
    clearConversation();
  }, [projectId, setCurrentProjectId, clearConversation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle new conversation
  const handleStartConversation = async (question: string) => {
    try {
      await startNewConversation(question);
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  // Handle follow-up message
  const handleSendMessage = async (query: string) => {
    try {
      await sendMessage(query);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Handle submit (works for both new and existing conversations)
  const handleSubmit = async (query: string) => {
    if (messages.length === 0) {
      await handleStartConversation(query);
    } else {
      await handleSendMessage(query);
    }
  };

  const isEmpty = messages.length === 0;

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
                <h1 className="text-lg font-semibold">Ask SignalsLoop Anything</h1>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {projectName}
            </div>
          </div>
        </div>

        {/* Chat Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {isEmpty ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="max-w-3xl w-full space-y-8">
                {/* Icon */}
                <div className="flex justify-center">
                  <div className="rounded-full bg-primary/10 p-6">
                    <Sparkles className="size-12 text-primary" />
                  </div>
                </div>

                {/* Heading */}
                <div className="text-center space-y-2">
                  <h1 className="text-4xl font-bold tracking-tight">
                    Ask SignalsLoop Anything
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Get instant insights from your product feedback using AI
                  </p>
                </div>

                {/* Starter Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {STARTER_QUESTIONS.map((starter, index) => {
                    const Icon = starter.icon;
                    return (
                      <button
                        key={index}
                        onClick={() => handleStartConversation(starter.question)}
                        disabled={isStreaming}
                        className={cn(
                          'group relative overflow-hidden rounded-lg border bg-card p-6',
                          'text-left transition-all duration-200',
                          'hover:border-primary hover:shadow-md',
                          'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        <div className="space-y-3">
                          {/* Icon */}
                          <div
                            className={cn(
                              'inline-flex rounded-lg p-3',
                              starter.iconBg
                            )}
                          >
                            <Icon className={cn('size-6', starter.iconColor)} />
                          </div>

                          {/* Question */}
                          <p className="font-medium leading-tight">
                            {starter.question}
                          </p>

                          {/* Description */}
                          <p className="text-sm text-muted-foreground">
                            {starter.description}
                          </p>
                        </div>

                        {/* Hover Effect */}
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    );
                  })}
                </div>

                {/* Chat Input */}
                <div className="mt-8">
                  <ChatInput
                    onSubmit={handleSubmit}
                    isLoading={isStreaming}
                    suggestedQuestions={suggestedQuestions}
                    placeholder="Ask a question about your feedback..."
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Chat State */
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto">
                {safeMessages.map((message) => (
                  <MessageErrorBoundary key={message.id}>
                    <ChatMessage
                      message={message as any}
                      isStreaming={message.id === 'streaming' && isStreaming}
                    />
                  </MessageErrorBoundary>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="border-t">
                <div className="max-w-4xl mx-auto">
                  <ChatInput
                    onSubmit={handleSubmit}
                    isLoading={isStreaming}
                    placeholder="Ask a follow-up question..."
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

class MessageErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; message?: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: undefined };
  }

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Message render failed',
    };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('Chat message render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="px-4 py-2 text-sm text-red-500">
          Failed to render message. {this.state.message}
        </div>
      );
    }
    return this.props.children;
  }
}
