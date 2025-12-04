'use client';

import React from 'react';
import { MetricCardProps } from '@/types/stakeholder';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function MetricCard({ title, value, trend, delta, description }: MetricCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up'
      ? 'text-green-600 dark:text-green-400'
      : trend === 'down'
      ? 'text-red-600 dark:text-red-400'
      : 'text-gray-600 dark:text-gray-400';

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>

          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              {description}
            </p>
          )}
        </div>

        {trend && (
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-5 h-5" />
          </div>
        )}
      </div>

      {delta && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className={`text-sm font-medium ${trendColor}`}>{delta}</p>
        </div>
      )}
    </Card>
  );
}
