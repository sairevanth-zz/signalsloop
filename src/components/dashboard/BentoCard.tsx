/**
 * BentoCard - Reusable card wrapper for the Bento Grid layout
 * Provides consistent styling, hover effects, and glassmorphism
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  colSpan?: 1 | 2 | 3;
  rowSpan?: 1 | 2 | 3;
}

export function BentoCard({
  children,
  className,
  hover = true,
  colSpan = 1,
  rowSpan = 1,
  ...props
}: BentoCardProps) {
  return (
    <div
      className={cn(
        // Base styles - dark glassmorphism
        'relative rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm p-6',
        // Hover effect
        hover && 'transition-all duration-200 hover:border-slate-700 hover:bg-slate-900/70 hover:shadow-lg hover:shadow-slate-900/50',
        // Grid span classes
        colSpan === 2 && 'col-span-2',
        colSpan === 3 && 'col-span-3',
        rowSpan === 2 && 'row-span-2',
        rowSpan === 3 && 'row-span-3',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
