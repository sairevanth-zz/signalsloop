'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Percent, 
  BarChart3, 
  Crown,
  TrendingUp,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  FileText,
  Search
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';

interface DashboardStats {
  totalUsers: number;
  totalProjects: number;
  proUsers: number;
  freeUsers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  activeDiscountCodes: number;
  totalGifts: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalProjects: 0,
    proUsers: 0,
    freeUsers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    activeDiscountCodes: 0,
    totalGifts: 0
  });
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    if (!supabase) return;

    try {
      // Load users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id');

      // Load projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, plan, owner_id');

      // Load discount codes
      const { data: discountCodes, error: codesError } = await supabase
        .from('discount_codes')
        .select('id, is_active');

      if (usersError || projectsError || codesError) {
        console.error('Error loading stats:', { usersError, projectsError, codesError });
        return;
      }

      const proProjects = projects?.filter(p => p.plan === 'pro') || [];
      const proUserIds = new Set(proProjects.map(p => p.owner_id));

      setStats({
        totalUsers: users?.length || 0,
        totalProjects: projects?.length || 0,
        proUsers: proUserIds.size,
        freeUsers: (users?.length || 0) - proUserIds.size,
        totalRevenue: 0, // You can calculate this based on your billing system
        monthlyRevenue: 0, // You can calculate this based on your billing system
        activeDiscountCodes: discountCodes?.filter(c => c.is_active).length || 0,
        totalGifts: 0 // You can add this from your gifts table
      });

    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: '+12%',
      changeType: 'increase' as const
    },
    {
      title: 'Total Projects',
      value: stats.totalProjects,
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: '+8%',
      changeType: 'increase' as const
    },
    {
      title: 'Pro Users',
      value: stats.proUsers,
      icon: Crown,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: '+15%',
      changeType: 'increase' as const
    },
    {
      title: 'Free Users',
      value: stats.freeUsers,
      icon: Users,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      change: '+5%',
      changeType: 'increase' as const
    },
    {
      title: 'Active Discount Codes',
      value: stats.activeDiscountCodes,
      icon: Percent,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      change: '+2',
      changeType: 'increase' as const
    },
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      change: '+18%',
      changeType: 'increase' as const
    }
  ];

  const quickActions = [
    {
      title: 'Gift Subscription',
      description: 'Give Pro access to a user',
      icon: Gift,
      href: '/admin/subscriptions',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Create Discount Code',
      description: 'Generate promotional codes',
      icon: Percent,
      href: '/admin/discount-codes',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'View Analytics',
      description: 'Check user engagement',
      icon: BarChart3,
      href: '/admin/analytics',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'SEO Tools',
      description: 'Manage SEO settings',
      icon: Search,
      href: '/admin/seo',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">
          Overview of your SignalsLoop platform and management tools
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <div className="flex items-center mt-1">
                    {stat.changeType === 'increase' ? (
                      <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm font-medium ${
                      stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">from last month</span>
                  </div>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className={`p-3 rounded-full ${action.bgColor} w-fit mb-4`}>
                  <action.icon className={`h-6 w-6 ${action.color}`} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{action.description}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => window.location.href = action.href}
                >
                  Open
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest actions and system events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-full mr-3">
                  <Users className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">New user registered</p>
                  <p className="text-sm text-gray-600">user@example.com joined the platform</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">2 hours ago</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-full mr-3">
                  <Crown className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Pro subscription activated</p>
                  <p className="text-sm text-gray-600">user@example.com upgraded to Pro</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">4 hours ago</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-full mr-3">
                  <Percent className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Discount code used</p>
                  <p className="text-sm text-gray-600">WELCOME20 code redeemed</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">6 hours ago</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-full mr-3">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">New project created</p>
                  <p className="text-sm text-gray-600">"My Product Feedback" project started</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">8 hours ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
