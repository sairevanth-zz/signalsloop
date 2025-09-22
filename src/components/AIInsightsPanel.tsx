'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Brain, 
  TrendingUp, 
  Clock, 
  Target, 
  AlertCircle,
  CheckCircle,
  BarChart3,
  PieChart
} from 'lucide-react';


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
}

interface AIInsightsPanelProps {
  projectSlug: string;
}

export function AIInsightsPanel({ projectSlug }: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      setInsights(insightsData);
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

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <Progress 
              value={insights.categorizationRate} 
              className="mt-2"
            />
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
                <Badge className="px-3 py-1 bg-gray-100 text-gray-600 border-gray-200">
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
                    <CheckCircle className="w-3 h-3" />
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
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No categories assigned yet</p>
              <p className="text-xs text-gray-400 mt-1">
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
                    <span className="text-sm font-medium text-gray-700">
                      {item.count}
                    </span>
                    <div className="w-20">
                      <Progress value={item.percentage} className="h-2" />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                    day: 'numeric' 
                  })}
                </span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-xs text-gray-600">
                      {trend.categorized} categorized
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {trend.total} total
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
