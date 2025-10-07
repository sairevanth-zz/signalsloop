'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  TrendingUp, 
  Clock, 
  Target, 
  AlertCircle,
  CheckCircle,
  BarChart3,
  PieChart,
  Smile,
  Meh,
  Frown,
  Heart
} from 'lucide-react';
import { PriorityMixBar } from '@/components/PriorityMix';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';


interface AIInsights {
  totalPosts: number;
  categorizedPosts: number;
  categorizationRate: number;
  topCategory: string;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  timeSaved: number; // in minutes
  averageConfidence: number;
  recentTrends: Array<{
    date: string;
    categorized: number;
    total: number;
  }>;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
    mixed: number;
  };
  prioritySummary: {
    totals: {
      mustHave: number;
      important: number;
      niceToHave: number;
    };
    posts: Array<{
      id: string;
      title: string;
      status: string;
      mustHave: number;
      important: number;
      niceToHave: number;
      total: number;
      timeframe?: string | null;
    }>;
    weeklySnapshots: Array<{
      weekStart: string;
      weekEnd: string;
      mustHave: number;
      important: number;
      niceToHave: number;
    }>;
  };
}

interface AIInsightsPanelProps {
  projectSlug: string;
}

export function AIInsightsPanel({ projectSlug }: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [urgencyViewMode, setUrgencyViewMode] = useState<'count' | 'percent'>('count');

  useEffect(() => {
    loadAIInsights();
  }, [projectSlug]);

  const loadAIInsights = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading AI insights for project:', projectSlug);

      // Use the new API endpoint for better reliability
      const response = await fetch(`/api/ai/insights?projectSlug=${encodeURIComponent(projectSlug)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const insightsData = await response.json();
      console.log('AI insights loaded successfully:', insightsData);

      setInsights({
        ...insightsData,
        prioritySummary: insightsData.prioritySummary ?? {
          totals: { mustHave: 0, important: 0, niceToHave: 0 },
          posts: [],
          weeklySnapshots: []
        }
      });
    } catch (err) {
      console.error('Error loading AI insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-white/70 backdrop-blur-lg shadow-lg border-none">
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="bg-white/70 backdrop-blur-lg shadow-lg border-none">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-50/70 backdrop-blur-lg shadow-lg border-none">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-semibold">Error loading AI insights</p>
              <p className="text-sm">{error}</p>
              <button 
                onClick={loadAIInsights}
                className="mt-2 text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Insights Available Yet</h3>
            <p className="text-sm text-gray-600 mb-4">
              Start adding feedback posts to see AI-powered insights and categorization
            </p>
            <button 
              onClick={loadAIInsights}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Refresh Insights
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Bug': 'bg-red-100 text-red-800 border-red-200',
      'Feature Request': 'bg-blue-100 text-blue-800 border-blue-200',
      'Improvement': 'bg-green-100 text-green-800 border-green-200',
      'UI/UX': 'bg-purple-100 text-purple-800 border-purple-200',
      'Integration': 'bg-orange-100 text-orange-800 border-orange-200',
      'Performance': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Documentation': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Other': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const prioritySummary = insights.prioritySummary;
  const priorityTotals = prioritySummary.totals;
  const priorityTotalVotes =
    priorityTotals.mustHave + priorityTotals.important + priorityTotals.niceToHave;
  const weeklySnapshots = prioritySummary.weeklySnapshots.slice(-4);

  const urgencyChartData = prioritySummary.posts.map((post) => {
    const total =
      post.total > 0
        ? post.total
        : post.mustHave + post.important + post.niceToHave || 1;
    const shortTitle =
      post.title.length > 28 ? `${post.title.slice(0, 25)}…` : post.title;

    const mustHaveValue =
      urgencyViewMode === 'percent'
        ? Number(((post.mustHave / total) * 100).toFixed(1))
        : post.mustHave;
    const importantValue =
      urgencyViewMode === 'percent'
        ? Number(((post.important / total) * 100).toFixed(1))
        : post.important;
    const niceToHaveValue =
      urgencyViewMode === 'percent'
        ? Number(((post.niceToHave / total) * 100).toFixed(1))
        : post.niceToHave;

    return {
      key: post.id,
      name: shortTitle,
      fullTitle: post.title,
      timeframe: post.timeframe,
      status: post.status,
      mustHave: mustHaveValue,
      important: importantValue,
      niceToHave: niceToHaveValue,
      rawMustHave: post.mustHave,
      rawImportant: post.important,
      rawNiceToHave: post.niceToHave,
      total,
    };
  });

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="bg-white/70 backdrop-blur-lg shadow-lg border-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                Total Posts Analyzed
              </CardTitle>
              <Brain className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {insights.totalPosts}
              </div>
              <p className="text-xs text-gray-500">
                {insights.categorizedPosts} auto-categorized
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-lg shadow-lg border-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                Categorization Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {insights.categorizationRate.toFixed(1)}%
              </div>
              <Progress value={insights.categorizationRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-lg shadow-lg border-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                Time Saved
              </CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {insights.timeSaved}m
              </div>
              <p className="text-xs text-gray-500">
                ~{Math.round(insights.timeSaved / 60)} hours
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Category */}
        <Card className="bg-white/70 backdrop-blur-lg shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700">
              <Target className="h-5 w-5 text-orange-600" />
              Most Common Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {insights.topCategory === 'None' ? (
                <div className="flex items-center gap-3">
                  <Badge className="border-gray-200 bg-gray-100 px-3 py-1 text-gray-600">
                    No categories yet
                  </Badge>
                  <span className="text-sm text-gray-500">
                    Posts will be auto-categorized by AI
                  </span>
                </div>
              ) : (
                <>
                  <Badge className={`px-3 py-1 ${getCategoryColor(insights.topCategory)}`}>
                    {insights.topCategory}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {insights.categoryBreakdown[0]?.count || 0} posts
                  </span>
                  {insights.averageConfidence > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <CheckCircle className="h-3 w-3" />
                      {insights.averageConfidence.toFixed(0)}% avg confidence
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="bg-white/70 backdrop-blur-lg shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              Category Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights.categoryBreakdown.length === 0 ? (
              <div className="py-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <BarChart3 className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No categories assigned yet</p>
                <p className="mt-1 text-xs text-gray-400">
                  AI will automatically categorize posts as they're added
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {insights.categoryBreakdown.slice(0, 5).map((item) => (
                  <div key={item.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={`px-2 py-1 text-xs ${getCategoryColor(item.category)}`}>
                        {item.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700">{item.count}</span>
                      <div className="w-20">
                        <Progress value={item.percentage} className="h-2" />
                      </div>
                      <span className="w-12 text-right text-xs text-gray-500">
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sentiment Analysis */}
        <Card className="bg-white/70 backdrop-blur-lg shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700">
              <Heart className="h-5 w-5 text-pink-600" />
              Sentiment Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {([
                {
                  label: 'Positive',
                  icon: <Smile className="h-4 w-4 text-green-600" />,
                  value: insights.sentimentBreakdown.positive,
                  barColor: 'bg-green-100',
                  textClass: 'text-green-600',
                },
                {
                  label: 'Neutral',
                  icon: <Meh className="h-4 w-4 text-gray-600" />,
                  value: insights.sentimentBreakdown.neutral,
                  barColor: 'bg-gray-100',
                  textClass: 'text-gray-600',
                },
                {
                  label: 'Negative',
                  icon: <Frown className="h-4 w-4 text-red-600" />,
                  value: insights.sentimentBreakdown.negative,
                  barColor: 'bg-red-100',
                  textClass: 'text-red-600',
                },
                {
                  label: 'Mixed',
                  icon: <AlertCircle className="h-4 w-4 text-yellow-600" />,
                  value: insights.sentimentBreakdown.mixed,
                  barColor: 'bg-yellow-100',
                  textClass: 'text-yellow-600',
                },
              ] as const).map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32">
                      <Progress
                        value={insights.totalPosts > 0 ? (item.value / insights.totalPosts) * 100 : 0}
                        className={`h-2 ${item.barColor}`}
                      />
                    </div>
                    <span className={`w-12 text-right text-sm font-bold ${item.textClass}`}>
                      {item.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Trends */}
        <Card className="bg-white/70 backdrop-blur-lg shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700">
              <PieChart className="h-5 w-5 text-pink-600" />
              Recent Trends (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.recentTrends.map((trend) => (
                <div key={trend.date} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-600">
                    {new Date(trend.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-400" />
                      <span className="text-xs text-gray-600">
                        {trend.categorized} categorized
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{trend.total} total</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Urgency Mix</h3>
            <p className="text-sm text-gray-500">
              Keep an eye on the balance of must-have, important, and nice-to-have votes.
            </p>
          </div>
        </div>

        <Card className="bg-white/70 backdrop-blur-lg shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700">
              <Target className="h-5 w-5 text-red-500" />
              Overall Signal Mix
            </CardTitle>
            <p className="mt-1 text-xs text-gray-500">
              {priorityTotalVotes > 0
                ? `${priorityTotalVotes} votes captured across all posts`
                : 'Votes will appear here once feedback starts rolling in'}
            </p>
          </CardHeader>
          <CardContent>
            {priorityTotalVotes === 0 ? (
              <div className="text-sm text-gray-500">
                No urgency data yet. Encourage users to vote with priorities to populate this view.
              </div>
            ) : (
              <PriorityMixBar
                mustHave={priorityTotals.mustHave}
                important={priorityTotals.important}
                niceToHave={priorityTotals.niceToHave}
                size="sm"
                showLegend
                layout="side"
              />
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-lg shadow-lg border-none">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-gray-700">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
                Vote Urgency by Post
              </CardTitle>
              <p className="text-xs text-gray-500">
                Sorted by must-have volume to spotlight weekly hot items.
              </p>
            </div>
            {urgencyChartData.length > 0 && (
              <div className="inline-flex rounded-md border border-gray-200 bg-white/80 p-1 shadow-sm">
                <Button
                  size="sm"
                  variant={urgencyViewMode === 'count' ? 'default' : 'outline'}
                  onClick={() => setUrgencyViewMode('count')}
                >
                  Counts
                </Button>
                <Button
                  size="sm"
                  variant={urgencyViewMode === 'percent' ? 'default' : 'outline'}
                  onClick={() => setUrgencyViewMode('percent')}
                  className="ml-1"
                >
                  Share %
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {urgencyChartData.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                No votes yet. As signals roll in, we’ll chart the breakdown per post.
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={urgencyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" />
                    <YAxis
                      tickFormatter={(value) =>
                        urgencyViewMode === 'percent' ? `${value}%` : value
                      }
                      domain={urgencyViewMode === 'percent' ? [0, 100] : undefined}
                      allowDecimals={urgencyViewMode === 'percent'}
                    />
                    <Tooltip
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTitle || ''}
                      formatter={(value: number, name: string, entry) => {
                        if (!entry || !entry.payload) return [value, name];
                        const rawKey =
                          name === 'Must Have'
                            ? 'rawMustHave'
                            : name === 'Important'
                            ? 'rawImportant'
                            : 'rawNiceToHave';
                        const rawValue = entry.payload[rawKey] as number;
                        if (urgencyViewMode === 'percent') {
                          return [`${value.toFixed(1)}% (${rawValue})`, name];
                        }
                        return [rawValue, name];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="mustHave" stackId="a" fill="#ef4444" name="Must Have" />
                    <Bar dataKey="important" stackId="a" fill="#f59e0b" name="Important" />
                    <Bar dataKey="niceToHave" stackId="a" fill="#10b981" name="Nice to Have" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-lg shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700">
              <Clock className="h-5 w-5 text-blue-600" />
              Weekly Snapshots
            </CardTitle>
            <p className="text-xs text-gray-500">Quick view of the mix over the last few weeks.</p>
          </CardHeader>
          <CardContent>
            {weeklySnapshots.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                We’ll summarize weekly shifts once votes arrive.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {weeklySnapshots.map((snapshot) => (
                  <div
                    key={snapshot.weekStart}
                    className="rounded-lg border border-gray-200 bg-white/80 p-4"
                  >
                    <p className="text-xs font-medium text-gray-500">
                      Week of {new Date(snapshot.weekStart).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between text-red-600">
                        <span>🔴 Must</span>
                        <span className="font-semibold">{snapshot.mustHave}</span>
                      </div>
                      <div className="flex items-center justify-between text-amber-600">
                        <span>🟡 Important</span>
                        <span className="font-semibold">{snapshot.important}</span>
                      </div>
                      <div className="flex items-center justify-between text-emerald-600">
                        <span>🟢 Nice</span>
                        <span className="font-semibold">{snapshot.niceToHave}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
