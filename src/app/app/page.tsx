'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Settings, 
  Eye, 
  LogOut,
  Users,
  MessageSquare,
  Copy,
  Map,
  TrendingUp,
  Crown,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro';
  created_at: string;
  posts_count?: number;
  votes_count?: number;
}

export default function AppPage() {
  const { user, loading, signOut } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const supabase = getSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    // Load projects if user is authenticated
    if (user && supabase) {
      loadProjects();
    }
  }, [user, loading, router, supabase]);

  // Check for refresh parameter and reload projects
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('refresh')) {
        // Remove the refresh parameter from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        
        // Reload projects if user is authenticated
        if (user && supabase) {
          loadProjects();
        }
      }
    }
  }, [user, supabase]);

  const loadProjects = async () => {
    if (!supabase || !user) return;

    try {
      setProjectsLoading(true);
      console.log('Loading projects for user:', user.id, user.email);
      
      // First, get all projects
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

      console.log('Projects query result:', { projects, projectsError });

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

      console.log('Posts counts result:', { postsCounts, postsError });

      // Count votes per project (through posts)
      const { data: votesCounts, error: votesError } = await supabase
        .from('votes')
        .select('post_id, posts!inner(project_id)')
        .in('posts.project_id', projectIds);

      console.log('Votes counts result:', { votesCounts, votesError });

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
        votes_count: votesCountByProject[project.id] || 0
      }));
      
      console.log('Projects with counts:', projectsWithCounts);
      setProjects(projectsWithCounts);

    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  const copyEmbedCode = (slug: string) => {
    const embedCode = `<script src="https://signalsloop.com/embed/${slug}.js"></script>`;
    navigator.clipboard.writeText(embedCode);
    toast.success('Embed code copied to clipboard!');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading || projectsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header Skeleton */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-6">
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

        {/* Main Content Skeleton */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          {/* Welcome Section Skeleton */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-8 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Skeleton className="h-10 w-64 mb-4" />
                <Skeleton className="h-6 w-96" />
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <Skeleton className="w-24 h-20 rounded-xl" />
                <Skeleton className="w-24 h-20 rounded-xl" />
                <Skeleton className="w-24 h-20 rounded-xl" />
              </div>
            </div>
          </div>

          {/* Create Project Skeleton */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
          </div>

          {/* Projects Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/90 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <Skeleton className="h-16 rounded-lg" />
                  <Skeleton className="h-16 rounded-lg" />
                </div>
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <Skeleton className="h-8 flex-1 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                  <Skeleton className="h-7 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  SignalLoop
                </span>
                <p className="text-sm text-gray-600">Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {user && (
                <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-gray-700 font-medium">{user.email}</span>
                </div>
              )}
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                className="bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/80"
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
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-8 mb-6 transform transition-all duration-300 hover:shadow-xl animate-bounce-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2 animate-fade-in">
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Welcome back! ✨
                  </span>
                </h1>
                <p className="text-gray-600 text-lg animate-fade-in-delay">
                  Manage your feedback boards and track user engagement
                </p>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200 transform transition-all duration-300 hover:scale-105 hover:shadow-lg animate-slide-in-right">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center animate-pulse">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-blue-600 transition-all duration-500">{projects.length}</div>
                  </div>
                  <div className="text-sm text-gray-600">Projects</div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 transform transition-all duration-300 hover:scale-105 hover:shadow-lg animate-slide-in-right-delay">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center animate-pulse">
                      <MessageSquare className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="text-2xl font-bold text-green-600 transition-all duration-500">
                      {projects.reduce((sum, p) => sum + (p.posts_count || 0), 0)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">Total Posts</div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200 transform transition-all duration-300 hover:scale-105 hover:shadow-lg animate-slide-in-right-delay-2">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center animate-pulse">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="text-2xl font-bold text-purple-600 transition-all duration-500">
                      {projects.reduce((sum, p) => sum + (p.votes_count || 0), 0)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">Total Votes</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Create New Project */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mr-3">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                  Create New Project
                </h2>
                <p className="text-gray-600 ml-11">
                  Start collecting feedback from your users
                </p>
              </div>
              <Link href="/app/create">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg animate-bounce-in">
            <div className="text-center py-16 px-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-float">
                <MessageSquare className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3 gradient-text-animated">No projects yet</h3>
              <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
                Create your first project to start collecting valuable feedback from your users
              </p>
              <Link href="/app/create">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg text-lg px-8 py-3 hover:scale-105 transition-all duration-200">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Project
                </Button>
              </Link>
              
              {/* Quick Tips */}
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-200">
                  <div className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center mb-3">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-blue-900 mb-2">Collect Feedback</h4>
                  <p className="text-sm text-blue-700">Let users submit ideas and vote on features</p>
                </div>
                <div className="bg-green-50/50 rounded-lg p-4 border border-green-200">
                  <div className="w-8 h-8 bg-green-200 rounded-lg flex items-center justify-center mb-3">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-green-900 mb-2">Track Progress</h4>
                  <p className="text-sm text-green-700">See what&apos;s popular and prioritize development</p>
                </div>
                <div className="bg-purple-50/50 rounded-lg p-4 border border-purple-200">
                  <div className="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center mb-3">
                    <Map className="w-4 h-4 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-purple-900 mb-2">Share Roadmap</h4>
                  <p className="text-sm text-purple-700">Show users what you&apos;re working on</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => (
              <div 
                key={project.id} 
                className="bg-white/90 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group animate-bounce-in hover-lift"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Created {formatDate(project.created_at)}
                      </p>
                    </div>
                    <div className="ml-3">
                      {project.plan === 'pro' ? (
                        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 shadow-sm">
                          <Crown className="w-3 h-3 mr-1" />
                          Pro
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                          Free
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-blue-200 rounded-md flex items-center justify-center">
                          <MessageSquare className="w-3 h-3 text-blue-600" />
                        </div>
                        <div className="text-lg font-bold text-blue-700">{project.posts_count || 0}</div>
                      </div>
                      <div className="text-xs text-blue-600">Posts</div>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-green-200 rounded-md flex items-center justify-center">
                          <TrendingUp className="w-3 h-3 text-green-600" />
                        </div>
                        <div className="text-lg font-bold text-green-700">{project.votes_count || 0}</div>
                      </div>
                      <div className="text-xs text-green-600">Votes</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    <div className="flex space-x-2">
                      <Link href={`/${project.slug}/board`} className="flex-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/80 transition-all duration-200 hover:scale-105"
                        >
                          <Eye className="w-4 h-4 mr-1 transition-transform duration-200 group-hover:scale-110" />
                          View Board
                        </Button>
                      </Link>
                      <Link href={`/${project.slug}/roadmap`}>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/80 transition-all duration-200 hover:scale-105"
                          title="View Roadmap"
                        >
                          <Map className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                        </Button>
                      </Link>
                      <Link href={`/${project.slug}/settings`}>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/80 transition-all duration-200 hover:scale-105"
                          title="Project Settings"
                        >
                          <Settings className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                        </Button>
                      </Link>
                    </div>

                    {/* Embed Code */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyEmbedCode(project.slug)}
                      className="w-full text-xs bg-gray-50/80 hover:bg-gray-100/80 border border-gray-200/50"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy Embed Code
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Floating Action Button */}
        <div className="fixed bottom-8 right-8 z-50">
          <Link href="/app/create">
            <Button 
              size="lg"
              className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 animate-float"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
