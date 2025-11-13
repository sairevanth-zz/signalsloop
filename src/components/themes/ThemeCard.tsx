'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeCardProps, getThemeColorScheme, getTrendDisplay } from '@/types/themes';
import {
  getThemeSentimentLabel,
  getThemeSentimentColor,
  formatThemeFrequency,
  getThemeStatusBadge,
} from '@/lib/themes/utils';
import { TrendingUp, TrendingDown, Minus, Flame } from 'lucide-react';

/**
 * ThemeCard Component
 * Displays an individual theme with its metrics and status
 */
export function ThemeCard({
  theme,
  showTrend = true,
  onClick,
  className = '',
}: ThemeCardProps) {
  const colorScheme = getThemeColorScheme(theme.avg_sentiment);
  const sentimentLabel = getThemeSentimentLabel(theme.avg_sentiment);
  const statusBadge = getThemeStatusBadge(theme);

  const handleClick = () => {
    if (onClick) {
      onClick(theme);
    }
  };

  return (
    <Card
      className={`
        hover:shadow-lg transition-all duration-200 border-l-4
        ${colorScheme.borderLeft}
        ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}
        ${className}
      `}
      onClick={handleClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Theme Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {theme.theme_name}
              </h3>
              {theme.is_emerging && (
                <div
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-medium"
                  title="Emerging theme"
                >
                  <Flame className="w-3 h-3" />
                  <span>Emerging</span>
                </div>
              )}
            </div>

            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {theme.description}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {/* Frequency Badge */}
              <Badge variant="outline" className="text-xs">
                <span className="font-semibold">{theme.frequency}</span>
                <span className="ml-1 text-gray-600">mentions</span>
              </Badge>

              {/* Sentiment Badge */}
              <Badge
                variant="outline"
                className={`text-xs ${getThemeSentimentColor(theme.avg_sentiment)}`}
              >
                {sentimentLabel}
              </Badge>

              {/* Status Badge */}
              <Badge
                variant="outline"
                className={`text-xs ${statusBadge.color}`}
              >
                {statusBadge.label}
              </Badge>
            </div>
          </div>

          {/* Right: Metrics */}
          <div className="flex flex-col items-end gap-2">
            {/* Sentiment Score */}
            <div className="text-right">
              <div className={`text-2xl font-bold ${getThemeSentimentColor(theme.avg_sentiment)}`}>
                {theme.avg_sentiment > 0 ? '+' : ''}
                {theme.avg_sentiment.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">sentiment</div>
            </div>

            {/* Trend Indicator */}
            {showTrend && (
              <div className="flex items-center gap-1 text-sm">
                {theme.is_emerging ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-medium">Growing</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-gray-500">
                    <Minus className="w-4 h-4" />
                    <span>Stable</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer: Temporal Info */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div>
            First seen: {new Date(theme.first_seen).toLocaleDateString()}
          </div>
          <div>
            Last seen: {new Date(theme.last_seen).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * ThemeCardSkeleton Component
 * Loading placeholder for ThemeCard
 */
export function ThemeCardSkeleton() {
  return (
    <Card className="border-l-4 border-l-gray-300 animate-pulse">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-1"></div>
            <div className="h-4 bg-gray-200 rounded w-4/5 mb-3"></div>
            <div className="flex gap-2">
              <div className="h-6 bg-gray-200 rounded w-20"></div>
              <div className="h-6 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="h-8 bg-gray-200 rounded w-16"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
          <div className="h-3 bg-gray-200 rounded w-32"></div>
          <div className="h-3 bg-gray-200 rounded w-32"></div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * CompactThemeCard Component
 * Smaller version for lists and grids
 */
export function CompactThemeCard({
  theme,
  onClick,
  className = '',
}: ThemeCardProps) {
  const colorScheme = getThemeColorScheme(theme.avg_sentiment);

  return (
    <Card
      className={`
        hover:shadow-md transition-all duration-200 border-l-4
        ${colorScheme.borderLeft}
        ${onClick ? 'cursor-pointer hover:scale-[1.01]' : ''}
        ${className}
      `}
      onClick={() => onClick?.(theme)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-gray-900 truncate">
                {theme.theme_name}
              </h4>
              {theme.is_emerging && (
                <Flame className="w-3 h-3 text-orange-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-gray-600 truncate">
              {theme.description}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-lg font-bold text-gray-900">
              {theme.frequency}
            </span>
            <span className={`text-xs font-medium ${getThemeSentimentColor(theme.avg_sentiment)}`}>
              {theme.avg_sentiment > 0 ? '+' : ''}
              {theme.avg_sentiment.toFixed(1)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
