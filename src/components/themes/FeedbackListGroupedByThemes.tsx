'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FeedbackListGroupedByThemesProps,
  Theme,
  FeedbackItem,
} from '@/types/themes';
import { SentimentBadge } from '@/components/sentiment/SentimentBadge';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';

/**
 * FeedbackListGroupedByThemes Component
 * Displays feedback items grouped by their themes
 */
export function FeedbackListGroupedByThemes({
  projectId,
  themes,
  initialExpanded = false,
  className = '',
}: FeedbackListGroupedByThemesProps) {
  const [themeGroups, setThemeGroups] = useState<Map<string, FeedbackItem[]>>(new Map());
  const [loadedThemes, setLoadedThemes] = useState<Theme[]>(themes || []);
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(
    initialExpanded ? new Set(themes?.map(t => t.id) || []) : new Set()
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeedbackByThemes();
  }, [projectId, themes]);

  const loadFeedbackByThemes = async () => {
    setLoading(true);
    try {
      let themesToLoad = themes || [];

      if (themesToLoad.length === 0) {
        // Load themes first
        const themesResponse = await fetch(`/api/detect-themes?projectId=${projectId}`);
        const themesData = await themesResponse.json();
        if (themesData.success) {
          themesToLoad = themesData.themes;
        }
      }

      // Save loaded themes to state
      setLoadedThemes(themesToLoad);

      const groupsMap = new Map<string, FeedbackItem[]>();

      // Load feedback for each theme
      await Promise.all(
        themesToLoad.map(async (theme) => {
          const response = await fetch(
            `/api/themes/${theme.id}?includeRelatedFeedback=true`
          );
          const data = await response.json();

          if (data.success && data.relatedFeedback) {
            groupsMap.set(theme.id, data.relatedFeedback);
          }
        })
      );

      setThemeGroups(groupsMap);
    } catch (error) {
      console.error('Error loading feedback by themes:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = (themeId: string) => {
    const newExpanded = new Set(expandedThemes);
    if (newExpanded.has(themeId)) {
      newExpanded.delete(themeId);
    } else {
      newExpanded.add(themeId);
    }
    setExpandedThemes(newExpanded);
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const themesWithFeedback = loadedThemes.filter(theme =>
    themeGroups.has(theme.id) && (themeGroups.get(theme.id)?.length || 0) > 0
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {themesWithFeedback.map((theme) => {
        const feedbackItems = themeGroups.get(theme.id) || [];
        const isExpanded = expandedThemes.has(theme.id);
        const visibleItems = isExpanded ? feedbackItems : feedbackItems.slice(0, 2);
        const hasMore = feedbackItems.length > 2;

        return (
          <Card key={theme.id} className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              {/* Theme Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {theme.theme_name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {theme.description}
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      {feedbackItems.length} item{feedbackItems.length !== 1 ? 's' : ''}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {theme.frequency} mention{theme.frequency !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>

                {hasMore && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleTheme(theme.id)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>

              {/* Feedback Items */}
              <div className="space-y-3">
                {visibleItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="text-sm font-semibold text-gray-900 flex-1">
                        {item.title}
                      </h4>
                      {item.sentiment_category && (
                        <SentimentBadge
                          sentiment_category={item.sentiment_category}
                          sentiment_score={item.sentiment_score}
                          size="sm"
                        />
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {item.category && (
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                      )}
                      <span>
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Show More Button */}
              {hasMore && !isExpanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleTheme(theme.id)}
                  className="w-full mt-3 text-sm text-blue-600"
                >
                  +{feedbackItems.length - 2} more item{feedbackItems.length - 2 !== 1 ? 's' : ''}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}

      {themesWithFeedback.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No feedback items grouped by themes</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
