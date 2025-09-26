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
  Sparkles,
  Brain,
  Zap,
  Share2,
  CreditCard,
  LogOut
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
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      setUserPlan(subscription?.plan || 'free');
    } catch (error) {
      console.error('Error loading user plan:', error);
      setUserPlan('free');
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      // Mock analytics data - replace with real API call
      const mockAnalytics = {
        totalProjects: projects.length,
        totalPosts: projects.reduce((sum, p) => sum + (p.posts_count || 0), 0),
        totalVotes: projects.reduce((sum, p) => sum + (p.votes_count || 0), 0),
        activeWidgets: projects.filter(p => p.plan === 'pro').length,
        weeklyGrowth: 12,
        topPosts: [
          {
            id: '1',
            title: 'Dark mode support',
            votes: 45,
            project: 'My App'
          },
          {
            id: '2',
            title: 'Mobile app improvements',
            votes: 32,
            project: 'My App'
          }
        ],
        recentActivity: [
          {
            id: '1',
            type: 'post',
            message: 'New feedback submitted: "Add dark mode"',
            timestamp: new Date().toISOString(),
            project: 'My App'
          },
          {
            id: '2',
            type: 'vote',
            message: 'User voted on "Mobile improvements"',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            project: 'My App'
          }
        ]
      };
      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
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
    toast.info(`Creating project from ${template} template...`);
    // TODO: Implement template-based project creation
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
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">SignalsLoop</h1>
                <p className="text-sm text-gray-600">Enhanced Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/app/billing">
                <Button variant="outline" size="sm">
                  <CreditCard className="w-4 h-4 mr-2" />
                  {userPlan === 'pro' ? 'Pro Plan' : 'Upgrade'}
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  supabase.auth.signOut();
                  router.push('/');
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

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
