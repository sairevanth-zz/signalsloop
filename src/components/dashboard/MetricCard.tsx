/**
 * MetricCard - Display a single metric with icon, value, and trend
 */

import React from 'react';
import { BentoCard } from './BentoCard';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon: LucideIcon;
  iconColor?: string;
  colSpan?: 1 | 2 | 3;
  rowSpan?: 1 | 2 | 3;
  badge?: React.ReactNode;
}

export function MetricCard({
  label,
  value,
  trend,
  trendValue,
  icon: Icon,
  iconColor = 'text-blue-400',
  colSpan,
  rowSpan,
  badge,
}: MetricCardProps) {
  const trendIcon = {
    up: TrendingUp,
    down: TrendingDown,
    stable: Minus,
  }[trend || 'stable'];

  const TrendIcon = trendIcon;

  const trendColor = {
    up: 'text-green-400',
    down: 'text-red-400',
    stable: 'text-slate-400',
  }[trend || 'stable'];

  return (
    <BentoCard colSpan={colSpan} rowSpan={rowSpan}>
      <div className="flex flex-col gap-4">
        {/* Header with icon and badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-400">{label}</span>
            {badge && <span className="flex items-center">{badge}</span>}
          </div>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>

        {/* Value */}
        <div className="flex flex-col gap-1">
          <span className="text-3xl font-bold text-white">{value}</span>

          {/* Trend indicator */}
          {trend && trendValue && (
            <div className={cn('flex items-center gap-1 text-sm', trendColor)}>
              <TrendIcon className="h-4 w-4" />
              <span>{trendValue}</span>
            </div>
          )}
        </div>
      </div>
    </BentoCard>
  );
}
