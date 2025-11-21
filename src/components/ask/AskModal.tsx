'use client';

/**
 * AskModal Component
 * Cmd+K modal for quick questions about product feedback
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Command, Search, Sparkles, MessageSquare, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAskStore } from '@/lib/stores/useAskStore';

// ============================================================================
// Props Interface
// ============================================================================

export interface AskModalProps {
  projectId?: string; // Optional - will fetch user's default project if not provided
}

// ============================================================================
// Suggested Questions
// ============================================================================

const SUGGESTED_QUESTIONS = [
  'What are the top complaints this week?',
  'How is sentiment trending compared to last month?',
  'What features are customers asking for most?',
  'Show me competitor mentions',
  'What should I prioritize fixing first?',
];

// ============================================================================
// Component
// ============================================================================

export function AskModal({ projectId: providedProjectId }: AskModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<string | null>(providedProjectId || null);
  const [isLoadingProject, setIsLoadingProject] = useState(!providedProjectId);
  const [isOnAskPage, setIsOnAskPage] = useState(false);
  const router = useRouter();
  const { startNewConversation, currentProjectId, setCurrentProjectId } = useAskStore();

  // Check if we're on the Ask page
  useEffect(() => {
    setIsOnAskPage(window.location.pathname.startsWith('/dashboard/ask'));
  }, []);

  // Fetch user's default project if not provided
  useEffect(() => {
    if (providedProjectId) {
      setProjectId(providedProjectId);
      setCurrentProjectId(providedProjectId);
      setIsLoadingProject(false);
      return;
    }

    // Try to use currentProjectId from store first
    if (currentProjectId) {
      setProjectId(currentProjectId);
      setIsLoadingProject(false);
      return;
    }

    // Fetch default project
    const fetchDefaultProject = async () => {
      try {
        // Get user's first project (you may want to add an API endpoint for this)
        // For now, we'll try to extract from current URL or fetch from API
        const response = await fetch('/api/projects?limit=1');
        if (response.ok) {
          const data = await response.json();
          if (data.projects && data.projects.length > 0) {
            const defaultProjectId = data.projects[0].id;
            setProjectId(defaultProjectId);
            setCurrentProjectId(defaultProjectId);
          }
        }
      } catch (error) {
        console.error('Error fetching default project:', error);
      } finally {
        setIsLoadingProject(false);
      }
    };

    fetchDefaultProject();
  }, [providedProjectId, currentProjectId, setCurrentProjectId]);

  // Handle keyboard shortcut (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle form submission
  const handleSubmit = async (question: string) => {
    const trimmedQuery = question.trim();
    if (!trimmedQuery || !projectId) return;

    try {
      // Set project ID in store if not already set
      if (projectId && !currentProjectId) {
        setCurrentProjectId(projectId);
      }

      // Start new conversation
      const conversationId = await startNewConversation(trimmedQuery);

      // Close modal
      setIsOpen(false);
      setQuery('');

      // Navigate to conversation
      router.push(`/dashboard/ask/${conversationId}?q=${encodeURIComponent(trimmedQuery)}`);
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  // Handle suggested question click
  const handleSuggestedClick = (question: string) => {
    handleSubmit(question);
  };

  // Handle Enter key in input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(query);
    }
  };

  // Detect OS for keyboard hint
  const isMac =
    typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? '⌘' : 'Ctrl';

  // Don't render floating button if we're already on the Ask page
  if (isOnAskPage) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        size="icon"
        disabled={isLoadingProject}
        className={cn(
          'fixed bottom-6 right-6 z-40',
          'size-14 rounded-full shadow-lg',
          'bg-primary hover:bg-primary/90',
          'transition-all duration-200',
          'hover:scale-110',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        <MessageSquare className="size-6" />
      </Button>

      {/* Dialog Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="size-5 text-primary" />
              Ask SignalsLoop Anything
            </DialogTitle>
          </DialogHeader>

          {/* Search Input */}
          <div className="px-6 pt-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isLoadingProject
                    ? 'Loading...'
                    : 'Ask a question about your feedback...'
                }
                className="pl-10 pr-16 h-12 text-base"
                disabled={isLoadingProject || !projectId}
                autoFocus
              />
              <kbd
                className={cn(
                  'absolute right-3 top-1/2 -translate-y-1/2',
                  'px-2 py-1 text-xs font-mono',
                  'bg-muted border border-border rounded',
                  'text-muted-foreground'
                )}
              >
                Enter
              </kbd>
            </div>
          </div>

          {/* Suggested Questions */}
          <div className="px-6 py-4">
            <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
              <Sparkles className="size-4" />
              <span>Suggested questions</span>
            </div>

            <div className="space-y-1">
              {SUGGESTED_QUESTIONS.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedClick(question)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  disabled={isLoadingProject || !projectId}
                  className={cn(
                    'w-full flex items-center justify-between',
                    'px-4 py-3 rounded-lg',
                    'text-left text-sm',
                    'transition-all duration-150',
                    'hover:bg-muted/50',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'group'
                  )}
                >
                  <span className="text-foreground">{question}</span>
                  <ArrowRight
                    className={cn(
                      'size-4 text-muted-foreground transition-all duration-150',
                      hoveredIndex === index && 'translate-x-1 text-primary'
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Footer with Keyboard Hint */}
          <div className="px-6 py-4 border-t bg-muted/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <kbd className="px-2 py-1 font-mono bg-background border border-border rounded">
                {modifierKey}
              </kbd>
              <kbd className="px-2 py-1 font-mono bg-background border border-border rounded">
                K
              </kbd>
              <span>Press {modifierKey}+K anytime to open</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
