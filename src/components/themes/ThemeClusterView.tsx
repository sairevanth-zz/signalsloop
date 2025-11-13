'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CompactThemeCard } from './ThemeCard';
import { ThemeClusterViewProps, ThemeWithDetails } from '@/types/themes';
import { groupThemesByCluster } from '@/lib/themes/utils';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';

/**
 * ThemeClusterView Component
 * Groups and displays themes by their clusters
 */
export function ThemeClusterView({
  projectId,
  clusters,
  themes,
  className = '',
}: ThemeClusterViewProps) {
  const [allThemes, setAllThemes] = useState<ThemeWithDetails[]>(themes || []);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(!themes);

  useEffect(() => {
    if (!themes) {
      loadThemes();
    }
  }, [projectId]);

  const loadThemes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/detect-themes?projectId=${projectId}`);
      const data = await response.json();

      if (data.success) {
        setAllThemes(data.themes || []);
      }
    } catch (error) {
      console.error('Error loading themes:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCluster = (clusterName: string) => {
    const newExpanded = new Set(expandedClusters);
    if (newExpanded.has(clusterName)) {
      newExpanded.delete(clusterName);
    } else {
      newExpanded.add(clusterName);
    }
    setExpandedClusters(newExpanded);
  };

  const groupedThemes = groupThemesByCluster(allThemes);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Layers className="w-5 h-5 text-gray-700" />
        <h3 className="text-lg font-semibold text-gray-900">
          Theme Clusters ({groupedThemes.size})
        </h3>
      </div>

      {Array.from(groupedThemes.entries()).map(([clusterName, clusterThemes]) => {
        const isExpanded = expandedClusters.has(clusterName);
        const totalMentions = clusterThemes.reduce((sum, t) => sum + t.frequency, 0);
        const avgSentiment =
          clusterThemes.reduce((sum, t) => sum + t.avg_sentiment, 0) / clusterThemes.length;

        return (
          <Card key={clusterName} className="border-l-4 border-l-blue-500">
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleCluster(clusterName)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-lg font-semibold text-gray-900">
                      {clusterName}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {clusterThemes.length} theme{clusterThemes.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <span>
                      <strong>{totalMentions}</strong> total mentions
                    </span>
                    <span>
                      Avg sentiment: <strong>{avgSentiment.toFixed(2)}</strong>
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCluster(clusterName);
                  }}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 space-y-2">
                {clusterThemes.map((theme) => (
                  <CompactThemeCard
                    key={theme.id}
                    theme={theme}
                    onClick={(theme) => {
                      window.location.href = `/themes/${theme.id}`;
                    }}
                  />
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}

      {groupedThemes.size === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Layers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No theme clusters found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
