'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import GlobalBanner from '@/components/GlobalBanner';
import BoardShare from '@/components/BoardShare';
import EnhancedProjectCard from '@/components/EnhancedProjectCard';
import DashboardAnalytics from '@/components/DashboardAnalytics';
import QuickActionsSidebar from '@/components/QuickActionsSidebar';
import EnhancedEmptyState from '@/components/EnhancedEmptyState';
import DashboardSearchFilters from '@/components/DashboardSearchFilters';
import { 
  Plus, 
  Settings, 
  Eye, 
  Users,
  MessageSquare,
  Copy,
  Map,
  TrendingUp,
  Crown,
  BarChart3,
  Brain,
  Zap,
  Share2
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Project {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro';
  created_at: string;
  posts_count?: number;
  votes_count?: number;
  last_activity?: string;
  weekly_posts_trend?: number;
  widget_installed?: boolean;
}

export default function EnhancedDashboardPage() {
  const { user, loading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [userPlan, setUserPlan] = useState<'free' | 'pro'>('free');
  
  // Enhanced dashboard state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBy, setFilterBy] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  const supabase = getSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    if (user && supabase) {
      loadProjects();
      loadUserPlan();
    }
  }, [user, supabase]);

  // Load analytics when projects change
  useEffect(() => {
    if (projects.length > 0) {
      loadAnalytics();
    }
  }, [projects]);

  const loadProjects = async () => {
    if (!user || !supabase) return;

      setProjectsLoading(true);
    try {
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          slug,
          plan,
          created_at
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (projectsError) {
        console.error('Error loading projects:', projectsError);
        toast.error('Failed to load projects');
        return;
      }

      if (!projects || projects.length === 0) {
        setProjects([]);
        return;
      }

      // Get project IDs for counting
      const projectIds = projects.map((p: Project) => p.id);

      // Count posts per project
      const { data: postsCounts, error: postsError } = await supabase
        .from('posts')
        .select('project_id')
        .in('project_id', projectIds);

      // Count votes per project (through posts)
      const { data: votesCounts, error: votesError } = await supabase
        .from('votes')
        .select('post_id, posts!inner(project_id)')
        .in('posts.project_id', projectIds);

      // Calculate counts per project
      const postsCountByProject: Record<string, number> = {};
      const votesCountByProject: Record<string, number> = {};

      // Count posts
      postsCounts?.forEach((post: { project_id: string }) => {
        postsCountByProject[post.project_id] = (postsCountByProject[post.project_id] || 0) + 1;
      });

      // Count votes
      votesCounts?.forEach((vote: { posts: { project_id: string } }) => {
        const projectId = vote.posts?.project_id;
        if (projectId) {
          votesCountByProject[projectId] = (votesCountByProject[projectId] || 0) + 1;
        }
      });

      // Combine projects with counts
      const projectsWithCounts = projects.map((project: Project) => ({
        ...project,
        posts_count: postsCountByProject[project.id] || 0,
        votes_count: votesCountByProject[project.id] || 0,
        last_activity: project.created_at, // TODO: Add real last activity
        weekly_posts_trend: Math.floor(Math.random() * 10) - 5, // TODO: Add real trend data
        widget_installed: project.plan === 'pro' // TODO: Add real widget status
      }));
      
      setProjects(projectsWithCounts);

    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setProjectsLoading(false);
    }
  };

  const loadUserPlan = async () => {
    if (!user || !supabase) return;
    
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('plan')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.log('User plan query error (this is OK, defaulting to free):', error);
        setUserPlan('free');
        return;
      }

      // If user doesn't exist in users table, create them
      if (!userData) {
        console.log('User not found in users table, creating record...');
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            plan: 'free',
            created_at: new Date().toISOString()
          });

        if (insertError) {
          console.log('Could not create user record (this is OK):', insertError);
        }
        setUserPlan('free');
        return;
      }

      setUserPlan(userData?.plan || 'free');
    } catch (error) {
      console.log('Error loading user plan (defaulting to free):', error);
      setUserPlan('free');
    }
  };

  const loadAnalytics = async () => {
    if (!user || !supabase || projects.length === 0) return;
    
    setAnalyticsLoading(true);
    try {
      // Get user's project IDs
      const projectIds = projects.map(p => p.id);
      
      // If no projects, skip analytics
      if (projectIds.length === 0) {
        setAnalyticsLoading(false);
        return;
      }
      
      // Calculate date range for "this week"
      const now = new Date();
      const weekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      
      // Get top posts from this week across all user's projects
      const { data: topPostsData, error: topPostsError } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          vote_count,
          created_at,
          projects!inner(name, slug)
        `)
        .in('project_id', projectIds)
        .gte('created_at', weekAgo.toISOString())
        .order('vote_count', { ascending: false })
        .limit(3);

      if (topPostsError) {
        console.error('Error fetching top posts:', topPostsError);
      }

      // Get recent activity (posts and votes) from the last 7 days
      const { data: recentPosts, error: recentPostsError } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          created_at,
          projects!inner(name, slug)
        `)
        .in('project_id', projectIds)
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentPostsError) {
        console.error('Error fetching recent posts:', recentPostsError);
      }

      // Skip votes query if no recent posts
      let recentVotes = null;
      if (recentPosts && recentPosts.length > 0) {
        const { data: votesData, error: recentVotesError } = await supabase
          .from('votes')
          .select('id, created_at, post_id')
          .in('post_id', recentPosts.map(p => p.id))
          .gte('created_at', weekAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(3);

        if (recentVotesError) {
          console.error('Error fetching recent votes:', recentVotesError);
        } else {
          // Enrich votes with post data
          recentVotes = votesData?.map(vote => {
            const post = recentPosts.find(p => p.id === vote.post_id);
            return {
              ...vote,
              posts: post ? { title: post.title, projects: post.projects } : null
            };
          }).filter(v => v.posts !== null);
        }
      }

      // Process top posts
      const topPosts = (topPostsData || []).map(post => ({
        id: post.id,
        title: post.title,
        votes: post.vote_count || 0,
        project: post.projects?.name || 'Unknown'
      }));

      // Process recent activity
      const recentActivity = [];
      
      // Add recent posts
      (recentPosts || []).forEach(post => {
        recentActivity.push({
          id: `post-${post.id}`,
          type: 'post' as const,
          message: `New feedback submitted: "${post.title}"`,
          timestamp: post.created_at,
          project: post.projects?.name || 'Unknown'
        });
      });

      // Add recent votes
      (recentVotes || []).forEach(vote => {
        recentActivity.push({
          id: `vote-${vote.id}`,
          type: 'vote' as const,
          message: `User voted on "${vote.posts?.title || 'Unknown'}"`,
          timestamp: vote.created_at,
          project: vote.posts?.projects?.name || 'Unknown'
        });
      });

      // Sort recent activity by timestamp and limit to 3
      recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      recentActivity.splice(3);

      // Calculate weekly growth (simplified - compare current week vs previous week)
      const previousWeek = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
      const { data: previousWeekPosts } = await supabase
        .from('posts')
        .select('id')
        .in('project_id', projectIds)
        .gte('created_at', previousWeek.toISOString())
        .lt('created_at', weekAgo.toISOString());

      const currentWeekCount = recentPosts?.length || 0;
      const previousWeekCount = previousWeekPosts?.length || 0;
      const weeklyGrowth = previousWeekCount > 0 
        ? Math.round(((currentWeekCount - previousWeekCount) / previousWeekCount) * 100)
        : currentWeekCount > 0 ? 100 : 0;

      const analytics = {
        totalProjects: projects.length,
        totalPosts: projects.reduce((sum, p) => sum + (p.posts_count || 0), 0),
        totalVotes: projects.reduce((sum, p) => sum + (p.votes_count || 0), 0),
        activeWidgets: projects.filter(p => p.plan === 'pro').length,
        weeklyGrowth,
        topPosts,
        recentActivity
      };

      setAnalytics(analytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Set empty analytics to prevent dashboard from crashing
      setAnalytics({
        totalProjects: projects.length,
        totalPosts: 0,
        totalVotes: 0,
        activeWidgets: 0,
        weeklyGrowth: 0,
        topPosts: [],
        recentActivity: []
      });
      toast.error('Failed to load analytics data');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Enhanced dashboard functions
  const handleProjectSelect = (projectId: string, selected: boolean) => {
    setSelectedProjects(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(projectId);
      } else {
        newSet.delete(projectId);
      }
      return newSet;
    });
  };

  const handleBulkAction = (action: string) => {
    const selectedIds = Array.from(selectedProjects);
    if (selectedIds.length === 0) {
      toast.error('No projects selected');
      return;
    }

    switch (action) {
      case 'archive':
        toast.info(`Archiving ${selectedIds.length} projects...`);
        break;
      case 'duplicate':
        toast.info(`Duplicating ${selectedIds.length} projects...`);
        break;
      case 'export':
        toast.info(`Exporting ${selectedIds.length} projects...`);
        break;
      case 'delete':
        toast.info(`Deleting ${selectedIds.length} projects...`);
        break;
    }
  };

  const handleExport = () => {
    toast.info('Exporting project data...');
  };

  const handleCreateFromTemplate = (template: string) => {
    // Navigate to create page with template parameter
    router.push(`/app/create?template=${template}`);
  };

  const handleLoadSampleData = () => {
    toast.info('Loading sample data...');
    // TODO: Implement sample data loading
  };

  if (loading || projectsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <GlobalBanner />
        <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div>
                  <Skeleton className="h-8 w-32 mb-2" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Skeleton className="h-8 w-48 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <GlobalBanner />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Enhanced Dashboard Layout */}
        {projects.length === 0 ? (
          <EnhancedEmptyState 
            onCreateProject={() => router.push('/app/create')}
            onLoadSampleData={handleLoadSampleData}
            userPlan={userPlan}
          />
        ) : (
          <div className="flex gap-8">
            {/* Main Content */}
            <div className="flex-1 space-y-6">
              {/* Analytics Cards */}
              {analytics && (
                <DashboardAnalytics 
                  analytics={analytics}
                  loading={analyticsLoading}
                />
              )}

              {/* Search and Filters */}
              <DashboardSearchFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                sortBy={sortBy}
                onSortChange={setSortBy}
                sortOrder={sortOrder}
                onSortOrderChange={setSortOrder}
                filterBy={filterBy}
                onFilterChange={setFilterBy}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                selectedCount={selectedProjects.size}
                onBulkAction={handleBulkAction}
                onExport={handleExport}
              />

              {/* Projects Grid/List */}
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                : "space-y-4"
              }>
                {projects
                  .filter(project => {
                    if (searchTerm) {
                      return project.name.toLowerCase().includes(searchTerm.toLowerCase());
                    }
                    return true;
                  })
                  .filter(project => {
                    switch (filterBy) {
                      case 'free': return project.plan === 'free';
                      case 'pro': return project.plan === 'pro';
                      case 'active': return (project.posts_count || 0) > 0;
                      case 'inactive': return (project.posts_count || 0) === 0;
                      default: return true;
                    }
                  })
                  .sort((a, b) => {
                    let aValue, bValue;
                    switch (sortBy) {
                      case 'name': 
                        aValue = a.name.toLowerCase();
                        bValue = b.name.toLowerCase();
                        break;
                      case 'created_at':
                        aValue = new Date(a.created_at).getTime();
                        bValue = new Date(b.created_at).getTime();
                        break;
                      case 'posts_count':
                        aValue = a.posts_count || 0;
                        bValue = b.posts_count || 0;
                        break;
                      case 'votes_count':
                        aValue = a.votes_count || 0;
                        bValue = b.votes_count || 0;
                        break;
                      default:
                        aValue = new Date(a.created_at).getTime();
                        bValue = new Date(b.created_at).getTime();
                    }
                    
                    if (sortOrder === 'asc') {
                      return aValue > bValue ? 1 : -1;
                    } else {
                      return aValue < bValue ? 1 : -1;
                    }
                  })
                  .map((project, index) => (
                    <EnhancedProjectCard
                key={project.id} 
                      project={project}
                      index={index}
                      isSelected={selectedProjects.has(project.id)}
                      onSelect={handleProjectSelect}
                      onArchive={(id) => handleBulkAction('archive')}
                      onDuplicate={(id) => handleBulkAction('duplicate')}
                      onShare={(project) => {
                          setSelectedProject(project);
                          setShareModalOpen(true);
                        }}
                      aiAvailable={true}
                    />
                  ))}
              </div>
                    </div>

            {/* Quick Actions Sidebar */}
            <QuickActionsSidebar
              onCreateProject={() => router.push('/app/create')}
              onCreateFromTemplate={handleCreateFromTemplate}
              userPlan={userPlan}
            />
          </div>
        )}
      </main>

        {/* Share Modal */}
        <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Share {selectedProject?.name}</DialogTitle>
            </DialogHeader>
            {selectedProject && (
              <BoardShare
              project={selectedProject}
              onClose={() => setShareModalOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
    </div>
  );
}
