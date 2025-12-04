'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  TrendingUp,
  Clock,
  Star,
  MessageSquare,
  Users,
  Zap,
  Award,
  ArrowLeft,
  History,
  Sparkles
} from 'lucide-react';

interface Analytics {
  queryCountByRole: Array<{ role: string; count: number }>;
  avgGenerationTime: number;
  avgRating: number;
  totalQueries: number;
  popularQueries: Array<{ query: string; count: number; rating: number }>;
  timeDistribution: Array<{ hour: number; count: number }>;
  ratingDistribution: Array<{ rating: number; count: number }>;
  performanceByRole: Array<{ role: string; avgTime: number; p95Time: number }>;
}

const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#6366f1'];

export default function StakeholderAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [projectId, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/stakeholder/analytics?projectId=${projectId}&timeRange=${timeRange}`
      );

      if (!response.ok) throw new Error('Failed to fetch analytics');

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('[Analytics] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">Failed to load analytics</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            Stakeholder Intelligence Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Usage patterns and performance metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/${projectId}/stakeholder`)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/${projectId}/stakeholder/history`)}
            className="gap-2"
          >
            <History className="w-4 h-4" />
            History
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => router.push(`/dashboard/${projectId}/stakeholder`)}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            New Query
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(['7d', '30d', '90d'] as const).map((range) => (
          <Badge
            key={range}
            variant={timeRange === range ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setTimeRange(range)}
          >
            {range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'Last 90 days'}
          </Badge>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Queries</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {analytics.totalQueries}
              </p>
            </div>
            <MessageSquare className="w-10 h-10 text-purple-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Response Time</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {Math.round(analytics.avgGenerationTime)}ms
              </p>
            </div>
            <Zap className="w-10 h-10 text-blue-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Rating</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {analytics.avgRating ? analytics.avgRating.toFixed(1) : 'N/A'}
                {analytics.avgRating && <span className="text-sm text-gray-500">/5</span>}
              </p>
            </div>
            <Star className="w-10 h-10 text-yellow-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Roles</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {analytics.queryCountByRole.length}
              </p>
            </div>
            <Users className="w-10 h-10 text-green-600 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queries by Role - Bar Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Queries by Role
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.queryCountByRole}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis
                dataKey="role"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.replace('_', ' ')}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Role Distribution - Pie Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Role Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.queryCountByRole}
                dataKey="count"
                nameKey="role"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.role.replace('_', ' ')}: ${entry.count}`}
                labelLine={{ stroke: '#888', strokeWidth: 1 }}
              >
                {analytics.queryCountByRole.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance by Role - Bar Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Performance by Role
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.performanceByRole}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis
                dataKey="role"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.replace('_', ' ')}
              />
              <YAxis tick={{ fontSize: 12 }} label={{ value: 'ms', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="avgTime" name="Avg Time" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="p95Time" name="P95 Time" fill="#6366f1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Rating Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Rating Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.ratingDistribution}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="rating" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#f59e0b"
                fill="#fbbf24"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Popular Queries */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-600" />
          Most Popular Queries
        </h3>
        <div className="space-y-3">
          {analytics.popularQueries.slice(0, 5).map((query, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {query.query}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Asked {query.count} {query.count === 1 ? 'time' : 'times'}
                </p>
              </div>
              {query.rating && (
                <div className="flex items-center gap-1 ml-4">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {query.rating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
