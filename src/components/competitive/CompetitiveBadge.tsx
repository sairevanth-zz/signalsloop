'use client';

import { Badge } from '@/components/ui/badge';
import { Target } from 'lucide-react';

interface CompetitiveBadgeProps {
  competitorNames: string[];
  mentionCount?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CompetitiveBadge({
  competitorNames,
  mentionCount,
  size = 'sm',
  className = '',
}: CompetitiveBadgeProps) {
  if (competitorNames.length === 0) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const displayText =
    competitorNames.length === 1
      ? competitorNames[0]
      : `${competitorNames[0]} +${competitorNames.length - 1}`;

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1 bg-purple-50 text-purple-700 border-purple-200 ${sizeClasses[size]} ${className}`}
    >
      <Target className={`${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'}`} />
      <span>{displayText}</span>
      {mentionCount && mentionCount > 1 && (
        <span className="ml-1 text-purple-500">({mentionCount})</span>
      )}
    </Badge>
  );
}
