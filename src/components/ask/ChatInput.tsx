'use client';

/**
 * ChatInput Component
 * Auto-resizing message input with suggested questions and keyboard shortcuts
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { VoiceInputButton } from './VoiceInputButton';

// ============================================================================
// Props Interface
// ============================================================================

export interface ChatInputProps {
  onSubmit: (message: string) => Promise<void>;
  isLoading?: boolean;
  suggestedQuestions?: string[];
  placeholder?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ChatInput({
  onSubmit,
  isLoading = false,
  suggestedQuestions = [],
  placeholder = 'Ask anything about your feedback...',
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get proper scrollHeight
    textarea.style.height = 'auto';

    // Set height to scrollHeight, but cap at 200px
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${newHeight}px`;
  }, [input]);

  // Handle form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading || isSending) return;

    setIsSending(true);

    try {
      await onSubmit(trimmedInput);
      setInput(''); // Clear input on success
    } catch (error) {
      console.error('Error submitting message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // Allow Shift+Enter for new line (default behavior)
  };

  // Handle suggested question click
  const handleSuggestedQuestion = async (question: string) => {
    if (isLoading || isSending) return;

    setInput(question);
    setIsSending(true);

    try {
      await onSubmit(question);
      setInput(''); // Clear input on success
    } catch (error) {
      console.error('Error submitting suggested question:', error);
      setInput(question); // Restore question on error
    } finally {
      setIsSending(false);
    }
  };

  // Handle voice transcription
  const handleVoiceTranscription = (transcription: string) => {
    setInput(transcription);
    // Focus textarea after transcription
    textareaRef.current?.focus();
  };

  const isDisabled = isLoading || isSending;

  return (
    <div className="border-t bg-background">
      {/* Suggested Questions */}
      {suggestedQuestions.length > 0 && !isLoading && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="size-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Suggested questions
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedQuestion(question)}
                disabled={isDisabled}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm',
                  'bg-muted hover:bg-muted/80 text-foreground',
                  'border border-border',
                  'transition-colors duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'hover:border-primary/50'
                )}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="px-4 py-4">
        <div className="flex gap-2 items-end">
          {/* Textarea */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isDisabled}
              className={cn(
                'min-h-[44px] max-h-[200px] resize-none pr-12',
                'focus-visible:ring-1 focus-visible:ring-offset-0',
                'transition-all duration-200'
              )}
              rows={1}
            />
          </div>

          {/* Voice Input Button */}
          <VoiceInputButton
            onTranscriptionComplete={handleVoiceTranscription}
            disabled={isDisabled}
            maxDurationSeconds={120}
            className="h-[44px] w-[44px]"
          />

          {/* Send Button */}
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isDisabled}
            className={cn(
              'h-[44px] w-[44px] flex-shrink-0',
              'transition-all duration-200',
              isDisabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isSending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>

        {/* Hint Text */}
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Press Enter to send, Shift+Enter for new line</span>
          {input.length > 0 && (
            <span className={cn(input.length > 4000 && 'text-destructive')}>
              {input.length} / 4000
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
