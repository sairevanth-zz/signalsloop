'use client';

import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Users, 
  MousePointer, 
  MessageSquare, 
  TrendingUp,
  Calendar,
  Globe,
  Smartphone,
  Monitor
} from 'lucide-react';

interface AnalyticsData {
  totalEvents: number;
  uniqueVisitors: number;
  widgetOpens: number;
  feedbackSubmissions: number;
  eventsByDay: Array<{ date: string; count: number }>;
  eventsByHour: Array<{ hour: number; count: number }>;
  topPages: Array<{ url: string; count: number }>;
  deviceTypes: Array<{ type: string; count: number }>;
  recentEvents: Array<{
    event_name: string;
    url: string;
    timestamp: string;
    user_agent: string;
  }>;
}

interface WidgetAnalyticsProps {
  projectId: string;
  apiKey?: string;
}

export function WidgetAnalytics({ projectId, apiKey }: WidgetAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  const supabase = getSupabaseClient();

  useEffect(() => {
    if (projectId) {
      loadAnalytics();
    }
  }, [projectId, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      const now = new Date();
      const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

      // Get all analytics events for this project
      const { data: events, error: eventsError } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('project_id', projectId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (eventsError) {
        console.error('Error fetching analytics:', eventsError);
        setError('Failed to load analytics data');
        return;
      }

      // Process the data
      const processedData: AnalyticsData = {
        totalEvents: events?.length || 0,
        uniqueVisitors: new Set(events?.map(e => e.ip_address) || []).size,
        widgetOpens: events?.filter(e => e.event_name === 'widget_opened').length || 0,
        feedbackSubmissions: events?.filter(e => e.event_name === 'feedback_submitted').length || 0,
        eventsByDay: [],
        eventsByHour: [],
        topPages: [],
        deviceTypes: [],
        recentEvents: events?.slice(0, 10).map(e => ({
          event_name: e.event_name,
          url: e.url,
          timestamp: e.timestamp,
          user_agent: e.user_agent
        })) || []
      };

      // Process events by day
      const dayMap = new Map<string, number>();
      events?.forEach(event => {
        const date = new Date(event.timestamp).toISOString().split('T')[0];
        dayMap.set(date, (dayMap.get(date) || 0) + 1);
      });
      processedData.eventsByDay = Array.from(dayMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Process events by hour
      const hourMap = new Map<number, number>();
      events?.forEach(event => {
        const hour = new Date(event.timestamp).getHours();
        hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
      });
      processedData.eventsByHour = Array.from(hourMap.entries())
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => a.hour - b.hour);

      // Process top pages
      const pageMap = new Map<string, number>();
      events?.forEach(event => {
        const url = event.url || 'unknown';
        pageMap.set(url, (pageMap.get(url) || 0) + 1);
      });
      processedData.topPages = Array.from(pageMap.entries())
        .map(([url, count]) => ({ url, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Process device types
      const deviceMap = new Map<string, number>();
      events?.forEach(event => {
        const userAgent = event.user_agent || '';
        let deviceType = 'Desktop';
        if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
          deviceType = 'Mobile';
        } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
          deviceType = 'Tablet';
        }
        deviceMap.set(deviceType, (deviceMap.get(deviceType) || 0) + 1);
      });
      processedData.deviceTypes = Array.from(deviceMap.entries())
        .map(([type, count]) => ({ type, count }));

      setAnalytics(processedData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'Mobile': return <Smartphone className="h-4 w-4" />;
      case 'Tablet': return <Monitor className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Widget Analytics</h2>
          <div className="flex gap-2">
            {['7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                className={`px-3 py-1 rounded-md text-sm ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setTimeRange(range as any)}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadAnalytics}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No analytics data available</p>
        <p className="text-sm text-gray-500 mt-2">
          Analytics will appear here once your widget starts receiving traffic.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Widget Analytics</h2>
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              className={`px-3 py-1 rounded-md text-sm ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setTimeRange(range as any)}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Events</p>
                <p className="text-2xl font-bold">{analytics.totalEvents}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unique Visitors</p>
                <p className="text-2xl font-bold">{analytics.uniqueVisitors}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Widget Opens</p>
                <p className="text-2xl font-bold">{analytics.widgetOpens}</p>
              </div>
              <MousePointer className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Feedback Submissions</p>
                <p className="text-2xl font-bold">{analytics.feedbackSubmissions}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events by Day */}
        <Card>
          <CardHeader>
            <CardTitle>Events by Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.eventsByDay.slice(-7).map((day) => (
                <div key={day.date} className="flex items-center justify-between">
                  <span className="text-sm">{new Date(day.date).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${Math.max(10, (day.count / Math.max(...analytics.eventsByDay.map(d => d.count))) * 100)}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-8">{day.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Device Types */}
        <Card>
          <CardHeader>
            <CardTitle>Device Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.deviceTypes.map((device) => (
                <div key={device.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getDeviceIcon(device.type)}
                    <span className="text-sm">{device.type}</span>
                  </div>
                  <Badge variant="secondary">{device.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Pages */}
      <Card>
        <CardHeader>
          <CardTitle>Top Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.topPages.slice(0, 5).map((page, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 truncate flex-1 mr-4">
                  {page.url.length > 50 ? `${page.url.substring(0, 50)}...` : page.url}
                </span>
                <Badge variant="outline">{page.count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.recentEvents.map((event, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{event.event_name}</Badge>
                  <span className="text-gray-600 truncate max-w-xs">
                    {event.url.length > 40 ? `${event.url.substring(0, 40)}...` : event.url}
                  </span>
                </div>
                <span className="text-gray-500">
                  {new Date(event.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
