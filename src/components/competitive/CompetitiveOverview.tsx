'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { CompetitiveOverviewResponse } from '@/types/competitive-intelligence';
import { CompetitorCard } from './CompetitorCard';
import { FeatureGapCard } from './FeatureGapCard';
import { RecommendationCard } from './RecommendationCard';
import { SentimentTrendChart } from './SentimentTrendChart';

interface CompetitiveOverviewProps {
  projectId: string;
  onCompetitorClick?: (competitorId: string) => void;
  onFeatureGapClick?: (gapId: string) => void;
  onRecommendationClick?: (recommendationId: string) => void;
}

export function CompetitiveOverview({
  projectId,
  onCompetitorClick,
  onFeatureGapClick,
  onRecommendationClick,
}: CompetitiveOverviewProps) {
  const [data, setData] = useState<CompetitiveOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/competitive/overview?projectId=${projectId}`);
      const result = await res.json();

      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error('[Competitive Overview] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data || !data.overview) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">No competitive intelligence data available yet.</p>
        <p className="text-sm text-gray-400 mt-2">
          Competitor mentions will be automatically extracted from discovered feedback.
        </p>
      </div>
    );
  }

  const { overview, competitors, topFeatureGaps, pendingRecommendations, sentimentTrend } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Competitive Intelligence</h2>
          <p className="text-sm text-gray-500 mt-1">
            Strategic insights from {overview.total_mentions} competitive mentions
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Competitors</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{overview.active_competitors}</p>
            </div>
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">{overview.total_competitors} total tracked</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Net User Switches</p>
              <p className={`text-2xl font-bold mt-1 ${overview.net_switches >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {overview.net_switches >= 0 ? '+' : ''}
                {overview.net_switches}
              </p>
            </div>
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${overview.net_switches >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {overview.net_switches >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {overview.total_switches_to_you} to you · {overview.total_switches_from_you} from you
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg Competitive Sentiment</p>
              <p className={`text-2xl font-bold mt-1 ${overview.avg_sentiment_vs_competitors >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {overview.avg_sentiment_vs_competitors?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${overview.avg_sentiment_vs_competitors >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <Zap className={`w-5 h-5 ${overview.avg_sentiment_vs_competitors >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">-1 (them) to +1 (you)</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Recent Mentions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{overview.mentions_last_7d}</p>
            </div>
            <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">Last 7 days · {overview.mentions_last_30d} in 30d</p>
        </Card>
      </div>

      {/* Sentiment Trend Chart */}
      {sentimentTrend && sentimentTrend.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Competitive Sentiment Trend</h3>
          <SentimentTrendChart data={sentimentTrend} />
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="competitors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="competitors">
            Competitors ({competitors.length})
          </TabsTrigger>
          <TabsTrigger value="gaps">
            Feature Gaps ({topFeatureGaps.length})
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            Recommendations ({pendingRecommendations.length})
          </TabsTrigger>
        </TabsList>

        {/* Competitors Tab */}
        <TabsContent value="competitors" className="space-y-4">
          {competitors.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No competitors detected yet.</p>
              <p className="text-sm text-gray-400 mt-2">
                Competitors will be automatically extracted from feedback mentions.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {competitors.slice(0, 6).map((competitor) => (
                <CompetitorCard
                  key={competitor.competitor_id}
                  competitor={competitor}
                  onClick={() => onCompetitorClick?.(competitor.competitor_id)}
                />
              ))}
            </div>
          )}
          {competitors.length > 6 && (
            <div className="text-center">
              <Button variant="outline" size="sm">
                View All Competitors
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Feature Gaps Tab */}
        <TabsContent value="gaps" className="space-y-4">
          {topFeatureGaps.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No feature gaps identified yet.</p>
              <p className="text-sm text-gray-400 mt-2">
                Feature gaps are detected from competitive feature comparison mentions.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {topFeatureGaps.map((gap) => (
                <FeatureGapCard
                  key={gap.id}
                  gap={gap}
                  onClick={() => onFeatureGapClick?.(gap.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          {pendingRecommendations.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No pending recommendations.</p>
              <p className="text-sm text-gray-400 mt-2">
                Strategic recommendations are generated weekly based on competitive intelligence.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingRecommendations.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onClick={() => onRecommendationClick?.(rec.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
