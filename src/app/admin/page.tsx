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

      if (!statsResponse.ok || !usersResponse.ok || !projectsResponse.ok) {
        throw new Error('Failed to fetch admin data');
      }

      const [statsData, usersData, projectsData] = await Promise.all([
        statsResponse.json(),
        usersResponse.json(),
        projectsResponse.json()
      ]);

      setStats(statsData.stats);
      setUsers(usersData.users);
      setProjects(projectsData.projects);

      console.log('Admin data loaded successfully');
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

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.overview.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.overview.proUsers} Pro, {stats.overview.freeUsers} Free
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.overview.totalProjects}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.overview.proProjects} Pro, {stats.overview.freeProjects} Free
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.overview.totalPosts}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.recentActivity.newPosts} new this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.conversion.proUserPercentage}%</div>
                <p className="text-xs text-muted-foreground">
                  Users with Pro subscriptions
                </p>
              </CardContent>
            </Card>
          </div>
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