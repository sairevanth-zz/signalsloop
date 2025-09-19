'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase-client';
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
  plan: string;
  created_at: string;
  projects_count: number;
}

export default function AdminDashboard() {
  const { isAdmin, loading: authLoading, user } = useAdminAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    proUsers: 0,
    freeUsers: 0,
    proProjects: 0,
    freeProjects: 0
  });

  const supabase = getSupabaseClient();

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
    if (!supabase) return;

    try {
      setLoading(true);
      console.log('Loading admin data...');

      // Load all projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          users!projects_owner_id_fkey(email)
        `)
        .order('created_at', { ascending: false });

      if (projectsError) {
        console.error('Error loading projects:', projectsError);
        toast.error('Failed to load projects');
        return;
      }

      // Load all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error loading users:', usersError);
        toast.error('Failed to load users');
        return;
      }

      // Transform projects data
      const transformedProjects = projectsData.map(project => ({
        ...project,
        owner_email: project.users?.email || 'Unknown',
        posts_count: 0 // We'll add this later if needed
      }));

      // Transform users data and add project counts
      const transformedUsers = usersData.map(user => {
        const userProjects = projectsData.filter(p => p.owner_id === user.id);
        return {
          ...user,
          projects_count: userProjects.length
        };
      });

      setProjects(transformedProjects);
      setUsers(transformedUsers);

      // Calculate stats
      const totalUsers = usersData.length;
      const totalProjects = projectsData.length;
      const proUsers = usersData.filter(u => u.plan === 'pro').length;
      const freeUsers = totalUsers - proUsers;
      const proProjects = projectsData.filter(p => p.plan === 'pro').length;
      const freeProjects = totalProjects - proProjects;

      setStats({
        totalUsers,
        totalProjects,
        proUsers,
        freeUsers,
        proProjects,
        freeProjects
      });

      console.log('Admin data loaded:', { totalUsers, totalProjects, proUsers, proProjects });

    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const upgradeUserToPro = async (userId: string, userEmail: string) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ plan: 'pro' })
        .eq('id', userId);

      if (error) {
        console.error('Error upgrading user:', error);
        toast.error('Failed to upgrade user');
        return;
      }

      toast.success(`Successfully upgraded ${userEmail} to Pro!`);
      loadData(); // Reload data
    } catch (error) {
      console.error('Error upgrading user:', error);
      toast.error('Failed to upgrade user');
    }
  };

  const downgradeUserToFree = async (userId: string, userEmail: string) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ plan: 'free' })
        .eq('id', userId);

      if (error) {
        console.error('Error downgrading user:', error);
        toast.error('Failed to downgrade user');
        return;
      }

      toast.success(`Successfully downgraded ${userEmail} to Free!`);
      loadData(); // Reload data
    } catch (error) {
      console.error('Error downgrading user:', error);
      toast.error('Failed to downgrade user');
    }
  };

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
            <span className="text-sm text-gray-600">
              Logged in as: {user?.email}
            </span>
            <Button
              variant="outline"
              onClick={() => {
                const supabase = getSupabaseClient();
                supabase.auth.signOut();
                window.location.href = '/login';
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.proUsers} Pro, {stats.freeUsers} Free
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                {stats.proProjects} Pro, {stats.freeProjects} Free
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pro Users</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.proUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalUsers > 0 ? Math.round((stats.proUsers / stats.totalUsers) * 100) : 0}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Free Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.freeUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalUsers > 0 ? Math.round((stats.freeUsers / stats.totalUsers) * 100) : 0}% of total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Users Management</CardTitle>
            <CardDescription>
              Manage user accounts and subscription plans
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
                      <th className="text-left p-3">Joined</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            {user.email}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge 
                            variant={user.plan === 'pro' ? 'default' : 'secondary'}
                            className={user.plan === 'pro' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                          >
                            {user.plan === 'pro' ? (
                              <>
                                <Crown className="w-3 h-3 mr-1" />
                                Pro
                              </>
                            ) : (
                              'Free'
                            )}
                          </Badge>
                        </td>
                        <td className="p-3">{user.projects_count}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="w-3 h-3" />
                            {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            {user.plan === 'free' ? (
                              <Button
                                size="sm"
                                onClick={() => upgradeUserToPro(user.id, user.email)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Crown className="w-3 h-3 mr-1" />
                                Upgrade to Pro
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downgradeUserToFree(user.id, user.email)}
                                className="text-orange-600 border-orange-300 hover:bg-orange-50"
                              >
                                Downgrade to Free
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
              View all projects and their details
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
                      <th className="text-left p-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
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
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="w-3 h-3" />
                            {new Date(project.created_at).toLocaleDateString()}
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