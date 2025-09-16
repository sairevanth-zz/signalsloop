'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Vote, 
  Eye, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight, 
  Activity,
  Target,
  Zap,
  Globe
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface AnalyticsDashboardProps {
  projectId: string;
}

interface MetricData {
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  timeframe: string;
}

interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

export function AnalyticsDashboard({ projectId }: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Record<string, MetricData>>({});
  const [chartData, setChartData] = useState<Record<string, ChartDataPoint[]>>({});

  useEffect(() => {
    fetchAnalytics();
  }, [projectId, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // In a real implementation, these would be actual API calls to PostHog or your analytics service
      // For now, we'll simulate the data
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading

      // Simulated metrics data
      const mockMetrics = {
        pageViews: { value: 2847, change: 12.5, trend: 'up' as const, timeframe: timeRange },
        uniqueVisitors: { value: 1823, change: -3.2, trend: 'down' as const, timeframe: timeRange },
        newPosts: { value: 45, change: 18.7, trend: 'up' as const, timeframe: timeRange },
        totalVotes: { value: 312, change: 25.1, trend: 'up' as const, timeframe: timeRange },
        widgetLoads: { value: 156, change: 8.3, trend: 'up' as const, timeframe: timeRange },
        conversions: { value: 7, change: 40.0, trend: 'up' as const, timeframe: timeRange }
      };

      // Simulated chart data
      const mockChartData = {
        pageViews: generateMockTimeSeriesData(timeRange, 2000, 3000),
        posts: generateMockTimeSeriesData(timeRange, 5, 15),
        votes: generateMockTimeSeriesData(timeRange, 20, 50),
        conversions: generateMockTimeSeriesData(timeRange, 0, 3)
      };

      setMetrics(mockMetrics);
      setChartData(mockChartData);
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockTimeSeriesData = (range: string, min: number, max: number): ChartDataPoint[] => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const data = [];
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.floor(Math.random() * (max - min) + min),
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }
    
    return data;
  };

  const renderMetricCard = (
    title: string,
    icon: React.ReactNode,
    metricKey: string,
    format: 'number' | 'currency' | 'percentage' = 'number'
  ) => {
    const metric = metrics[metricKey];
    if (!metric) return null;

    const formatValue = (value: number) => {
      switch (format) {
        case 'currency':
          return `$${value.toLocaleString()}`;
        case 'percentage':
          return `${value.toFixed(1)}%`;
        default:
          return value.toLocaleString();
      }
    };

    const TrendIcon = metric.trend === 'up' ? ArrowUpRight : ArrowDownRight;
    const trendColor = metric.trend === 'up' ? 'text-green-600' : metric.trend === 'down' ? 'text-red-600' : 'text-gray-600';

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <span className="text-sm font-medium text-gray-600">{title}</span>
            </div>
            <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              {Math.abs(metric.change)}%
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-gray-900">
              {formatValue(metric.value)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              vs. previous {metric.timeframe}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <div className="animate-pulse bg-gray-200 h-10 w-32 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <Card>
                <CardContent className="p-6">
                  <div className="bg-gray-200 h-20 rounded"></div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">Track your feedback board performance and user engagement</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {renderMetricCard('Page Views', <Eye className="w-4 h-4 text-blue-500" />, 'pageViews')}
        {renderMetricCard('Unique Visitors', <Users className="w-4 h-4 text-purple-500" />, 'uniqueVisitors')}
        {renderMetricCard('New Posts', <MessageSquare className="w-4 h-4 text-green-500" />, 'newPosts')}
        {renderMetricCard('Total Votes', <Vote className="w-4 h-4 text-orange-500" />, 'totalVotes')}
        {renderMetricCard('Widget Loads', <Globe className="w-4 h-4 text-indigo-500" />, 'widgetLoads')}
        {renderMetricCard('Conversions', <Target className="w-4 h-4 text-pink-500" />, 'conversions')}
      </div>

      {/* Charts */}
      <Tabs defaultValue="traffic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
        </TabsList>

        {/* Traffic Tab */}
        <TabsContent value="traffic">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Page Views Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.pageViews}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#6366F1" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Traffic Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Direct', value: 35, color: '#6366F1' },
                        { name: 'Widget', value: 28, color: '#8B5CF6' },
                        { name: 'Search', value: 20, color: '#EC4899' },
                        { name: 'Social', value: 10, color: '#F59E0B' },
                        { name: 'Other', value: 7, color: '#10B981' }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: {name: string, percent: number}) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: 'Direct', value: 35, color: '#6366F1' },
                        { name: 'Widget', value: 28, color: '#8B5CF6' },
                        { name: 'Search', value: 20, color: '#EC4899' },
                        { name: 'Social', value: 10, color: '#F59E0B' },
                        { name: 'Other', value: 7, color: '#10B981' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Posts & Comments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.posts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Vote className="w-5 h-5" />
                  Voting Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.votes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Conversions Tab */}
        <TabsContent value="conversions">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Conversion Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.conversions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#EC4899" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">2.3%</div>
                  <div className="text-sm text-gray-600">Conversion Rate</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">$1,890</div>
                  <div className="text-sm text-gray-600">Revenue ({timeRange})</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">$270</div>
                  <div className="text-sm text-gray-600">Avg. LTV</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Funnel Tab */}
        <TabsContent value="funnel">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                User Journey Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { step: 'Page Visitors', count: 1823, percentage: 100, color: 'bg-blue-500' },
                  { step: 'Board Viewers', count: 892, percentage: 49, color: 'bg-purple-500' },
                  { step: 'Post Submitters', count: 156, percentage: 17, color: 'bg-green-500' },
                  { step: 'Active Users', count: 67, percentage: 43, color: 'bg-orange-500' },
                  { step: 'Pro Conversions', count: 7, percentage: 10, color: 'bg-pink-500' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium text-gray-700">{item.step}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                          <div 
                            className={`${item.color} h-full rounded-full flex items-center justify-center text-white text-sm font-medium`}
                            style={{ width: `${item.percentage}%` }}
                          >
                            {item.percentage}%
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-900 w-16 text-right">
                          {item.count.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Key Insights</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 49% of visitors view your feedback board</li>
                  <li>• 17% of board viewers submit feedback</li>
                  <li>• 43% of submitters become active users</li>
                  <li>• 10% of active users convert to Pro</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Recommended Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-900 mb-2">Improve Widget Conversion</h4>
              <p className="text-sm text-yellow-800">Only 28% of widget loads result in submissions. Consider A/B testing different call-to-action messages.</p>
              <Button size="sm" className="mt-2">
                Test Widget Changes
              </Button>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Increase User Retention</h4>
              <p className="text-sm text-blue-800">Send follow-up emails to users who submit feedback to keep them engaged with your roadmap.</p>
              <Button size="sm" className="mt-2">
                Set up Email Automation
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
