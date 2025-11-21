/**
 * Generate Spec from Feedback Component
 * Allows users to create specs from selected feedback items
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Sparkles, X, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface FeedbackItem {
  id: string;
  title: string;
  vote_count?: number;
  category?: string;
}

interface GenerateSpecFromFeedbackProps {
  selectedFeedback: FeedbackItem[];
  projectSlug: string;
  onClear?: () => void;
}

export function GenerateSpecFromFeedback({
  selectedFeedback,
  projectSlug,
  onClear,
}: GenerateSpecFromFeedbackProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const totalVotes = selectedFeedback.reduce(
    (sum, item) => sum + (item.vote_count || 0),
    0
  );

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      // Store selected feedback IDs in sessionStorage for the wizard to pick up
      sessionStorage.setItem(
        'spec_wizard_feedback',
        JSON.stringify(selectedFeedback.map((f) => f.id))
      );

      // Navigate to the new spec page
      router.push(`/${projectSlug}/specs/new?from=feedback`);
    } catch (error) {
      console.error('Error navigating to spec wizard:', error);
      toast.error('Failed to start spec generation');
      setIsGenerating(false);
    }
  };

  if (selectedFeedback.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Spec from {selectedFeedback.length} Selected
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Sparkles className="h-5 w-5 text-purple-500 mr-2" />
            Generate Spec from Feedback
          </DialogTitle>
          <DialogDescription>
            AI will analyze the selected feedback and generate a comprehensive PRD
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Selected Feedback</span>
              <Badge variant="secondary">{selectedFeedback.length} items</Badge>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total votes: <span className="font-medium">{totalVotes}</span>
            </div>
          </div>

          {/* Selected Items */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {selectedFeedback.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between p-3 border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.title}</div>
                  <div className="flex items-center space-x-2 mt-1">
                    {item.vote_count !== undefined && (
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        👍 {item.vote_count}
                      </span>
                    )}
                    {item.category && (
                      <Badge variant="outline" className="text-xs">
                        {item.category}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* What will happen */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">What happens next?</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li className="flex items-start">
                <span className="mr-2">1.</span>
                <span>AI analyzes all selected feedback items</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">2.</span>
                <span>Synthesizes common themes and user needs</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">3.</span>
                <span>Generates a comprehensive PRD in 30-60 seconds</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">4.</span>
                <span>Links all feedback to the spec for traceability</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Spec
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Floating action button version for boards
interface SpecWriterFloatingButtonProps {
  selectedCount: number;
  onClick: () => void;
}

export function SpecWriterFloatingButton({
  selectedCount,
  onClick,
}: SpecWriterFloatingButtonProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={onClick}
        size="lg"
        className="bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl transition-all"
      >
        <Sparkles className="h-5 w-5 mr-2" />
        Generate Spec ({selectedCount})
      </Button>
    </div>
  );
}
