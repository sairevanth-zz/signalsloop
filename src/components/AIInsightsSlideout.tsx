'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AIInsightsPanel } from './AIInsightsPanel';
import { Sparkles, X, ChevronRight } from 'lucide-react';

interface AIInsightsSlideoutProps {
  projectSlug: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AIInsightsSlideout({ 
  projectSlug, 
  isOpen, 
  onClose 
}: AIInsightsSlideoutProps) {
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

  const slideoutContent = (
    <div className="fixed inset-0 z-[9999] flex">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Slideout Panel */}
      <div 
        className={`
          relative ml-auto w-full md:w-[800px] lg:w-[900px] h-full bg-white shadow-2xl 
          flex flex-col transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
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
              className="p-2 hover:bg-white rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-600 group-hover:text-gray-800">Close</span>
                <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-gray-800" />
              </div>
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

  return createPortal(slideoutContent, document.body);
}

