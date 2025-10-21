'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Crown, 
  Gift, 
  BarChart3,
  Settings,
  LogOut,
  Mail,
  Calendar,
  CheckCircle,
  AlertCircle,
  Search,
  RefreshCw,
  TrendingUp,
  MessageSquare,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface Project {
  id: string;
  name: string;
  slug: string;
  plan: string;
  owner_id: string;
  created_at: string;
  posts_count: number;
  owner_email?: string;
}

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  email_confirmed_at: string;
  projects_count: number;
  pro_projects: number;
  free_projects: number;
  has_pro_subscription: boolean;
}

interface Stats {
  overview: {
    totalUsers: number;
    totalProjects: number;
    totalPosts: number;
    totalComments: number;
    proUsers: number;
    freeUsers: number;
    proProjects: number;
    freeProjects: number;
  };
  recentActivity: {
    newUsers: number;
    newProjects: number;
    newPosts: number;
    newUsersThisWeek: number;
    newProUsersThisMonth: number;
  };
  postsByStatus: {
    open: number;
    planned: number;
    in_progress: number;
    done: number;
    declined: number;
  };
  conversion: {
    proUserPercentage: number;
    proProjectPercentage: number;
  };
  revenue?: {
    mrr: number;
    totalRevenue: number;
    avgRevenuePerUser: number;
  };
}

export default function AdminDashboard() {
  const { isAdmin, loading: authLoading, user } = useAdminAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      console.log('Not admin, redirecting to login');
      window.location.href = '/login';
      return;
    }
    
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, authLoading]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading admin data...');

      // Load all data in parallel
      const [statsResponse, usersResponse, projectsResponse] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch('/api/admin/projects')
      ]);

      // Parse all responses
      const [statsData, usersData, projectsData] = await Promise.all([
        statsResponse.json().catch(() => ({ stats: null, error: 'Parse error' })),
        usersResponse.json().catch(() => ({ users: [], error: 'Parse error' })),
        projectsResponse.json().catch(() => ({ projects: [], error: 'Parse error' }))
      ]);

      // Check for errors and show specific messages
      if (!statsResponse.ok) {
        console.error('Stats API error:', statsData);
        toast.error(`Stats: ${statsData.error || 'Failed to load'}`);
      }
      
      if (!usersResponse.ok) {
        console.error('Users API error:', usersData);
        toast.error(`Users: ${usersData.error || 'Failed to load'}`);
      }
      
      if (!projectsResponse.ok) {
        console.error('Projects API error:', projectsData);
        toast.error(`Projects: ${projectsData.error || 'Failed to load'}`);
      }

      if (statsData.stats) setStats(statsData.stats);
      if (usersData.users) setUsers(usersData.users);
      if (projectsData.projects) setProjects(projectsData.projects);

      console.log('Admin data loaded:', {
        stats: !!statsData.stats,
        usersCount: usersData.users?.length || 0,
        projectsCount: projectsData.projects?.length || 0
      });
      
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId: string, userEmail: string, action: 'upgrade' | 'downgrade') => {
    try {
      setActionLoading(userId);
      
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action: action === 'upgrade' ? 'upgrade_to_pro' : 'downgrade_to_free'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      const result = await response.json();
      toast.success(result.message);
      loadData(); // Reload data
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(`Failed to ${action} user`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleProjectAction = async (projectId: string, action: 'upgrade' | 'downgrade') => {
    try {
      setActionLoading(projectId);
      
      const response = await fetch('/api/admin/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          action: 'update_plan',
          plan: action === 'upgrade' ? 'pro' : 'free'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      const result = await response.json();
      toast.success(result.message);
      loadData(); // Reload data
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error(`Failed to ${action} project`);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter data based on search term
  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.owner_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Access Denied</CardTitle>
            <CardDescription className="text-center">
              You don't have admin privileges. Redirecting to login...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Manage users, projects, and subscriptions</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <span className="text-sm text-gray-600">
              Logged in as: {user?.email}
            </span>
            <Button
              variant="outline"
              onClick={() => {
                const supabase = require('@/lib/supabase-client').getSupabaseClient();
                supabase.auth.signOut();
                window.location.href = '/login';
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search users or projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Key Metrics */}
        {stats && (
          <>
            {/* Primary Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-900">Total Users</CardTitle>
                  <Users className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-900">{stats.overview.totalUsers}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-green-600 text-white">{stats.overview.proUsers} Pro</Badge>
                    <Badge variant="secondary">{stats.overview.freeUsers} Free</Badge>
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    +{stats.recentActivity.newUsersThisWeek || 0} this week
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-900">Projects</CardTitle>
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-900">{stats.overview.totalProjects}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-purple-600 text-white">{stats.overview.proProjects} Pro</Badge>
                    <Badge variant="secondary">{stats.overview.freeProjects} Free</Badge>
                  </div>
                  <p className="text-xs text-purple-700 mt-2">
                    {stats.overview.totalPosts} total posts
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-900">Conversion Rate</CardTitle>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-900">{stats.conversion.proUserPercentage}%</div>
                  <p className="text-xs text-green-700 mt-2">
                    Users with Pro subscriptions
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    +{stats.recentActivity.newProUsersThisMonth || 0} Pro this month
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-orange-900">
                    {stats.revenue ? 'MRR' : 'Active Users'}
                  </CardTitle>
                  <Gift className="h-5 w-5 text-orange-600" />
                </CardHeader>
                <CardContent>
                  {stats.revenue ? (
                    <>
                      <div className="text-3xl font-bold text-orange-900">
                        ${stats.revenue.mrr.toFixed(0)}
                      </div>
                      <p className="text-xs text-orange-700 mt-2">
                        Monthly Recurring Revenue
                      </p>
                      <p className="text-xs text-orange-600 mt-1">
                        ${stats.revenue.avgRevenuePerUser.toFixed(2)} avg/user
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-3xl font-bold text-orange-900">{stats.overview.proUsers}</div>
                      <p className="text-xs text-orange-700 mt-2">
                        Paying customers
                      </p>
                      <p className="text-xs text-orange-600 mt-1">
                        {stats.overview.proProjects} Pro projects
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Platform activity overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold text-blue-900">{stats.recentActivity.newUsers}</p>
                      <p className="text-sm text-blue-700">New Users</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
                    <BarChart3 className="h-8 w-8 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold text-purple-900">{stats.recentActivity.newProjects}</p>
                      <p className="text-sm text-purple-700">New Projects</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                    <FileText className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold text-green-900">{stats.recentActivity.newPosts}</p>
                      <p className="text-sm text-green-700">New Posts</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Users Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Users Management</CardTitle>
            <CardDescription>
              Manage user accounts and subscription plans ({filteredUsers.length} users)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading users...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">Plan</th>
                      <th className="text-left p-3">Projects</th>
                      <th className="text-left p-3">Last Sign In</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            {user.email}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge 
                            variant={user.has_pro_subscription ? 'default' : 'secondary'}
                            className={user.has_pro_subscription ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                          >
                            {user.has_pro_subscription ? (
                              <>
                                <Crown className="w-3 h-3 mr-1" />
                                Pro ({user.pro_projects} projects)
                              </>
                            ) : (
                              'Free'
                            )}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <div>{user.projects_count} total</div>
                            <div className="text-gray-500">
                              {user.pro_projects} Pro, {user.free_projects} Free
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="w-3 h-3" />
                            {user.last_sign_in_at ? 
                              new Date(user.last_sign_in_at).toLocaleDateString() : 
                              'Never'
                            }
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            {user.has_pro_subscription ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUserAction(user.id, user.email, 'downgrade')}
                                disabled={actionLoading === user.id}
                                className="text-orange-600 border-orange-300 hover:bg-orange-50"
                              >
                                {actionLoading === user.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  'Downgrade to Free'
                                )}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleUserAction(user.id, user.email, 'upgrade')}
                                disabled={actionLoading === user.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {actionLoading === user.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <Crown className="w-3 h-3 mr-1" />
                                    Upgrade to Pro
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projects Table */}
        <Card>
          <CardHeader>
            <CardTitle>Projects Overview</CardTitle>
            <CardDescription>
              View all projects and their details ({filteredProjects.length} projects)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading projects...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Project Name</th>
                      <th className="text-left p-3">Slug</th>
                      <th className="text-left p-3">Owner</th>
                      <th className="text-left p-3">Plan</th>
                      <th className="text-left p-3">Posts</th>
                      <th className="text-left p-3">Created</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((project) => (
                      <tr key={project.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{project.name}</td>
                        <td className="p-3">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                            {project.slug}
                          </code>
                        </td>
                        <td className="p-3">{project.owner_email}</td>
                        <td className="p-3">
                          <Badge 
                            variant={project.plan === 'pro' ? 'default' : 'secondary'}
                            className={project.plan === 'pro' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                          >
                            {project.plan === 'pro' ? (
                              <>
                                <Crown className="w-3 h-3 mr-1" />
                                Pro
                              </>
                            ) : (
                              'Free'
                            )}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-gray-400" />
                            {project.posts_count}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="w-3 h-3" />
                            {new Date(project.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            {project.plan === 'free' ? (
                              <Button
                                size="sm"
                                onClick={() => handleProjectAction(project.id, 'upgrade')}
                                disabled={actionLoading === project.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {actionLoading === project.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <Crown className="w-3 h-3 mr-1" />
                                    Upgrade to Pro
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleProjectAction(project.id, 'downgrade')}
                                disabled={actionLoading === project.id}
                                className="text-orange-600 border-orange-300 hover:bg-orange-50"
                              >
                                {actionLoading === project.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  'Downgrade to Free'
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}