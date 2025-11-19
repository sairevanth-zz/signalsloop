'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Download,
  Send,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { SupportTicketsTable } from './SupportTicketsTable';
import { IngestTicketsModal } from './IngestTicketsModal';
import { ExportGapsModal } from './ExportGapsModal';

interface SupportDashboardProps {
  projectId: string;
}

interface SupportSummary {
  overview: {
    total_tickets: number;
    unanalyzed_tickets: number;
    total_arr_at_risk: number;
    date_range: {
      start: string;
      end: string;
      days: number;
    };
  };
  top_themes: Array<{
    theme_id: string;
    theme_name: string;
    description: string;
    count: number;
    avg_sentiment: number;
    arr_at_risk: number;
  }>;
  top_gaps: Array<{
    theme_id: string;
    theme_name: string;
    description: string;
    count: number;
    avg_sentiment: number;
    arr_at_risk: number;
    priority_score: number;
  }>;
  sentiment_trend: Array<{
    date: string;
    avg_sentiment: number;
    positive: number;
    negative: number;
    neutral: number;
    total: number;
  }>;
  volume_by_source: Record<string, number>;
  high_priority_tickets: any[];
}

export function SupportDashboard({ projectId }: SupportDashboardProps) {
  const [summary, setSummary] = useState<SupportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [ingestModalOpen, setIngestModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  async function loadSummary() {
    setLoading(true);
    try {
      const response = await fetch(`/api/support/summary?projectId=${projectId}&days=30`);
      const data = await response.json();

      if (data.success) {
        setSummary(data.summary);
      } else {
        console.error('Error loading summary:', data.error);
      }
    } catch (error) {
      console.error('Error loading support summary:', error);
    } finally {
      setLoading(false);
    }
  }

  async function triggerAnalysis() {
    setAnalyzing(true);
    try {
      const response = await fetch('/api/cron/support-analyze', {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'dev-secret'}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        alert(`Analysis complete! Analyzed ${data.stats.tickets_analyzed} tickets, created ${data.stats.posts_created} posts.`);
        loadSummary();
      } else {
        alert(`Analysis failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error triggering analysis:', error);
      alert('Failed to trigger analysis');
    } finally {
      setAnalyzing(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, [projectId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading support analytics...</p>
        </div>
      </div>
    );
  }

  const overview = summary?.overview || {
    total_tickets: 0,
    unanalyzed_tickets: 0,
    total_arr_at_risk: 0,
    date_range: { days: 30 },
  };

  // Calculate sentiment distribution from trend
  const sentimentStats = summary?.sentiment_trend?.reduce(
    (acc, day) => ({
      positive: acc.positive + day.positive,
      negative: acc.negative + day.negative,
      neutral: acc.neutral + day.neutral,
      total: acc.total + day.total,
    }),
    { positive: 0, negative: 0, neutral: 0, total: 0 }
  ) || { positive: 0, negative: 0, neutral: 0, total: 0 };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Support Insights</h1>
          <p className="text-gray-600">
            Last {overview.date_range.days} days • {overview.total_tickets} total tickets
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setIngestModalOpen(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Ingest Tickets
          </Button>
          <Button
            variant="outline"
            onClick={triggerAnalysis}
            disabled={analyzing || overview.unanalyzed_tickets === 0}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
            Analyze {overview.unanalyzed_tickets > 0 ? `(${overview.unanalyzed_tickets})` : ''}
          </Button>
          <Button onClick={() => setExportModalOpen(true)}>
            <Download className="w-4 h-4 mr-2" />
            Export Top 5 Gaps
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview.total_tickets}</div>
            <p className="text-xs text-gray-500 mt-1">
              {overview.unanalyzed_tickets} pending analysis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {sentimentStats.positive > sentimentStats.negative ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
              <div className="text-3xl font-bold">
                {sentimentStats.total > 0
                  ? Math.round((sentimentStats.positive / sentimentStats.total) * 100)
                  : 0}%
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {sentimentStats.negative} negative tickets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              ARR at Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div className="text-3xl font-bold">
                ${(overview.total_arr_at_risk / 1000).toFixed(0)}K
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              From negative sentiment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Unique Themes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <div className="text-3xl font-bold">
                {summary?.top_themes?.length || 0}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {summary?.top_gaps?.length || 0} critical gaps
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Gaps */}
      {summary && summary.top_gaps && summary.top_gaps.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Top 5 Product Gaps</CardTitle>
            <CardDescription>
              High-priority issues ranked by frequency, sentiment, and ARR impact
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.top_gaps.slice(0, 5).map((gap, index) => (
                <div
                  key={gap.theme_id}
                  className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-1">{gap.theme_name}</h4>
                    <p className="text-sm text-gray-600 mb-2">{gap.description}</p>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>{gap.count} tickets</span>
                      <span>•</span>
                      <span>
                        Sentiment: {gap.avg_sentiment >= 0 ? '+' : ''}
                        {gap.avg_sentiment.toFixed(2)}
                      </span>
                      {gap.arr_at_risk > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-orange-600 font-medium">
                            ${gap.arr_at_risk.toFixed(0)} ARR at risk
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span>Priority: {gap.priority_score}/10</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Support Tickets</CardTitle>
          <CardDescription>
            All tickets with theme detection and sentiment analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupportTicketsTable projectId={projectId} />
        </CardContent>
      </Card>

      {/* Modals */}
      <IngestTicketsModal
        projectId={projectId}
        open={ingestModalOpen}
        onClose={() => setIngestModalOpen(false)}
        onSuccess={loadSummary}
      />

      <ExportGapsModal
        projectId={projectId}
        topGaps={summary?.top_gaps || []}
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />
    </div>
  );
}
