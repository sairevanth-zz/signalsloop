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
import { getSupabaseClient } from '@/lib/supabase-client';

interface Post {
  id: string;
  title: string;
  description: string;
  category: string | null;
  ai_categorized: boolean;
  ai_confidence: number | null;
  votes: number;
  status: string;
  created_at: string;
}

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

      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      // First, get the project ID
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('slug', projectSlug)
        .single();

      if (projectError || !project) {
        throw new Error('Project not found');
      }

      // Get all posts for this project
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false });

      if (postsError) {
        throw new Error('Failed to fetch posts');
      }

      const typedPosts = posts as Post[];
      const totalPosts = typedPosts.length;
      const categorizedPosts = typedPosts.filter(p => p.ai_categorized).length;
      const categorizationRate = totalPosts > 0 ? (categorizedPosts / totalPosts) * 100 : 0;

      // Calculate category breakdown
      const categoryCounts = typedPosts.reduce((acc, post) => {
        if (post.category) {
          acc[post.category] = (acc[post.category] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const categoryBreakdown = Object.entries(categoryCounts)
        .map(([category, count]) => ({
          category,
          count,
          percentage: totalPosts > 0 ? (count / totalPosts) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count);

      const topCategory = categoryBreakdown[0]?.category || 'None';

      // Calculate average confidence
      const confidenceValues = typedPosts
        .filter(p => p.ai_confidence !== null)
        .map(p => p.ai_confidence!);
      const averageConfidence = confidenceValues.length > 0 
        ? confidenceValues.reduce((sum, conf) => sum + conf, 0) / confidenceValues.length 
        : 0;

      // Estimate time saved (2 minutes per categorized post)
      const timeSaved = categorizedPosts * 2;

      // Generate recent trends (last 7 days)
      const now = new Date();
      const recentTrends = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayPosts = typedPosts.filter(p => 
          p.created_at.startsWith(dateStr)
        );
        
        return {
          date: dateStr,
          total: dayPosts.length,
          categorized: dayPosts.filter(p => p.ai_categorized).length
        };
      }).reverse();

      const insightsData: AIInsights = {
        totalPosts,
        categorizedPosts,
        categorizationRate,
        topCategory,
        categoryBreakdown,
        timeSaved,
        averageConfidence,
        recentTrends
      };

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
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card className="bg-gray-50/70 backdrop-blur-lg shadow-lg border-none">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-gray-600">
            <AlertCircle className="w-5 h-5" />
            <p>No insights available</p>
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
