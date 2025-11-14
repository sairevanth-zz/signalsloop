/**
 * Classification Overview Component
 * Visual analytics for feedback classification and distribution
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  FeedbackClassification,
  CLASSIFICATION_META,
  PLATFORM_META,
  PlatformType,
} from '@/types/hunter';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Loader2 } from 'lucide-react';

interface ClassificationOverviewProps {
  projectId: string;
  timeRange?: number;
  className?: string;
}

export function ClassificationOverview({
  projectId,
  timeRange = 30,
  className,
}: ClassificationOverviewProps) {
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'classification' | 'platform' | 'trend'>(
    'classification'
  );
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange.toString());

  // Data states
  const [classificationData, setClassificationData] = useState<any[]>([]);
  const [platformData, setPlatformData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [projectId, selectedTimeRange]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get stats
      const statsRes = await fetch(`/api/hunter/stats?projectId=${projectId}`);
      const statsData = await statsRes.json();

      if (statsData.success) {
        setStats(statsData.dashboardStats);

        // Transform classification distribution
        if (statsData.classificationDist) {
          const classificationColors: Record<string, string> = {
            bug: '#ef4444',
            feature_request: '#3b82f6',
            praise: '#22c55e',
            complaint: '#f97316',
            churn_risk: '#a855f7',
            question: '#eab308',
            other: '#6b7280',
          };

          setClassificationData(
            statsData.classificationDist.map((item: any) => ({
              name: CLASSIFICATION_META[item.classification as FeedbackClassification]?.label || item.classification,
              value: item.count,
              percentage: item.percentage,
              color: classificationColors[item.classification],
            }))
          );
        }

        // Transform platform distribution
        if (statsData.platformDist) {
          const platformColors: Record<string, string> = {
            reddit: '#FF4500',
            twitter: '#1DA1F2',
            hackernews: '#FF6600',
            g2: '#FF6D42',
            producthunt: '#DA552F',
          };

          setPlatformData(
            statsData.platformDist.map((item: any) => ({
              name: PLATFORM_META[item.platform as PlatformType]?.name || item.platform,
              value: item.count,
              avgSentiment: item.avg_sentiment,
              color: platformColors[item.platform],
            }))
          );
        }

        // Transform trend data
        if (statsData.recentActivity) {
          setTrendData(
            statsData.recentActivity.map((item: any) => ({
              date: new Date(item.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              }),
              count: item.count,
              avgSentiment: item.avg_sentiment,
              urgentCount: item.urgent_count,
            }))
          );
        }
      }
    } catch (error) {
      console.error('[ClassificationOverview] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-sm text-gray-600">
            Count: <span className="font-medium">{payload[0].value}</span>
          </p>
          {payload[0].payload.percentage && (
            <p className="text-sm text-gray-600">
              Percentage: <span className="font-medium">{payload[0].payload.percentage}%</span>
            </p>
          )}
          {payload[0].payload.avgSentiment !== undefined && (
            <p className="text-sm text-gray-600">
              Avg Sentiment:{' '}
              <span className="font-medium">{payload[0].payload.avgSentiment.toFixed(2)}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={className}>
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <Button
            variant={selectedView === 'classification' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('classification')}
          >
            <PieChartIcon className="h-4 w-4 mr-2" />
            By Type
          </Button>
          <Button
            variant={selectedView === 'platform' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('platform')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            By Platform
          </Button>
          <Button
            variant={selectedView === 'trend' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('trend')}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Trends
          </Button>
        </div>

        <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Classification View */}
      {selectedView === 'classification' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Feedback Distribution</h3>
            {classificationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={classificationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {classificationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </Card>

          {/* Bar Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Count by Type</h3>
            {classificationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={classificationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </Card>

          {/* Stats Grid */}
          <Card className="p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {classificationData.map((item) => (
                <div
                  key={item.name}
                  className="border rounded-lg p-4"
                  style={{ borderLeftColor: item.color, borderLeftWidth: '4px' }}
                >
                  <div className="text-2xl font-bold">{item.value}</div>
                  <div className="text-sm text-gray-600 mt-1">{item.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{item.percentage}% of total</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Platform View */}
      {selectedView === 'platform' && (
        <div className="grid grid-cols-1 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Feedback by Platform</h3>
            {platformData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={platformData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" domain={[-1, 1]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="value" fill="#3b82f6" name="Count" />
                  <Bar
                    yAxisId="right"
                    dataKey="avgSentiment"
                    fill="#10b981"
                    name="Avg Sentiment"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-96 flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {platformData.map((platform) => (
              <Card key={platform.name} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{platform.name}</span>
                  <span className="text-2xl font-bold">{platform.value}</span>
                </div>
                <div className="text-sm text-gray-600">
                  Avg Sentiment:{' '}
                  <span
                    className={`font-medium ${
                      platform.avgSentiment > 0
                        ? 'text-green-600'
                        : platform.avgSentiment < 0
                          ? 'text-red-600'
                          : 'text-gray-600'
                    }`}
                  >
                    {platform.avgSentiment.toFixed(2)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Trend View */}
      {selectedView === 'trend' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Feedback Volume Over Time</h3>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Total Feedback"
                  />
                  <Line
                    type="monotone"
                    dataKey="urgentCount"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Urgent Items"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No trend data available
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Sentiment Trend</h3>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[-1, 1]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgSentiment"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Avg Sentiment"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No sentiment data available
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
