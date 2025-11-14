/**
 * Classification Badge Component
 * Displays a feedback classification badge
 */

'use client';

import { FeedbackClassification, CLASSIFICATION_META } from '@/types/hunter';
import { cn } from '@/lib/utils';

interface ClassificationBadgeProps {
  classification: FeedbackClassification;
  size?: 'sm' | 'md' | 'lg';
  showEmoji?: boolean;
  className?: string;
}

export function ClassificationBadge({
  classification,
  size = 'md',
  showEmoji = true,
  className,
}: ClassificationBadgeProps) {
  const meta = CLASSIFICATION_META[classification];

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
  };

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
