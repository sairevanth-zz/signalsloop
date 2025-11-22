'use client';

/**
 * ChatMessage Component
 * Displays a single chat message with avatar, content, sources, and actions
 */

import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  User,
  Bot,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Message, MessageSource } from '@/types/ask';

// ============================================================================
// Props Interface
// ============================================================================

export interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  onSourceClick?: (source: MessageSource) => void;
  onFeedback?: (messageId: string, feedback: 'positive' | 'negative') => void;
}

// ============================================================================
// Component
// ============================================================================

export function ChatMessage({
  message,
  isStreaming = false,
  onSourceClick,
  onFeedback,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // Normalize content to a safe string to prevent React rendering errors if APIs return objects/arrays
  const safeContent = useMemo(() => {
    if (typeof message.content === 'string') return message.content;
    try {
      return JSON.stringify(message.content);
    } catch {
      return String(message.content ?? '');
    }
  }, [message.content]);

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(safeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Handle feedback
  const handleFeedback = (feedback: 'positive' | 'negative') => {
    setFeedbackGiven(feedback);
    onFeedback?.(message.id, feedback);
  };

  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-6',
        isUser ? 'bg-background' : 'bg-muted/30'
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div
          className={cn(
            'flex items-center justify-center rounded-full size-8',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-blue-500 text-white'
          )}
        >
          {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
        </div>
      </div>

      {/* Content Container */}
      <div className="flex-1 min-w-0">
        {/* Role Label */}
        <div className="text-xs font-medium text-muted-foreground mb-2">
          {isUser ? 'You' : 'SignalsLoop AI'}
        </div>

        {/* Message Content */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown
            components={{
              // Customize link rendering
              a: (props) => (
                <a
                  {...props}
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              ),
              // Customize code blocks
              code: ({ className, children, ...props }) => {
                const isInline = !className;
                return isInline ? (
                  <code
                    className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
                    {...props}
                  >
                    {children}
                  </code>
                ) : (
                  <code
                    className={cn('block bg-muted p-4 rounded-lg overflow-x-auto', className)}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              // Customize lists
              ul: (props) => (
                <ul className="list-disc list-inside space-y-1" {...props} />
              ),
              ol: (props) => (
                <ol className="list-decimal list-inside space-y-1" {...props} />
              ),
            }}
          >
            {safeContent}
          </ReactMarkdown>

          {/* Streaming cursor */}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
          )}
        </div>

        {/* Sources */}
        {isAssistant && message.sources && message.sources.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground mr-2">Sources:</span>
            {message.sources.map((source, index) => (
              <TooltipProvider key={`${source.id}-${index}`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onSourceClick?.(source)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
                        'text-xs font-medium transition-colors',
                        'bg-blue-100 text-blue-700 hover:bg-blue-200',
                        'dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50',
                        'border border-blue-200 dark:border-blue-800'
                      )}
                    >
                      <span className="capitalize">{source.type}</span>
                      {source.similarity && (
                        <span className="text-blue-600 dark:text-blue-500">
                          {(source.similarity * 100).toFixed(0)}%
                        </span>
                      )}
                      <ExternalLink className="size-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1">
                      {source.title && (
                        <p className="font-medium">{source.title}</p>
                      )}
                      {source.preview && (
                        <p className="text-xs opacity-90">{source.preview}</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        )}

        {/* Actions */}
        {!isStreaming && isAssistant && (
          <div className="mt-4 flex items-center gap-2">
            {/* Copy Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-8 px-2"
                  >
                    {copied ? (
                      <Check className="size-4 text-green-600" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {copied ? 'Copied!' : 'Copy message'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Feedback Buttons */}
            {onFeedback && (
              <>
                <div className="w-px h-4 bg-border" />

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback('positive')}
                        disabled={feedbackGiven !== null}
                        className={cn(
                          'h-8 px-2',
                          feedbackGiven === 'positive' && 'text-green-600'
                        )}
                      >
                        <ThumbsUp className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {feedbackGiven === 'positive' ? 'Thanks for your feedback!' : 'Good response'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback('negative')}
                        disabled={feedbackGiven !== null}
                        className={cn(
                          'h-8 px-2',
                          feedbackGiven === 'negative' && 'text-red-600'
                        )}
                      >
                        <ThumbsDown className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {feedbackGiven === 'negative' ? 'Thanks for your feedback!' : 'Poor response'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
          </div>
        )}

        {/* Metadata (optional - for debugging) */}
        {process.env.NODE_ENV === 'development' && message.metadata && (
          <div className="mt-2 text-xs text-muted-foreground/50">
            {message.metadata.model && <span>Model: {message.metadata.model}</span>}
            {message.metadata.latency_ms && (
              <span className="ml-3">Latency: {message.metadata.latency_ms}ms</span>
            )}
            {message.query_type && (
              <span className="ml-3">Type: {message.query_type}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
