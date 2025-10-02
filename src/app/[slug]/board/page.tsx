'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import GlobalBanner from '@/components/GlobalBanner';
import { CategoryBadge } from '@/components/CategoryBadge';
import BoardShare from '@/components/BoardShare';
import FeedbackExport from '@/components/FeedbackExport';
import { AIDuplicateDetection } from '@/components/AIDuplicateDetection';
import { AIPriorityScoring } from '@/components/AIPriorityScoring';
import { DebugAIFeatures } from '@/components/DebugAIFeatures';
import { 
  Search, 
  Plus, 
  MessageSquare, 
  Calendar,
  User,
  LogOut,
  Settings,
  Home,
  Map,
  Sparkles,
  Share2,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import Link from 'next/link';
import PostSubmissionForm from '@/components/PostSubmissionForm';
import VoteButton from '@/components/VoteButton';
import { AIInsightsSlideout } from '@/components/AIInsightsSlideout';

interface Post {
  id: string;
  title: string;
  description?: string;
  author_email?: string;
  status: 'open' | 'planned' | 'in_progress' | 'done' | 'declined';
  created_at: string;
  vote_count: number;
  comment_count: number;
  user_voted: boolean;
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

const statusConfig = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  planned: { label: 'Planned', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  in_progress: { label: 'In Progress', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  done: { label: 'Done', color: 'bg-green-100 text-green-800 border-green-200' },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-800 border-red-200' }
};

const categoryConfig = {
  'Bug': { icon: '🐛', color: 'bg-red-100 text-red-800 border-red-200' },
  'Feature Request': { icon: '✨', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  'Improvement': { icon: '⚡', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  'UI/UX': { icon: '🎨', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  'Integration': { icon: '🔗', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  'Performance': { icon: '🚀', color: 'bg-green-100 text-green-800 border-green-200' },
  'Documentation': { icon: '📚', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  'Other': { icon: '📝', color: 'bg-gray-100 text-gray-800 border-gray-200' }
};

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signOut } = useAuth();
  const supabase = getSupabaseClient();
  
  const [project, setProject] = useState<Project | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('votes');
  const [showPostForm, setShowPostForm] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [userPlan, setUserPlan] = useState<'free' | 'pro'>('free');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [priorityVoteCounts, setPriorityVoteCounts] = useState({ must_have: 0, important: 0, nice_to_have: 0 });
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Initialize filters from URL parameters
  useEffect(() => {
    const status = searchParams?.get('status') || 'all';
    const category = searchParams?.get('category') || 'all';
    const priority = searchParams?.get('priority') || 'all';
    const sort = searchParams?.get('sort') || 'votes';
    const search = searchParams?.get('search') || '';

    setStatusFilter(status);
    setCategoryFilter(category);
    setPriorityFilter(priority);
    setSortBy(sort);
    setSearchTerm(search);
  }, [searchParams]);

  // Update URL when filters change
  const updateURL = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === 'all' || value === 'votes' || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newURL);
  }, [searchParams]);

  // Filter change handlers
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    updateURL({ status: value });
  };

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value);
    updateURL({ category: value });
  };

  const handlePriorityFilterChange = (value: string) => {
    setPriorityFilter(value);
    updateURL({ priority: value });
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    updateURL({ sort: value });
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    updateURL({ search: value });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const loadUserPlan = useCallback(async () => {
    if (!supabase || !user) return;
    
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('plan')
        .eq('id', user.id)
        .single();
      
      if (!error && userData) {
        setUserPlan(userData.plan || 'free');
      }
    } catch (error) {
      console.error('Error loading user plan:', error);
    }
  }, [supabase, user]);

  const loadProjectAndPosts = useCallback(async () => {
    if (!supabase) {
      setError('Database connection not available. Please refresh the page.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get project by slug
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', params?.slug as string)
        .single();

      if (projectError) {
        toast.error('Project not found');
        router.push('/');
        return;
      }

      setProject(projectData);

      // Get board for this project
      const { data: boardData, error: boardError } = await supabase
        .from('boards')
        .select('id')
        .eq('project_id', projectData.id)
        .single();

      if (boardError || !boardData) {
        toast.error('Board not found');
        return;
      }

      setBoardId(boardData.id);

      // Build query for posts
      let postsQuery = supabase
        .from('posts')
        .select(`
          *,
          vote_count:votes(count),
          comment_count:comments(count)
        `)
        .eq('board_id', boardData.id)
        .is('duplicate_of', null); // Don't show duplicate posts

      // Apply status filter
      if (statusFilter !== 'all') {
        postsQuery = postsQuery.eq('status', statusFilter);
      }

      // Apply category filter
      if (categoryFilter !== 'all') {
        postsQuery = postsQuery.eq('category', categoryFilter);
      }

      // Apply sorting
      if (sortBy === 'votes') {
        postsQuery = postsQuery.order('vote_count', { ascending: false });
      } else if (sortBy === 'newest') {
        postsQuery = postsQuery.order('created_at', { ascending: false });
      } else if (sortBy === 'oldest') {
        postsQuery = postsQuery.order('created_at', { ascending: true });
      }

      const { data: postsData, error: postsError } = await postsQuery;

      if (postsError) {
        console.error('Error loading posts:', postsError);
        toast.error('Error loading posts');
        return;
      }

      // Process posts data
      const processedPosts = postsData?.map((post: Record<string, unknown>) => ({
        id: post.id as string,
        title: post.title as string,
        description: post.description as string,
        author_email: post.author_email as string,
        status: post.status as 'open' | 'planned' | 'in_progress' | 'done' | 'declined',
        created_at: post.created_at as string,
        vote_count: (post.vote_count as Array<{count: number}>)?.[0]?.count || 0,
        comment_count: (post.comment_count as Array<{count: number}>)?.[0]?.count || 0,
        user_voted: false, // TODO: Check if current user voted
        category: post.category as string | null,
        ai_categorized: post.ai_categorized as boolean,
        ai_confidence: post.ai_confidence as number,
        ai_reasoning: post.ai_reasoning as string
      })) || [];

      setPosts(processedPosts);

      // Calculate category counts for all posts (not filtered)
      const allPostsQuery = supabase
        .from('posts')
        .select('category')
        .eq('board_id', boardData.id)
        .is('duplicate_of', null);

      const { data: allPostsData } = await allPostsQuery;
      
      const counts: Record<string, number> = {};
      allPostsData?.forEach((post: Record<string, unknown>) => {
        const category = post.category as string;
        if (category) {
          counts[category] = (counts[category] || 0) + 1;
        }
      });
      
      setCategoryCounts(counts);

    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [params?.slug, statusFilter, categoryFilter, sortBy, supabase, router]);

  // Load project and posts
  useEffect(() => {
    loadProjectAndPosts();
  }, [loadProjectAndPosts]);

  // Load user plan
  useEffect(() => {
    loadUserPlan();
  }, [loadUserPlan]);

  // Filter posts by search term
  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 safe-top safe-bottom">
      <GlobalBanner 
        showBackButton={true} 
        backLabel="Back to Dashboard" 
      />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex gap-4 lg:gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Link href="/app" className="hover:text-gray-900 flex items-center gap-1">
                <Home className="w-4 h-4" />
                Dashboard
              </Link>
              <span>→</span>
              <span>{project?.name}</span>
              <span>→</span>
              <span>Feedback Board</span>
            </div>
            
            {/* User Actions */}
            {user && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{user.email}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="flex items-center gap-1"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {project?.name} Feedback
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Share your ideas and help us build better features
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-1 bg-green-50 border-green-200 text-green-700 hover:bg-green-100 min-touch-target tap-highlight-transparent">
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Share</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Share {project?.name} Board</DialogTitle>
                  </DialogHeader>
                  {project && (
                    <BoardShare
                      projectSlug={params?.slug as string}
                      projectName={project.name}
                      boardUrl={`${window.location.origin}/${params?.slug}/board`}
                      isPublic={true}
                    />
                  )}
                </DialogContent>
              </Dialog>
              
              <FeedbackExport
                projectSlug={params?.slug as string}
                projectName={project?.name || ''}
                totalPosts={posts.length}
                totalComments={posts.reduce((sum, post) => sum + (post.comment_count || 0), 0)}
                totalVotes={posts.reduce((sum, post) => sum + (post.vote_count || 0), 0)}
              />
              
              <Link href={`/${params?.slug}/roadmap`} className="hidden sm:block">
                <Button variant="outline" className="flex items-center gap-1 min-touch-target">
                  <Map className="w-4 h-4" />
                  <span className="hidden md:inline">Roadmap</span>
                </Button>
              </Link>
              {user && (
                <Link href={`/${params?.slug}/settings`} className="hidden sm:block">
                  <Button variant="outline" className="flex items-center gap-1 min-touch-target">
                    <Settings className="w-4 h-4" />
                    <span className="hidden md:inline">Settings</span>
                  </Button>
                </Link>
              )}
              {user && posts.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowAIInsights(true)}
                  className="hidden sm:flex items-center gap-1 bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 min-touch-target"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden md:inline">AI Insights</span>
                </Button>
              )}
              <Button 
                onClick={() => setShowPostForm(true)}
                className="bg-blue-600 hover:bg-blue-700 active:scale-95 transition-transform min-touch-target tap-highlight-transparent flex-1 sm:flex-initial"
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden xs:inline">Submit</span>
                <span className="hidden sm:inline">Feedback</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 mb-4 sm:mb-6">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden mb-3">
            <Button
              variant="outline"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="w-full justify-between min-touch-target"
            >
              <span>Filters & Search</span>
              <ChevronRight className={`h-4 w-4 transition-transform ${showMobileFilters ? 'rotate-90' : ''}`} />
            </Button>
          </div>
          
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${showMobileFilters ? 'block' : 'hidden lg:grid'}`}>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <Input
                placeholder="Search feedback..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 min-touch-target text-base"
                type="search"
              />
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
              <SelectTrigger className="min-touch-target">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <span>📋</span>
                    <span>All Categories</span>
                    <span className="text-gray-500 text-sm">({Object.values(categoryCounts).reduce((a, b) => a + b, 0)})</span>
                  </div>
                </SelectItem>
                {Object.entries(categoryConfig).map(([category, config]) => (
                  <SelectItem key={category} value={category}>
                    <div className="flex items-center gap-2">
                      <span>{config.icon}</span>
                      <span>{category}</span>
                      <span className="text-gray-500 text-sm">({categoryCounts[category] || 0})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="min-touch-target">
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
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="min-touch-target">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="votes">Most Votes</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Debug AI Features - Only show when DEBUG_AI_FEATURES is enabled */}
        {process.env.NEXT_PUBLIC_DEBUG_AI_FEATURES === 'true' && (
          <DebugAIFeatures projectSlug={params?.slug as string} />
        )}


        {/* Posts List */}
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No feedback yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Be the first to share your ideas and help shape the future of this product.
                </p>
                <Button 
                  onClick={() => setShowPostForm(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Submit First Feedback
                </Button>
              </div>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <Card 
                key={post.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/${params?.slug}/post/${post.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Vote Button */}
                    <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                      <VoteButton
                        postId={post.id}
                        initialVoteCount={post.vote_count}
                        initialUserVoted={post.user_voted}
                        onVoteChange={(newCount, userVoted) => {
                          // Update the post in the local state
                          setPosts(prev => prev.map(p => 
                            p.id === post.id 
                              ? { ...p, vote_count: newCount, user_voted: userVoted }
                              : p
                          ));
                        }}
                        onShowNotification={(message, type) => {
                          if (type === 'success') {
                            toast.success(message);
                          } else if (type === 'error') {
                            toast.error(message);
                          } else {
                            toast.info(message);
                          }
                        }}
                        size="md"
                        variant="default"
                      />
                    </div>

                    {/* Post Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                          {post.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge 
                            variant="outline" 
                            className={statusConfig[post.status].color}
                          >
                            {statusConfig[post.status].label}
                          </Badge>
                        </div>
                      </div>

                      {/* AI Category Badge */}
                      {post.category && (
                        <div className="mb-2">
                          <CategoryBadge 
                            category={post.category} 
                            aiCategorized={post.ai_categorized}
                            confidence={post.ai_confidence}
                            size="sm"
                          />
                        </div>
                      )}

                      {post.description && (
                        <p className="text-gray-600 line-clamp-3 mb-3">
                          {post.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>
                            {post.author_email ? 
                              post.author_email.split('@')[0] : 
                              'Anonymous'
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
                          <MessageSquare className="w-4 h-4" />
                          <span>{post.comment_count} comments</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Show more button if needed */}
        {filteredPosts.length > 0 && (
          <div className="text-center mt-8">
            <Button variant="outline">
              Load More Feedback
            </Button>
          </div>
        )}
          </div>

          {/* AI Insights Sidebar - Only show for Pro users */}
          {user && userPlan === 'pro' && (
            <div className={`hidden lg:block ${sidebarCollapsed ? 'w-12' : 'w-80'} flex-shrink-0 transition-all duration-300`}>
              <div className="sticky top-8">
                {/* Toggle Button */}
                <div className="flex items-center justify-between mb-4">
                  {!sidebarCollapsed && (
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      <h2 className="text-lg font-semibold text-gray-900">AI-Powered Insights</h2>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        Pro Feature
                      </Badge>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="p-2 hover:bg-purple-50"
                  >
                    {sidebarCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-purple-600" />
                    ) : (
                      <ChevronLeft className="h-4 w-4 text-purple-600" />
                    )}
                  </Button>
                </div>
                
                {/* Collapsed State - Show AI icon */}
                {sidebarCollapsed && (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                )}
                
                {!sidebarCollapsed && (
                  <div className="space-y-4">
                    <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">AI Features</h3>
                          <p className="text-sm text-gray-600">Available on individual posts</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                          <span>Duplicate Detection</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span>Priority Scoring</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span>Smart Categorization</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-3">
                        Click on any post to access AI-powered analysis and insights.
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">Smart Analytics</h3>
                          <p className="text-sm text-gray-600">AI-powered insights</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                          <span>Automatic categorization</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                          <span>Duplicate detection</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span>Priority scoring</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-3">
                        AI automatically analyzes your feedback for better organization.
                      </p>
                    </CardContent>
                  </Card>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Post Submission Modal */}
      {showPostForm && project && boardId && (
        <PostSubmissionForm
          isOpen={showPostForm}
          onClose={() => setShowPostForm(false)}
          projectId={project.id}
          boardId={boardId}
          onPostSubmitted={loadProjectAndPosts}
        />
      )}

      {/* AI Insights Slideout */}
      {showAIInsights && (
        <AIInsightsSlideout
          projectSlug={params?.slug as string}
          isOpen={showAIInsights}
          onClose={() => setShowAIInsights(false)}
        />
      )}
    </div>
  );
}