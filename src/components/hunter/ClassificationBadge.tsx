/**
 * Classification Badge Component
 * Displays a feedback classification badge
 */

'use client';

import { FeedbackClassification, CLASSIFICATION_META } from '@/types/hunter';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ClassificationBadgeProps {
  classification: FeedbackClassification | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showEmoji?: boolean;
  className?: string;
  isProcessing?: boolean;
}

export function ClassificationBadge({
  classification,
  size = 'md',
  showEmoji = true,
  className,
  isProcessing = false,
}: ClassificationBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const colorClasses = {
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  };

  // Show processing state if no classification yet
  if (!classification || isProcessing) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full font-medium',
          sizeClasses[size],
          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
          className
        )}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Processing...</span>
      </span>
    );
  }

  const meta = CLASSIFICATION_META[classification];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        sizeClasses[size],
        colorClasses[meta.color as keyof typeof colorClasses],
        className
      )}
    >
      {showEmoji && <span>{meta.emoji}</span>}
      <span>{meta.label}</span>
    </span>
  );
}
