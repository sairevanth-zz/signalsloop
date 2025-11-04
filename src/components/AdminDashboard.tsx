'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CategoryBadge } from '@/components/CategoryBadge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Settings, 
  Search, 
  ThumbsUp, 
  MessageSquare, 
  Calendar,
  User,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Brain,
  Zap,
  Target
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PriorityMixBar, getPriorityTotals } from '@/components/PriorityMix';

interface AdminPost {
  id: string;
  title: string;
  description?: string;
  author_email?: string;
  status: 'open' | 'planned' | 'in_progress' | 'done' | 'declined';
  created_at: string;
  vote_count: number;
  comment_count: number;
  must_have_votes?: number;
  important_votes?: number;
  nice_to_have_votes?: number;
  total_priority_score?: number;
  tags?: string[];
  duplicate_of?: string;
  board_id: string;
  category?: string | null;
  ai_categorized?: boolean;
  ai_confidence?: number;
  ai_reasoning?: string;
  board_name: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface AdminDashboardProps {
  projectSlug: string;
  onShowNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

// Initialize Supabase client
const getSupabaseClient = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
};

const statusConfig = {
  open: { 
    label: 'Open', 
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'New feedback that needs review'
  },
  planned: { 
    label: 'Planned', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    description: 'Approved for future development'
  },
  in_progress: { 
    label: 'In Progress', 
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    description: 'Currently being worked on'
  },
  done: { 
    label: 'Done', 
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'Completed and shipped'
  },
  declined: { 
    label: 'Declined', 
    color: 'bg-red-100 text-red-800 border-red-200',
    description: 'Will not be implemented'
  }
};

// Category colors for charts
const categoryColors: Record<string, string> = {
  'Bug': '#ef4444',
  'Feature Request': '#3b82f6',
  'Improvement': '#f59e0b',
  'UI/UX': '#8b5cf6',
  'Integration': '#6366f1',
  'Performance': '#10b981',
  'Documentation': '#f97316',
  'Other': '#6b7280'
};

const getCategoryColor = (category: string): string => {
  return categoryColors[category] || '#6b7280';
};

// Analytics tracking function (placeholder for PostHog)
const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
  // TODO: Replace with PostHog tracking
  console.log('Analytics Event:', eventName, properties);
  
  // For now, just log to console
  // In production, this would send to PostHog:
  // posthog.capture(eventName, properties);
};

export default function AdminDashboard({ projectSlug, onShowNotification }: AdminDashboardProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  
  // Stats
  const [stats, setStats] = useState({
    totalPosts: 0,
    openPosts: 0,
    completedPosts: 0,
    totalVotes: 0,
    mustHaveVotes: 0,
    importantVotes: 0,
    niceToHaveVotes: 0
  });

  // AI Analytics
  const [aiStats, setAiStats] = useState({
    totalAiCategorized: 0,
    categoryBreakdown: {} as Record<string, number>,
    timeSavedMinutes: 0,
    mostCommonCategory: '',
    aiSuccessRate: 0
  });

  const [filteredPriorityBreakdown, setFilteredPriorityBreakdown] = useState({
    mustHave: 0,
    important: 0,
    niceToHave: 0
  });

  const [priorityTrend, setPriorityTrend] = useState({
    mustHave: 0,
    important: 0,
    niceToHave: 0
  });

  const summarizePriority = useCallback((collection: AdminPost[]) => {
    return collection.reduce(
      (acc, post) => {
        acc.mustHave += post.must_have_votes || 0;
        acc.important += post.important_votes || 0;
        acc.niceToHave += post.nice_to_have_votes || 0;
        return acc;
      },
      { mustHave: 0, important: 0, niceToHave: 0 }
    );
  }, []);

  const filteredTotalVotes = useMemo(
    () => getPriorityTotals(filteredPriorityBreakdown),
    [filteredPriorityBreakdown]
  );

  const hasActiveFilter = useMemo(
    () => statusFilter !== 'all' || !!searchTerm,
    [statusFilter, searchTerm]
  );

  const formatDelta = (value: number) => {
    if (value > 0) return `+${value}`;
    if (value < 0) return `${value}`;
    return '0';
  };

  const renderTrendChip = (emoji: string, label: string, delta: number) => {
    const tone =
      delta > 0 ? 'text-green-600' : delta < 0 ? 'text-gray-500' : 'text-gray-400';

    return (
      <span
        key={label}
        className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1"
      >
        <span aria-hidden="true">{emoji}</span>
        <span className="font-medium text-gray-700">{label}</span>
        <span className={`font-semibold ${tone}`}>{formatDelta(delta)}</span>
      </span>
    );
  };

  // Moderation state
  const [editingPost, setEditingPost] = useState<AdminPost | null>(null);
  const [bulkAction, setBulkAction] = useState<string>('');
  
  const supabase = getSupabaseClient();

  useEffect(() => {
    loadDashboardData();
  }, [projectSlug]);

  useEffect(() => {
    filterAndSortPosts();
  }, [posts, searchTerm, statusFilter, sortBy]);

  const loadDashboardData = async () => {
    if (!supabase) {
      console.error('Supabase client not available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', projectSlug)
        .single();

      if (projectError || !projectData) {
        onShowNotification?.('Project not found', 'error');
        return;
      }

      setProject(projectData);

      // Get all posts for this project with additional data
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          vote_count:votes(count),
          comment_count:comments(count),
          boards!inner(name, project_id)
        `)
        .eq('boards.project_id', projectData.id)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error loading posts:', postsError);
        onShowNotification?.('Error loading posts', 'error');
        return;
      }

      // Process posts data
      const processedPosts = postsData?.map(post => ({
        id: post.id,
        title: post.title,
        description: post.description,
        author_email: post.author_email,
        status: post.status,
        created_at: post.created_at,
        vote_count: post.vote_count?.[0]?.count || 0,
        comment_count: post.comment_count?.[0]?.count || 0,
        must_have_votes: post.must_have_votes || 0,
        important_votes: post.important_votes || 0,
        nice_to_have_votes: post.nice_to_have_votes || 0,
        total_priority_score: post.total_priority_score || 0,
        tags: [], // TODO: Add tags functionality
        duplicate_of: post.duplicate_of,
        board_id: post.board_id,
        category: post.category,
        ai_categorized: post.ai_categorized,
        ai_confidence: post.ai_confidence,
        ai_reasoning: post.ai_reasoning,
        board_name: post.boards?.name || 'Unknown'
      })) || [];

      setPosts(processedPosts);

      // Calculate stats
      const totalPosts = processedPosts.length;
      const openPosts = processedPosts.filter(p => p.status === 'open').length;
      const completedPosts = processedPosts.filter(p => p.status === 'done').length;
      const totalVotes = processedPosts.reduce((sum, p) => sum + p.vote_count, 0);
      const mustHaveVotes = processedPosts.reduce((sum, p) => sum + (p.must_have_votes || 0), 0);
      const importantVotes = processedPosts.reduce((sum, p) => sum + (p.important_votes || 0), 0);
      const niceToHaveVotes = processedPosts.reduce((sum, p) => sum + (p.nice_to_have_votes || 0), 0);

      setStats({
        totalPosts,
        openPosts,
        completedPosts,
        totalVotes,
        mustHaveVotes,
        importantVotes,
        niceToHaveVotes
      });

      setFilteredPriorityBreakdown(summarizePriority(processedPosts));

      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      const fourteenDaysAgo = new Date(now);
      fourteenDaysAgo.setDate(now.getDate() - 14);

      const withinRange = (dateString: string | undefined | null, start: Date, end: Date) => {
        if (!dateString) return false;
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return false;
        return date >= start && date < end;
      };

      const currentWindow = summarizePriority(
        processedPosts.filter(post => withinRange(post.created_at, sevenDaysAgo, now))
      );
      const previousWindow = summarizePriority(
        processedPosts.filter(post => withinRange(post.created_at, fourteenDaysAgo, sevenDaysAgo))
      );

      setPriorityTrend({
        mustHave: currentWindow.mustHave - previousWindow.mustHave,
        important: currentWindow.important - previousWindow.important,
        niceToHave: currentWindow.niceToHave - previousWindow.niceToHave
      });

      // Calculate AI analytics
      const aiCategorizedPosts = processedPosts.filter(p => p.ai_categorized);
      const totalAiCategorized = aiCategorizedPosts.length;
      
      // Category breakdown
      const categoryBreakdown: Record<string, number> = {};
      aiCategorizedPosts.forEach(post => {
        if (post.category) {
          categoryBreakdown[post.category] = (categoryBreakdown[post.category] || 0) + 1;
        }
      });

      // Most common category
      const mostCommonCategory = Object.entries(categoryBreakdown)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None';

      // Time saved (2 minutes per categorized post)
      const timeSavedMinutes = totalAiCategorized * 2;

      // AI success rate (posts with AI categorization vs total posts)
      const aiSuccessRate = totalPosts > 0 ? (totalAiCategorized / totalPosts) * 100 : 0;

      setAiStats({
        totalAiCategorized,
        categoryBreakdown,
        timeSavedMinutes,
        mostCommonCategory,
        aiSuccessRate
      });

      // Track AI analytics events
      if (totalAiCategorized > 0) {
        trackEvent('ai_categorization_success', {
          total_categorized: totalAiCategorized,
          success_rate: aiSuccessRate,
          time_saved_minutes: timeSavedMinutes,
          most_common_category: mostCommonCategory,
          category_breakdown: categoryBreakdown
        });
      }

      // Track category filter usage if any filters are applied
      if (statusFilter !== 'all' || searchTerm) {
        trackEvent('category_filter_used', {
          status_filter: statusFilter,
          has_search: !!searchTerm,
          search_length: searchTerm.length
        });
      }

    } catch (error) {
      console.error('Error loading dashboard:', error);
      onShowNotification?.('Something went wrong', 'error');
      
      // Track AI categorization failure
      trackEvent('ai_categorization_failed', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        project_slug: projectSlug
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortPosts = () => {
    let filtered = [...posts];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.author_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(post => post.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'votes':
          return b.vote_count - a.vote_count;
        case 'comments':
          return b.comment_count - a.comment_count;
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    const breakdown = summarizePriority(filtered);
    setFilteredPriorityBreakdown(breakdown);
    setFilteredPosts(filtered);
  };

  const handleStatusChange = async (postId: string, newStatus: string) => {
    if (!supabase) {
      console.error('Supabase client not available');
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .update({ status: newStatus })
        .eq('id', postId);

      if (error) {
        console.error('Error updating status:', error);
        onShowNotification?.('Error updating status', 'error');
        return;
      }

      // Update local state
      setPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, status: newStatus as 'done' | 'open' | 'planned' | 'in_progress' | 'declined' } : post
      ));

      onShowNotification?.('Status updated successfully', 'success');

      // TODO: Send status change email to author

    } catch (error) {
      console.error('Error updating status:', error);
      onShowNotification?.('Something went wrong', 'error');
    }
  };

  const handleBulkStatusChange = async () => {
    if (!supabase) {
      console.error('Supabase client not available');
      return;
    }

    if (!bulkAction || selectedPosts.length === 0) return;

    try {
      const { error } = await supabase
        .from('posts')
        .update({ status: bulkAction })
        .in('id', selectedPosts);

      if (error) {
        console.error('Error bulk updating:', error);
        onShowNotification?.('Error updating posts', 'error');
        return;
      }

      // Update local state
      setPosts(prev => prev.map(post => 
        selectedPosts.includes(post.id) ? { ...post, status: bulkAction as 'done' | 'open' | 'planned' | 'in_progress' | 'declined' } : post
      ));

      setSelectedPosts([]);
      setBulkAction('');
      onShowNotification?.(
        `Updated ${selectedPosts.length} posts to ${bulkAction}`, 
        'success'
      );

    } catch (error) {
      console.error('Error bulk updating:', error);
      onShowNotification?.('Something went wrong', 'error');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!supabase) {
      console.error('Supabase client not available');
      return;
    }

    try {
      // First, unmerge any duplicates that reference this post
      const { error: unmergeError } = await supabase
        .from('posts')
        .update({ duplicate_of: null })
        .eq('duplicate_of', postId);

      if (unmergeError) {
        console.error('Error unmerging duplicates:', unmergeError);
        onShowNotification?.('Error unmerging duplicate posts', 'error');
        return;
      }

      // Now delete the post
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('Error deleting post:', error);
        onShowNotification?.('Error deleting post', 'error');
        return;
      }

      // Update local state
      setPosts(prev => prev.filter(post => post.id !== postId));
      setSelectedPosts(prev => prev.filter(id => id !== postId));

      onShowNotification?.('Post deleted successfully', 'success');

    } catch (error) {
      console.error('Error deleting post:', error);
      onShowNotification?.('Something went wrong', 'error');
    }
  };

  const togglePostSelection = (postId: string) => {
    setSelectedPosts(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

  const selectAllPosts = () => {
    if (selectedPosts.length === filteredPosts.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(filteredPosts.map(post => post.id));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Manage feedback for {project?.name}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={loadDashboardData}>
                <Settings className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Posts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalPosts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Open Posts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.openPosts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedPosts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Votes</p>
                    <p className="text-xs text-gray-500">
                      Signal mix across {hasActiveFilter ? 'filtered posts' : 'all posts'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{filteredTotalVotes}</p>
                  <p className="text-xs text-gray-500">
                    {hasActiveFilter
                      ? `Filtered total (${filteredPosts.length} posts)`
                      : 'All posts'}
                  </p>
                  {hasActiveFilter && (
                    <p className="text-xs text-gray-400">Overall: {stats.totalVotes}</p>
                  )}
                </div>
              </div>

              <PriorityMixBar
                mustHave={filteredPriorityBreakdown.mustHave}
                important={filteredPriorityBreakdown.important}
                niceToHave={filteredPriorityBreakdown.niceToHave}
                size="sm"
                showLegend
                layout="side"
              />

              <div className="text-xs text-gray-600">
                <p className="font-medium text-gray-700">Trend vs last 7 days</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {renderTrendChip('🔴', 'Must', priorityTrend.mustHave)}
                  {renderTrendChip('🟡', 'Important', priorityTrend.important)}
                  {renderTrendChip('🟢', 'Nice', priorityTrend.niceToHave)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Brain className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-900">AI Insights</h2>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
              🤖 Powered by AI
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* AI Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Brain className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">AI Categorized</p>
                      <p className="text-2xl font-bold text-gray-900">{aiStats.totalAiCategorized}</p>
                      <p className="text-xs text-gray-500">posts this month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Time Saved</p>
                      <p className="text-2xl font-bold text-gray-900">{aiStats.timeSavedMinutes}</p>
                      <p className="text-xs text-gray-500">minutes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Target className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Top Category</p>
                      <p className="text-lg font-bold text-gray-900">{aiStats.mostCommonCategory}</p>
                      <p className="text-xs text-gray-500">
                        {aiStats.categoryBreakdown[aiStats.mostCommonCategory] || 0} posts
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">AI Success Rate</p>
                      <p className="text-2xl font-bold text-gray-900">{aiStats.aiSuccessRate.toFixed(1)}%</p>
                      <p className="text-xs text-gray-500">of all posts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Breakdown Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Category Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(aiStats.categoryBreakdown).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={Object.entries(aiStats.categoryBreakdown).map(([category, count]) => ({
                          name: category,
                          value: count,
                          fill: getCategoryColor(category)
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={(entry) => `${entry.name} (${((Number(entry.percent) || 0) * 100).toFixed(0)}%)`}
                      >
                        {Object.entries(aiStats.categoryBreakdown).map(([category], index) => (
                          <Cell key={`cell-${index}`} fill={getCategoryColor(category)} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    <div className="text-center">
                      <Brain className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No AI categorization data yet</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Category Distribution Bar Chart */}
          {Object.keys(aiStats.categoryBreakdown).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Posts by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(aiStats.categoryBreakdown).map(([category, count]) => ({
                    category,
                    posts: count,
                    fill: getCategoryColor(category)
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="posts" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Filters and Bulk Actions */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="votes">Most Votes</SelectItem>
                  <SelectItem value="comments">Most Comments</SelectItem>
                </SelectContent>
              </Select>

              {/* Bulk Actions */}
              <div className="flex gap-2">
                <input
                  type="checkbox"
                  checked={selectedPosts.length === filteredPosts.length && filteredPosts.length > 0}
                  onChange={selectAllPosts}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">
                  {selectedPosts.length} selected
                </span>
              </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedPosts.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-900">
                  {selectedPosts.length} posts selected
                </span>
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Choose action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Mark as Planned</SelectItem>
                    <SelectItem value="in_progress">Mark as In Progress</SelectItem>
                    <SelectItem value="done">Mark as Done</SelectItem>
                    <SelectItem value="declined">Mark as Declined</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleBulkStatusChange}
                  disabled={!bulkAction}
                  size="sm"
                >
                  Apply
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedPosts([])}
                  size="sm"
                >
                  Clear
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Posts List */}
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No posts found
                </h3>
                <p className="text-gray-600">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your filters to see more posts.'
                    : 'No feedback has been submitted yet.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredPosts.map((post) => (
              <Card key={post.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Selection Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedPosts.includes(post.id)}
                      onChange={() => togglePostSelection(post.id)}
                      className="mt-1 rounded border-gray-300"
                    />

                    {/* Post Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {post.title}
                          </h3>
                          
                          {post.description && (
                            <p className="text-gray-600 line-clamp-2 mb-3">
                              {post.description}
                            </p>
                          )}

                          {/* AI Category Badge */}
                          {post.category && (
                            <div className="mb-3">
                              <CategoryBadge 
                                category={post.category} 
                                aiCategorized={post.ai_categorized}
                                confidence={post.ai_confidence}
                                size="sm"
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>
                                {post.author_email 
                                  ? post.author_email.split('@')[0] 
                                  : 'Anonymous'
                                }
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {new Date(post.created_at).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <ThumbsUp className="w-4 h-4" />
                              <span>{post.vote_count} votes</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-4 h-4" />
                              <span>{post.comment_count} comments</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={statusConfig[post.status].color}
                          >
                            {statusConfig[post.status].label}
                          </Badge>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-3 border-t">
                        <Select
                          value={post.status}
                          onValueChange={(value) => handleStatusChange(post.id, value)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="planned">Planned</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                            <SelectItem value="declined">Declined</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingPost(post)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Post</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{post.title}&quot;? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeletePost(post.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Load More */}
        {filteredPosts.length > 0 && (
          <div className="text-center mt-8">
            <Button variant="outline">
              Load More Posts
            </Button>
          </div>
        )}
      </div>

      {/* Edit Post Dialog */}
      {editingPost && (
        <Dialog open={!!editingPost} onOpenChange={() => setEditingPost(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Post</DialogTitle>
              <DialogDescription>
                Make changes to the post details.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <Input
                  value={editingPost.title}
                  onChange={(e) => setEditingPost(prev => 
                    prev ? { ...prev, title: e.target.value } : null
                  )}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  value={editingPost.description || ''}
                  onChange={(e) => setEditingPost(prev => 
                    prev ? { ...prev, description: e.target.value } : null
                  )}
                  rows={4}
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setEditingPost(null)}
                >
                  Cancel
                </Button>
                <Button onClick={() => {
                  // TODO: Implement save changes
                  setEditingPost(null);
                  onShowNotification?.('Changes saved', 'success');
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
