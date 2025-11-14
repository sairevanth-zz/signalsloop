/**
 * Platform Badge Component
 * Displays a platform badge with icon and name
 */

'use client';

import { PlatformType, PLATFORM_META } from '@/types/hunter';
import { cn } from '@/lib/utils';

interface PlatformBadgeProps {
  platform: PlatformType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showName?: boolean;
  className?: string;
}

export function PlatformBadge({
  platform,
  size = 'md',
  showIcon = true,
  showName = true,
  className,
}: PlatformBadgeProps) {
  const meta = PLATFORM_META[platform];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        sizeClasses[size],
        className
      )}
      style={{
        borderLeft: `3px solid ${meta.color}`,
      }}
    >
      {showIcon && <span className={iconSizes[size]}>{meta.icon}</span>}
      {showName && <span>{meta.name}</span>}
    </span>
  );
}
