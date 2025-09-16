'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AIInsightsPanel } from './AIInsightsPanel';
import { Sparkles } from 'lucide-react';

interface AIInsightsModalProps {
  projectSlug: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AIInsightsModal({ 
  projectSlug, 
  isOpen, 
  onClose 
}: AIInsightsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Insights for {projectSlug}
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Discover patterns and insights from your feedback data powered by AI
          </p>
        </DialogHeader>
        <div className="mt-4">
          <AIInsightsPanel projectSlug={projectSlug} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
