'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeTrendChart } from './ThemeTrendChart';
import { CompactThemeCard } from './ThemeCard';
import { SentimentBadge } from '@/components/sentiment/SentimentBadge';
import {
  ThemeDetailPageProps,
  ThemeWithDetails,
  FeedbackItem,
  Theme,
  ThemeTrendPoint,
} from '@/types/themes';
import {
  getThemeSentimentLabel,
  getThemeSentimentColor,
  getThemeStatusBadge,
  formatThemeDate,
  exportThemesToCSV,
} from '@/lib/themes/utils';
import {
  ArrowLeft,
  TrendingUp,
  Calendar,
  MessageSquare,
  Download,
  FileText,
  Flame,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * ThemeDetailPage Component
 * Full detailed view of a single theme
 */
export function ThemeDetailPage({
  themeId,
  projectId,
  projectSlug,
}: ThemeDetailPageProps) {
  const [theme, setTheme] = useState<ThemeWithDetails | null>(null);
  const [relatedFeedback, setRelatedFeedback] = useState<FeedbackItem[]>([]);
  const [relatedThemes, setRelatedThemes] = useState<Theme[]>([]);
  const [trend, setTrend] = useState<ThemeTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThemeDetails();
  }, [themeId]);

  const loadThemeDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/themes/${themeId}?includeRelatedFeedback=true&includeTrend=true&timeRange=90`
      );
      const data = await response.json();

      if (data.success) {
        setTheme(data.theme);
        setRelatedFeedback(data.relatedFeedback || []);
        setRelatedThemes(data.relatedThemes || []);
        setTrend(data.trend || []);
      } else {
        toast.error('Failed to load theme details');
      }
    } catch (error) {
      console.error('Error loading theme details:', error);
      toast.error('Failed to load theme details');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!theme) return;

    const csv = exportThemesToCSV([theme]);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme-${theme.theme_name.replace(/\s+/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Theme data exported');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!theme) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-600">Theme not found</p>
            <Button className="mt-4" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusBadge = getThemeStatusBadge(theme);
  const sentimentLabel = getThemeSentimentLabel(theme.avg_sentiment);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Themes
          </Button>

          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{theme.theme_name}</h1>
            {theme.is_emerging && (
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-sm font-medium">
                <Flame className="w-4 h-4" />
                <span>Emerging</span>
              </div>
            )}
          </div>

          <p className="text-lg text-gray-600 mb-4">{theme.description}</p>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={statusBadge.color}>
              {statusBadge.label}
            </Badge>
            {theme.cluster_name && (
              <Badge variant="outline">{theme.cluster_name}</Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.info('Jira integration coming soon!')}
            className="gap-2"
          >
            <FileText className="w-4 h-4" />
            Create Issue
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Mentions</p>
                <p className="text-3xl font-bold text-gray-900">{theme.frequency}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Sentiment</p>
                <p className={`text-3xl font-bold ${getThemeSentimentColor(theme.avg_sentiment)}`}>
                  {theme.avg_sentiment > 0 ? '+' : ''}{theme.avg_sentiment.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{sentimentLabel}</p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                theme.avg_sentiment >= 0.3 ? 'bg-green-100' :
                theme.avg_sentiment <= -0.3 ? 'bg-red-100' : 'bg-gray-100'
              }`}>
                <span className="text-2xl">
                  {theme.avg_sentiment >= 0.3 ? '😊' :
                   theme.avg_sentiment <= -0.3 ? '😞' : '😐'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">First Seen</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatThemeDate(theme.first_seen)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(theme.first_seen).toLocaleDateString()}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Last Seen</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatThemeDate(theme.last_seen)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(theme.last_seen).toLocaleDateString()}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      {trend.length > 0 && (
        <ThemeTrendChart
          themeIds={[themeId]}
          projectId={projectId}
          timeRange={90}
        />
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Representative Feedback */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">
                Representative Feedback ({relatedFeedback.length})
              </h3>
              <p className="text-sm text-gray-600">
                Most relevant feedback items for this theme
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {relatedFeedback.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
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
                    <p className="text-xs text-gray-600 mb-2">{item.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {item.category && (
                      <Badge variant="outline" className="text-xs">
                        {item.category}
                      </Badge>
                    )}
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}

              {relatedFeedback.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No feedback items available
                </div>
              )}

              {relatedFeedback.length > 5 && (
                <Button variant="outline" className="w-full">
                  View All {relatedFeedback.length} Items
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Related Themes */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">
                Related Themes ({relatedThemes.length})
              </h3>
              <p className="text-sm text-gray-600">
                Themes in the same cluster
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {relatedThemes.slice(0, 5).map((relatedTheme) => (
                <CompactThemeCard
                  key={relatedTheme.id}
                  theme={relatedTheme}
                  onClick={(theme) => {
                    if (projectSlug) {
                      window.location.href = `/${projectSlug}/theme/${theme.id}`;
                    }
                  }}
                />
              ))}

              {relatedThemes.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No related themes
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
