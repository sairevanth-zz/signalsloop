'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import GlobalBanner from '@/components/GlobalBanner';
import { CategoryBadge } from '@/components/CategoryBadge';
import { 
  ArrowLeft,
  Brain,
  Sparkles,
  TrendingUp,
  MessageSquare,
  BarChart3,
  Zap,
  Users,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Post {
  id: string;
  title: string;
  description?: string;
  author_email?: string;
  status: 'open' | 'planned' | 'in_progress' | 'done' | 'declined';
  created_at: string;
  vote_count: number;
  comment_count: number;
  category?: string | null;
  ai_categorized?: boolean;
  ai_confidence?: number;
  ai_reasoning?: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface AIInsights {
  totalPosts: number;
  totalVotes: number;
  categoryBreakdown: Record<string, number>;
  topCategories: string[];
  recentPosts: Post[];
  statusBreakdown: Record<string, number>;
  sentimentAnalysis?: {
    positive: number;
    neutral: number;
    negative: number;
  };
}


const statusConfig = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  planned: { label: 'Planned', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  in_progress: { label: 'In Progress', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  done: { label: 'Done', color: 'bg-green-100 text-green-800 border-green-200' },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-800 border-red-200' }
};

export default function AIInsightsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth(); // eslint-disable-line @typescript-eslint/no-unused-vars
  const supabase = getSupabaseClient();
  
  const [project, setProject] = useState<Project | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiAvailable, setAiAvailable] = useState(false);

  const loadAIInsights = useCallback(async () => {
    if (!supabase || !project) return;

    try {
      setLoading(true);

      // Check if OpenAI API key is available
      try {
        const response = await fetch('/api/ai/categorize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'Test',
            description: 'Test'
          }),
        });

        if (!response.ok) {
          console.log('🤖 OpenAI API key not available, skipping AI insights');
          setAiAvailable(false);
          return;
        }
        setAiAvailable(true);
      } catch {
        console.log('🤖 OpenAI API key not available, skipping AI insights');
        setAiAvailable(false);
        return;
      }

      // Get all posts for this project
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          description,
          status,
          created_at,
          vote_count:votes(count),
          comment_count:comments(count),
          category,
          ai_categorized,
          ai_confidence,
          ai_reasoning
        `)
        .eq('project_id', project.id)
        .is('duplicate_of', null)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error fetching posts for AI insights:', postsError);
        toast.error('Failed to load posts for analysis');
        return;
      }

      if (!posts || posts.length === 0) {
        console.log('🤖 No posts found for AI insights');
        setAiInsights({
          totalPosts: 0,
          totalVotes: 0,
          categoryBreakdown: {},
          topCategories: [],
          recentPosts: [],
          statusBreakdown: {}
        });
        return;
      }

      console.log('🤖 Found posts for AI insights:', posts.length);

      // Process posts and categorize them if they don't have AI categories
      const postsWithCategories = await Promise.all(
        posts.map(async (post: Record<string, unknown>) => {
          let aiCategory = post.category;
          let aiConfidence = post.ai_confidence;
          let aiReasoning = post.ai_reasoning;

          // If post doesn't have AI categorization, categorize it now
          if (!aiCategory || !post.ai_categorized) {
            try {
              const response = await fetch('/api/ai/categorize', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  title: post.title,
                  description: post.description
                }),
              });

              if (response.ok) {
                const data = await response.json();
                aiCategory = data.result?.category || 'Other';
                aiConfidence = data.result?.confidence || 0;
                aiReasoning = data.result?.reasoning;
              } else {
                aiCategory = 'Other';
                aiConfidence = 0;
              }
            } catch (error) {
              console.error('AI categorization error:', error);
              aiCategory = 'Other';
              aiConfidence = 0;
            }
          }

          return {
            id: post.id as string,
            title: post.title as string,
            description: post.description as string,
            author_email: post.author_email as string,
            status: post.status as 'open' | 'planned' | 'in_progress' | 'done' | 'declined',
            created_at: post.created_at as string,
            vote_count: (post.vote_count as Array<{count: number}>)?.[0]?.count || 0,
            comment_count: (post.comment_count as Array<{count: number}>)?.[0]?.count || 0,
            category: aiCategory,
            ai_categorized: true,
            ai_confidence: aiConfidence,
            ai_reasoning: aiReasoning
          };
        })
      );

      // Calculate insights
      const categoryBreakdown: Record<string, number> = {};
      const statusBreakdown: Record<string, number> = {};
      let totalVotes = 0;

      postsWithCategories.forEach(post => {
        // Category breakdown
        if (post.category) {
          categoryBreakdown[post.category] = (categoryBreakdown[post.category] || 0) + 1;
        }

        // Status breakdown
        statusBreakdown[post.status] = (statusBreakdown[post.status] || 0) + 1;

        // Total votes
        totalVotes += post.vote_count;
      });

      // Get top categories
      const topCategories = Object.entries(categoryBreakdown)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category]) => category);

      setAiInsights({
        totalPosts: posts.length,
        totalVotes,
        categoryBreakdown,
        topCategories,
        recentPosts: postsWithCategories.slice(0, 10),
        statusBreakdown
      });

    } catch (error) {
      console.error('Error loading AI insights:', error);
      toast.error('Failed to load AI insights');
    } finally {
      setLoading(false);
    }
  }, [supabase, project]);

  useEffect(() => {
    // Load project first
    const loadProject = async () => {
      if (!supabase) return;

      try {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('slug', params.slug)
          .single();

        if (projectError) {
          toast.error('Project not found');
          router.push('/app');
          return;
        }

        setProject(projectData);
      } catch (error) {
        console.error('Error loading project:', error);
        toast.error('Failed to load project');
      }
    };

    loadProject();
  }, [supabase, params.slug, router]);

  useEffect(() => {
    if (project) {
      loadAIInsights();
    }
  }, [project, loadAIInsights]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <GlobalBanner />
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header Skeleton */}
          <div className="mb-8">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-6 w-96" />
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>

          {/* Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <GlobalBanner />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Project not found</h1>
            <Link href="/app">
              <Button>Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <GlobalBanner />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href={`/${params.slug}/board`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Board
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                AI Insights
              </h1>
              <p className="text-gray-600">Smart analysis of {project.name} feedback</p>
            </div>
          </div>
        </div>

        {!aiAvailable ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-900">AI Analysis Unavailable</h3>
                <p className="text-yellow-800">
                  OpenAI API key is not configured. Contact your administrator to enable AI insights.
                </p>
              </div>
            </div>
          </div>
        ) : aiInsights && aiInsights.totalPosts > 0 ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Total Posts</p>
                      <p className="text-3xl font-bold text-gray-900">{aiInsights.totalPosts}</p>
                    </div>
                    <MessageSquare className="w-8 h-8 text-blue-500 opacity-70" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Total Votes</p>
                      <p className="text-3xl font-bold text-gray-900">{aiInsights.totalVotes}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500 opacity-70" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Categories</p>
                      <p className="text-3xl font-bold text-gray-900">{Object.keys(aiInsights.categoryBreakdown).length}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-purple-500 opacity-70" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Top Category</p>
                      <p className="text-lg font-bold text-gray-900">
                        {aiInsights.topCategories[0] || 'N/A'}
                      </p>
                    </div>
                    <Zap className="w-8 h-8 text-orange-500 opacity-70" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Category Breakdown */}
              <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    Feedback Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {aiInsights.topCategories.map((category) => {
                      const count = aiInsights.categoryBreakdown[category];
                      const percentage = Math.round((count / aiInsights.totalPosts) * 100);
                      return (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CategoryBadge 
                                category={category} 
                                aiCategorized={true}
                                size="sm"
                              />
                              <span className="text-sm font-medium">{count} posts</span>
                            </div>
                            <span className="text-sm text-gray-600">{percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Status Breakdown */}
              <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Status Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(aiInsights.statusBreakdown).map(([status, count]) => {
                      const percentage = Math.round((count / aiInsights.totalPosts) * 100);
                      return (
                        <div key={status} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={`${statusConfig[status as keyof typeof statusConfig].color} text-sm`}>
                                {statusConfig[status as keyof typeof statusConfig].label}
                              </Badge>
                              <span className="text-sm font-medium">{count} posts</span>
                            </div>
                            <span className="text-sm text-gray-600">{percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-600 to-green-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Posts with AI Categories */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Recent Feedback with AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {aiInsights.recentPosts.map((post) => (
                    <div key={post.id} className="p-4 bg-white/60 rounded-lg border border-white/20 hover:bg-white/80 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1 mr-4">
                          {post.title}
                        </h4>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <CategoryBadge 
                            category={post.category} 
                            aiCategorized={post.ai_categorized}
                            confidence={post.ai_confidence}
                            size="sm"
                            showConfidence={true}
                          />
                        </div>
                      </div>
                      
                      {post.description && (
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                          {post.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {post.vote_count} votes
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {post.comment_count} comments
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <Badge className={`${statusConfig[post.status].color} text-xs`}>
                          {statusConfig[post.status].label}
                        </Badge>
                      </div>
                      
                      {post.ai_reasoning && (
                        <div className="mt-2 p-2 bg-purple-50 rounded text-xs text-purple-700">
                          <strong>AI Reasoning:</strong> {post.ai_reasoning}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No feedback to analyze
              </h3>
              <p className="text-gray-600 mb-4">
                Submit some feedback to see AI-powered insights and analysis.
              </p>
              <Link href={`/${params.slug}/board`}>
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
                  Go to Feedback Board
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
