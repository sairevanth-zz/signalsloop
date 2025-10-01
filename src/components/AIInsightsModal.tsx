'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AIInsightsPanel } from './AIInsightsPanel';
import { Sparkles, X } from 'lucide-react';

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-6xl h-[90vh] bg-white shadow-2xl rounded-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
                <Sparkles className="h-5 w-5 text-purple-600" />
                AI Insights for {projectSlug}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Discover patterns and insights from your feedback data powered by AI
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50">
          <div className="p-6">
            <AIInsightsPanel projectSlug={projectSlug} />
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
