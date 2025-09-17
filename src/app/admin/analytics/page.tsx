'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Activity,
  Eye,
  MousePointer,
  Clock,
  Calendar
} from 'lucide-react';

interface AnalyticsData {
  totalViews: number;
  uniqueVisitors: number;
  pageViews: number;
  avgSessionDuration: string;
  bounceRate: number;
  topPages: Array<{
    page: string;
    views: number;
    uniqueVisitors: number;
  }>;
  recentActivity: Array<{
    action: string;
    user: string;
    timestamp: string;
  }>;
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalViews: 0,
    uniqueVisitors: 0,
    pageViews: 0,
    avgSessionDuration: '0m 0s',
    bounceRate: 0,
    topPages: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading analytics data
    setTimeout(() => {
      setAnalytics({
        totalViews: 12450,
        uniqueVisitors: 8920,
        pageViews: 18750,
        avgSessionDuration: '3m 24s',
        bounceRate: 32.5,
        topPages: [
          { page: '/app', views: 5420, uniqueVisitors: 3200 },
          { page: '/login', views: 3200, uniqueVisitors: 2800 },
          { page: '/demo/board', views: 2100, uniqueVisitors: 1800 },
          { page: '/pricing', views: 1800, uniqueVisitors: 1500 },
          { page: '/features', views: 1200, uniqueVisitors: 1100 }
        ],
        recentActivity: [
          { action: 'User registered', user: 'user@example.com', timestamp: '2 minutes ago' },
          { action: 'Pro subscription activated', user: 'premium@example.com', timestamp: '5 minutes ago' },
          { action: 'Feedback submitted', user: 'feedback@example.com', timestamp: '8 minutes ago' },
          { action: 'Board shared', user: 'sharer@example.com', timestamp: '12 minutes ago' },
          { action: 'Project created', user: 'creator@example.com', timestamp: '15 minutes ago' }
        ]
      });
      setLoading(false);
    }, 1000);
  }, []);

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
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600">
          Track user engagement, page views, and platform activity
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalViews.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+12.5%</span>
                </div>
              </div>
              <Eye className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unique Visitors</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.uniqueVisitors.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+8.3%</span>
                </div>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Page Views</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.pageViews.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+15.2%</span>
                </div>
              </div>
              <MousePointer className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Session</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.avgSessionDuration}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+5.1%</span>
                </div>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Pages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Top Pages
          </CardTitle>
          <CardDescription>
            Most visited pages on your platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topPages.map((page, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full mr-3">
                    <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{page.page}</p>
                    <p className="text-sm text-gray-600">{page.uniqueVisitors.toLocaleString()} unique visitors</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{page.views.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">total views</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest user actions and platform events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-full mr-3">
                    <Activity className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{activity.action}</p>
                    <p className="text-sm text-gray-600">{activity.user}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {activity.timestamp}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Bounce Rate</CardTitle>
            <CardDescription>
              Percentage of visitors who leave after viewing only one page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-gray-900">{analytics.bounceRate}%</div>
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">-2.1%</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${analytics.bounceRate}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Engagement</CardTitle>
            <CardDescription>
              Average time users spend on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-gray-900">{analytics.avgSessionDuration}</div>
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+5.1%</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Users are spending more time exploring your platform
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
