'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import GlobalBanner from '@/components/GlobalBanner';
import { CategoryBadge } from '@/components/CategoryBadge';
import RoadmapPhaseManager from '@/components/RoadmapPhaseManager';
import DragDropRoadmap from '@/components/DragDropRoadmap';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  MessageSquare, 
  Calendar, 
  Search,
  Clock,
  CheckCircle,
  Target,
  Zap,
  TrendingUp,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import VoteButton from '@/components/VoteButton'; // Import our voting component
import { toast } from 'sonner';
import DebugRoadmap from '@/components/DebugRoadmap';

interface RoadmapPost {
  id: string;
  title: string;
  description?: string;
  author_email?: string;
  status: 'open' | 'planned' | 'in_progress' | 'done' | 'declined';
  created_at: string;
  vote_count: number;
  comment_count: number;
  category?: string;
  estimated_completion?: string;
  completion_date?: string;
  ai_categorized?: boolean;
  ai_confidence?: number;
  ai_reasoning?: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
}


// We'll get the Supabase client inside the component

const statusColumns = {
  open: {
    title: 'Ideas',
    description: 'Community suggestions under consideration',
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'bg-blue-50 border-blue-200',
    headerColor: 'bg-blue-100 text-blue-800',
    limit: 10 // Show top 10 by votes
  },
  planned: {
    title: 'Planned',
    description: 'Features we\'re planning to build',
    icon: <Target className="w-5 h-5" />,
    color: 'bg-yellow-50 border-yellow-200',
    headerColor: 'bg-yellow-100 text-yellow-800',
    limit: null
  },
  in_progress: {
    title: 'In Progress',
    description: 'Currently being developed',
    icon: <Zap className="w-5 h-5" />,
    color: 'bg-orange-50 border-orange-200',
    headerColor: 'bg-orange-100 text-orange-800',
    limit: null
  },
  done: {
    title: 'Completed',
    description: 'Features that have been shipped',
    icon: <CheckCircle className="w-5 h-5" />,
    color: 'bg-green-50 border-green-200',
    headerColor: 'bg-green-100 text-green-800',
    limit: 20 // Show recent completions
  }
};

export default function PublicRoadmap() {
  const params = useParams();
  const projectSlug = params?.slug as string;
  const router = useRouter();
  
  // Ensure we have the required params before rendering
  if (!projectSlug) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Roadmap...</h3>
          <p className="text-gray-600">Please wait while we load the project roadmap</p>
        </div>
      </div>
    );
  }
  
  const [project, setProject] = useState<Project | null>(null);
  const [posts, setPosts] = useState<Record<string, RoadmapPost[]>>({
    open: [],
    planned: [],
    in_progress: [],
    done: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'view' | 'manage'>('view');

  // Stats
  const [stats, setStats] = useState({
    totalIdeas: 0,
    planned: 0,
    inProgress: 0,
    completed: 0,
    completedThisMonth: 0
  });

  const supabase = getSupabaseClient();

  useEffect(() => {
    loadRoadmapData();
  }, [projectSlug]);

  const loadRoadmapData = async () => {
    try {
      setLoading(true);

      // Get project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', projectSlug)
        .single();

      if (projectError || !projectData) {
        console.error('Project not found');
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
        console.error('Board not found');
        return;
      }

      // Get posts grouped by status
      const statusKeys = Object.keys(statusColumns);
      const postsByStatus: Record<string, RoadmapPost[]> = {};

      for (const status of statusKeys) {
        let query = supabase
          .from('posts')
          .select('*')
          .eq('board_id', boardData.id)
          .eq('status', status)
          .is('duplicate_of', null);

        // Apply limits and sorting based on status
        if (status === 'open') {
          // For ideas, show top voted
          query = query.order('vote_count', { ascending: false });
          if (statusColumns[status as keyof typeof statusColumns].limit) {
            query = query.limit(statusColumns[status as keyof typeof statusColumns].limit!);
          }
        } else if (status === 'done') {
          // For completed, show most recent
          query = query.order('updated_at', { ascending: false });
          if (statusColumns[status as keyof typeof statusColumns].limit) {
            query = query.limit(statusColumns[status as keyof typeof statusColumns].limit!);
          }
        } else {
          // For planned and in progress, show by priority (votes) then date
          query = query.order('vote_count', { ascending: false }).order('created_at', { ascending: false });
        }

        const { data: statusPosts, error: statusError } = await query;

        if (statusError) {
          console.error(`Error loading ${status} posts:`, statusError);
          continue;
        }

        postsByStatus[status] = statusPosts?.map((post: {
          id: string;
          title: string;
          description?: string;
          author_email?: string;
          status: string;
          created_at: string;
          vote_count?: number;
          comment_count?: number;
          category?: string;
          estimated_completion?: string;
          completion_date?: string;
        }) => ({
          id: post.id,
          title: post.title,
          description: post.description,
          author_email: post.author_email,
          status: post.status,
          created_at: post.created_at,
          vote_count: post.vote_count || 0,
          comment_count: post.comment_count || 0,
          category: post.category,
          estimated_completion: post.estimated_completion,
          completion_date: post.completion_date
        })) || [];
      }

      setPosts(postsByStatus);

      // Calculate stats
      const totalIdeas = postsByStatus.open?.length || 0;
      const planned = postsByStatus.planned?.length || 0;
      const inProgress = postsByStatus.in_progress?.length || 0;
      const completed = postsByStatus.done?.length || 0;

      // Count completed this month
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const completedThisMonth = postsByStatus.done?.filter(post => 
        new Date(post.completion_date || post.created_at) >= thisMonth
      ).length || 0;

      setStats({
        totalIdeas,
        planned,
        inProgress,
        completed,
        completedThisMonth
      });

    } catch (error) {
      console.error('Error loading roadmap:', error);
      console.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = (statusPosts: RoadmapPost[]) => {
    return statusPosts.filter(post => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (!post.title.toLowerCase().includes(searchLower) &&
            !post.description?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== 'all' && post.category !== categoryFilter) {
        return false;
      }

      // Time filter for completed items
      if (timeFilter !== 'all' && post.status === 'done') {
        const completionDate = new Date(post.completion_date || post.created_at);
        const now = new Date();
        
        switch (timeFilter) {
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return completionDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            return completionDate >= monthAgo;
          case 'quarter':
            const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
            return completionDate >= quarterAgo;
          default:
            return true;
        }
      }

      return true;
    });
  };

  const handleVoteChange = (postId: string, newCount: number) => {
    try {
      if (!postId || typeof newCount !== 'number') {
        console.error('Invalid parameters for handleVoteChange:', { postId, newCount });
        return;
      }
      
      setPosts(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(status => {
          updated[status] = updated[status].map(post =>
            post.id === postId ? { ...post, vote_count: newCount } : post
          );
        });
        return updated;
      });
    } catch (error) {
      console.error('Error in handleVoteChange:', error);
      toast.error('Failed to update vote count');
    }
  };

  const handlePostUpdate = (postId: string, updates: any) => {
    setPosts(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(status => {
        updated[status] = updated[status].map(post =>
          post.id === postId ? { ...post, ...updates } : post
        );
      });
      return updated;
    });
  };

  const handleBulkUpdate = (postIds: string[], updates: any) => {
    setPosts(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(status => {
        updated[status] = updated[status].map(post =>
          postIds.includes(post.id) ? { ...post, ...updates } : post
        );
      });
      return updated;
    });
  };

  const handlePostMove = async (postId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to move post');
      }

      const result = await response.json();

      // Update local state
      setPosts(prev => {
        const updated = { ...prev };
        
        // Remove post from current status
        Object.keys(updated).forEach(status => {
          updated[status] = updated[status].filter(post => post.id !== postId);
        });
        
        // Find the post and add it to new status
        const postToMove = Object.values(prev).flat().find(post => post.id === postId);
        if (postToMove) {
          updated[newStatus] = [...(updated[newStatus] || []), { ...postToMove, status: newStatus }];
        }
        
        return updated;
      });

      // Update stats
      setStats(prevStats => {
        const newStats = { ...prevStats };
        
        // Find the old status of the post
        let oldStatus = '';
        Object.entries(posts).forEach(([status, statusPosts]) => {
          if (statusPosts.find(post => post.id === postId)) {
            oldStatus = status;
          }
        });

        // Update counts
        if (oldStatus === 'open') newStats.totalIdeas--;
        if (oldStatus === 'planned') newStats.planned--;
        if (oldStatus === 'in_progress') newStats.inProgress--;
        if (oldStatus === 'done') newStats.completed--;

        if (newStatus === 'open') newStats.totalIdeas++;
        if (newStatus === 'planned') newStats.planned++;
        if (newStatus === 'in_progress') newStats.inProgress++;
        if (newStatus === 'done') newStats.completed++;

        return newStats;
      });

      toast.success('Post moved successfully!');

    } catch (error) {
      console.error('Move post error:', error);
      toast.error('Failed to move post. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="space-y-4">
                  <div className="h-16 bg-gray-200 rounded"></div>
                  {[1,2,3].map(j => (
                    <div key={j} className="h-32 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <GlobalBanner 
        showBackButton={true} 
        backLabel="Back to Board" 
      />
      
      {/* Temporary Debug Component */}
      <div className="container mx-auto px-4 py-4">
        <DebugRoadmap />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <button onClick={() => router.push(`/${projectSlug}/board`)} className="hover:text-gray-900">
                  {project?.name}
                </button>
                <span>→</span>
                <span>Roadmap</span>
              </div>
              <h1 className="text-4xl font-bold text-gray-900">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Product Roadmap
                </span>
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                See what we&apos;re building and what&apos;s coming next
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-lg p-1 border border-white/20">
                <Button
                  variant={viewMode === 'view' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('view')}
                  className={viewMode === 'view' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                >
                  View
                </Button>
                <Button
                  variant={viewMode === 'manage' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('manage')}
                  className={viewMode === 'manage' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                >
                  Manage
                </Button>
              </div>
              <RoadmapPhaseManager
                posts={posts}
                onPostUpdate={handlePostUpdate}
                onBulkUpdate={handleBulkUpdate}
                projectSlug={projectSlug}
              />
              <Button variant="outline" onClick={() => router.push(`/${projectSlug}/board`)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Board
              </Button>
              <Button onClick={() => router.push(`/${projectSlug}/board`)} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Submit Feedback
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-600">{stats.totalIdeas}</div>
              </div>
              <div className="text-sm text-gray-600">Ideas</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4 text-yellow-600" />
                </div>
                <div className="text-2xl font-bold text-yellow-600">{stats.planned}</div>
              </div>
              <div className="text-sm text-gray-600">Planned</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-orange-600" />
                </div>
                <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-600">{stats.completedThisMonth}</div>
              </div>
              <div className="text-sm text-gray-600">This Month</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search roadmap..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="feature">Features</SelectItem>
                  <SelectItem value="improvement">Improvements</SelectItem>
                  <SelectItem value="bug">Bug Fixes</SelectItem>
                </SelectContent>
              </Select>

              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Roadmap Columns */}
        {viewMode === 'manage' ? (
          <DragDropRoadmap
            posts={posts}
            onPostMove={handlePostMove}
            onVoteChange={handleVoteChange}
            projectSlug={projectSlug}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {Object.entries(statusColumns).map(([status, config]) => {
            const statusPosts = filteredPosts(posts[status] || []);
            
            return (
              <div key={status} className={`rounded-xl border-2 ${config.color} min-h-96 shadow-lg backdrop-blur-sm`}>
                {/* Column Header */}
                <div className={`p-6 rounded-t-xl border-b ${config.headerColor}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {config.icon}
                    <h3 className="font-semibold text-lg">{config.title}</h3>
                    <Badge variant="secondary" className="ml-auto">
                      {statusPosts.length}
                    </Badge>
                  </div>
                  <p className="text-sm opacity-75">{config.description}</p>
                </div>

                {/* Posts */}
                <div className="p-6 space-y-4">
                  {statusPosts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        {config.icon}
                      </div>
                      <p className="text-sm">
                        {status === 'open' ? 'No ideas yet' :
                         status === 'planned' ? 'Nothing planned' :
                         status === 'in_progress' ? 'Nothing in progress' :
                         'Nothing completed'}
                      </p>
                    </div>
                  ) : (
                    statusPosts.filter(post => post && post.id && post.title).map((post) => (
                      <Card 
                        key={post.id} 
                        className="hover:shadow-lg transition-all duration-200 cursor-pointer bg-white/90 backdrop-blur-sm border-white/20 hover:scale-[1.02]"
                        onClick={() => {
                          console.log('Post clicked:', { projectSlug, postId: post.id, postTitle: post.title });
                          try {
                            if (projectSlug && post.id) {
                              const url = `/${projectSlug}/post/${post.id}`;
                              console.log('Navigating to:', url);
                              router.push(url);
                            } else {
                              console.error('Missing projectSlug or post.id:', { projectSlug, postId: post.id });
                              toast.error('Unable to open post. Please try again.');
                            }
                          } catch (error) {
                            console.error('Navigation error:', error);
                            toast.error('Failed to open post. Please try again.');
                          }
                        }}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3">
                            {/* Vote Button (compact for roadmap) */}
                            <VoteButton
                              postId={post.id}
                              initialVoteCount={post.vote_count}
                              onVoteChange={(count) => {
                                try {
                                  handleVoteChange(post.id, count);
                                } catch (error) {
                                  console.error('Error handling vote change:', error);
                                  toast.error('Failed to update vote');
                                }
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
                              size="sm"
                              variant="compact"
                            />

                            {/* Post Content */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 line-clamp-2 mb-2">
                                {post.title}
                              </h4>
                              
                              {post.description && (
                                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
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

                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" />
                                  <span>{post.comment_count}</span>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>
                                    {status === 'done' && post.completion_date
                                      ? new Date(post.completion_date).toLocaleDateString()
                                      : new Date(post.created_at).toLocaleDateString()
                                    }
                                  </span>
                                </div>

                              </div>

                              {/* Estimated completion for planned/in-progress */}
                              {(status === 'planned' || status === 'in_progress') && post.estimated_completion && (
                                <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>ETA: {post.estimated_completion}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}

                  {/* Show More Button for Ideas column */}
                  {status === 'open' && posts[status].length >= (config.limit || 0) && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-3"
                      onClick={() => router.push(`/${projectSlug}/board`)}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View All Ideas
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        )}

        {/* Legend */}
        <div className="mt-12 bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-8">
          <h3 className="font-semibold text-gray-900 mb-4">How our roadmap works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Ideas</span>
              </div>
              <p className="text-gray-600">
                Top community suggestions we&apos;re considering. Vote to help us prioritize!
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-yellow-600" />
                <span className="font-medium">Planned</span>
              </div>
              <p className="text-gray-600">
                Features we&apos;ve committed to building. Timeline estimates included where possible.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-orange-600" />
                <span className="font-medium">In Progress</span>
              </div>
              <p className="text-gray-600">
                Currently in development. Check back regularly for updates!
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-medium">Completed</span>
              </div>
              <p className="text-gray-600">
                Features that have been shipped and are available to use.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}