'use client';

import React from 'react';
import { ThemeCloudProps } from '@/types/stakeholder';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Tag } from 'lucide-react';

export function ThemeCloud({ themes, maxThemes = 15, title }: ThemeCloudProps) {
  const displayThemes = themes.slice(0, maxThemes);

  // Calculate size based on count (normalized)
  const maxCount = Math.max(...displayThemes.map((t) => t.count));
  const minCount = Math.min(...displayThemes.map((t) => t.count));

  const getThemeSize = (count: number) => {
    if (maxCount === minCount) return 'text-base';
    const normalized = (count - minCount) / (maxCount - minCount);
    if (normalized > 0.7) return 'text-2xl';
    if (normalized > 0.4) return 'text-xl';
    if (normalized > 0.2) return 'text-lg';
    return 'text-base';
  };

  const getSentimentColor = (sentiment?: number) => {
    if (sentiment === undefined) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    if (sentiment > 0.3) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (sentiment < -0.3) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  };

  const getTrendIcon = (trend?: string) => {
    if (trend === 'rising') return <TrendingUp className="w-3 h-3" />;
    if (trend === 'falling') return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Tag className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title || 'Top Themes'}
        </h3>
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-center py-4">
        {displayThemes.map((theme, idx) => (
          <div
            key={idx}
            className="inline-flex items-center gap-2 transition-transform hover:scale-105"
          >
            <Badge
              className={`${getThemeSize(theme.count)} ${getSentimentColor(theme.sentiment)} font-medium px-3 py-1.5 cursor-pointer`}
              variant="secondary"
            >
              <span>{theme.name}</span>
              <span className="ml-2 text-xs opacity-70">({theme.count})</span>
            </Badge>
            {theme.trend && (
              <div
                className={`
                  ${theme.trend === 'rising' ? 'text-green-600 dark:text-green-400' : ''}
                  ${theme.trend === 'falling' ? 'text-red-600 dark:text-red-400' : ''}
                  ${theme.trend === 'stable' ? 'text-gray-600 dark:text-gray-400' : ''}
                `}
              >
                {getTrendIcon(theme.trend)}
              </div>
            )}
          </div>
        ))}
      </div>

      {themes.length > maxThemes && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
          Showing top {maxThemes} of {themes.length} themes
        </p>
      )}

      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900" />
          <span>Positive</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-100 dark:bg-yellow-900" />
          <span>Neutral</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900" />
          <span>Negative</span>
        </div>
      </div>
    </Card>
  );
}
