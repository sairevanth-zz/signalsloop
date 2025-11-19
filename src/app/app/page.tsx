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
  Sparkles,
  Search,
  X
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
  is_owner?: boolean;
  member_role?: 'owner' | 'admin' | 'member';
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

      // Identify user in analytics
      import('@/lib/analytics').then(({ analytics }) => {
        analytics.identify(user.id, {
          email: user.email,
          created_at: user.created_at || new Date().toISOString()
        });
      });
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
      // Get projects owned by the user
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          slug,
          plan,
          created_at
        `)
        .eq('owner_id', user.id);

      if (ownedError) {
        console.error('Error loading owned projects:', ownedError);
      }

      // Get projects where user is a member
      const { data: membershipData, error: membershipError } = await supabase
        .from('members')
        .select(`
          role,
          projects (
            id,
            name,
            slug,
            plan,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (membershipError) {
        console.error('Error loading member projects:', membershipError);
      }

      // Combine owned and member projects (avoid duplicates)
      const allProjects = [];
      const seenProjectIds = new Set<string>();

      // Add owned projects first
      if (ownedProjects) {
        ownedProjects.forEach(project => {
          allProjects.push({
            ...project,
            is_owner: true,
            member_role: 'owner' as const,
          });
          seenProjectIds.add(project.id);
        });
      }

      // Add member projects (skip if already added as owner)
      if (membershipData) {
        membershipData.forEach(membership => {
          if (membership.projects && !seenProjectIds.has(membership.projects.id)) {
            allProjects.push({
              ...membership.projects,
              is_owner: false,
              member_role: membership.role as 'admin' | 'member',
            });
            seenProjectIds.add(membership.projects.id);
          }
        });
      }

      // Sort by created_at descending
      allProjects.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const projects = allProjects;

      if (!projects || projects.length === 0) {
        setProjects([]);
        setProjectsLoading(false);
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

      const { data: accountProfile, error: profileError } = await supabase
        .from('account_billing_profiles')
        .select('plan')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.log('User plan query error (this is OK, defaulting to free):', error);
      }

      if (profileError) {
        console.log('Account billing profile query error:', profileError);
      }

      // Ensure we have a users row so other legacy checks continue to work
      if (!userData) {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            plan: accountProfile?.plan || 'free',
            created_at: new Date().toISOString(),
          });

        if (insertError) {
          console.log('Could not create user record (this is OK):', insertError);
        }
      }

      const resolvedPlan = accountProfile?.plan || userData?.plan || 'free';
      setUserPlan(resolvedPlan);

      if (resolvedPlan === 'pro' && userData?.plan !== 'pro') {
        const { error: updateUserPlanError } = await supabase
          .from('users')
          .update({ plan: 'pro', updated_at: new Date().toISOString() })
          .eq('id', user.id);

        if (updateUserPlanError) {
          console.log('Failed to update users.plan to pro:', updateUserPlanError);
        }
      }
    } catch (error) {
      console.log('Error loading user plan (defaulting to free):', error);
      setUserPlan('free');
    }
  };

  const loadAnalytics = async () => {
    if (!user || !supabase) return;

    setAnalyticsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/app/dashboard/analytics', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Analytics request failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      setAnalytics(result.analytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
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

  if (loading || projectsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 safe-top safe-bottom">
        <GlobalBanner />
        <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4">
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

        <main className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
          <div className="space-y-4 sm:space-y-6">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
    <div className="min-h-screen bg-slate-50 safe-top safe-bottom">
      <GlobalBanner />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Enhanced Dashboard Layout */}
        {projects.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="max-w-xl w-full bg-white/80 backdrop-blur-sm border border-white/40 rounded-2xl shadow-lg p-8 sm:p-10 text-center space-y-6">
              <div className="w-16 h-16 bg-blue-500 rounded-2xl mx-auto flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">
                  Welcome to SignalsLoop
                </h2>
                <p className="text-sm sm:text-base text-slate-600">
                  You’re ready to start collecting product feedback. Create your first project to spin up a board and share it with your customers.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <Button
                  size="lg"
                  onClick={() => router.push('/app/create')}
                  className="w-full sm:w-auto"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Project
                </Button>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Prefer to explore first? You can always set up widgets or invite teammates later from your project dashboard.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
            {/* Main Content */}
            <div className="flex-1 space-y-4 sm:space-y-6 min-w-0">
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
                ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6" 
                : "space-y-3 sm:space-y-4"
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

            {/* Quick Actions Sidebar - Hidden on mobile */}
            <div className="hidden lg:block">
              <QuickActionsSidebar
                onCreateProject={() => router.push('/app/create')}
                onCreateFromTemplate={handleCreateFromTemplate}
                userPlan={userPlan}
              />
            </div>
            
            {/* Mobile Quick Action Button */}
            <div className="lg:hidden fixed bottom-6 right-6 z-50 safe-bottom">
              <Button
                onClick={() => router.push('/app/create')}
                size="lg"
                className="rounded-full w-14 h-14 shadow-xl bg-blue-600 hover:bg-blue-700 active:scale-90 transition-transform min-touch-target tap-highlight-transparent"
              >
                <Plus className="h-6 w-6" />
              </Button>
            </div>
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
