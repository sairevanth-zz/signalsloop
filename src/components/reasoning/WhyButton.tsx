'use client';

/**
 * Why Button Component
 * Feature F: Gen 3
 * 
 * A button that opens the ReasoningDrawer to show AI reasoning
 * Add this to any AI-powered component to provide transparency
 */

import React, { useState } from 'react';
import { HelpCircle, Brain, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ReasoningDrawer } from './ReasoningDrawer';
import { ReasoningFeature, WhyButtonProps } from '@/types/reasoning';
import { cn } from '@/lib/utils';

export function WhyButton({
  entityType,
  entityId,
  feature,
  size = 'sm',
  variant = 'ghost',
  className,
}: WhyButtonProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const sizeClasses = {
    sm: 'h-6 px-2 text-xs gap-1',
    md: 'h-8 px-3 text-sm gap-1.5',
    lg: 'h-10 px-4 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              className={cn(
                sizeClasses[size],
                'text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/30',
                className
              )}
              onClick={() => setIsDrawerOpen(true)}
            >
              <Brain className={iconSizes[size]} />
              <span>Why?</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>See AI reasoning behind this decision</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ReasoningDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        entityType={entityType}
        entityId={entityId}
        feature={feature}
      />
    </>
  );
}

/**
 * Inline Why Link
 * A more subtle, inline version for use in text
 */
export function WhyLink({
  entityType,
  entityId,
  feature,
  children,
  className,
}: WhyButtonProps & { children?: React.ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsDrawerOpen(true)}
        className={cn(
          'inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 underline decoration-dotted underline-offset-2 cursor-pointer',
          className
        )}
      >
        {children || 'Why?'}
        <HelpCircle className="w-3 h-3" />
      </button>

      <ReasoningDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        entityType={entityType}
        entityId={entityId}
        feature={feature}
      />
    </>
  );
}

/**
 * Why Badge
 * A badge-style button for compact layouts
 */
export function WhyBadge({
  entityType,
  entityId,
  feature,
  className,
}: WhyButtonProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsDrawerOpen(true)}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 transition-colors',
          className
        )}
      >
        <Sparkles className="w-3 h-3" />
        AI Explained
      </button>

      <ReasoningDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        entityType={entityType}
        entityId={entityId}
        feature={feature}
      />
    </>
  );
}

export default WhyButton;
