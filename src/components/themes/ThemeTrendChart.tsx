'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeTrendChartProps, ThemeTrendPoint } from '@/types/themes';
import { format, parseISO } from 'date-fns';
import { Calendar } from 'lucide-react';

/**
 * ThemeTrendChart Component
 * Shows how theme frequency changes over time
 */
export function ThemeTrendChart({
  themeIds,
  projectId,
  timeRange = 30,
  className = '',
}: ThemeTrendChartProps) {
  const [trendData, setTrendData] = useState<Map<string, ThemeTrendPoint[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<7 | 30 | 90 | 'all'>(
    typeof timeRange === 'number' ? (timeRange as 7 | 30 | 90) : 'all'
  );

  useEffect(() => {
    fetchTrendData();
  }, [themeIds, selectedTimeRange]);

  const fetchTrendData = async () => {
    setLoading(true);
    try {
      const dataMap = new Map<string, ThemeTrendPoint[]>();

      await Promise.all(
        themeIds.map(async (themeId) => {
          const days = selectedTimeRange === 'all' ? 365 : selectedTimeRange;
          const response = await fetch(
            `/api/themes/${themeId}?includeTrend=true&timeRange=${days}`
          );
          const data = await response.json();

          if (data.success && data.trend) {
            dataMap.set(themeId, data.trend);
          }
        })
      );

      setTrendData(dataMap);
    } catch (error) {
      console.error('Error fetching trend data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data by merging all trends
  const prepareChartData = () => {
    const dateMap = new Map<string, any>();

    trendData.forEach((trend, themeId) => {
      trend.forEach((point) => {
        if (!dateMap.has(point.date)) {
          dateMap.set(point.date, { date: point.date });
        }
        const entry = dateMap.get(point.date);
        entry[`theme_${themeId}`] = point.feedback_count;
        entry[`sentiment_${themeId}`] = point.avg_sentiment;
      });
    });

    return Array.from(dateMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .reverse();
  };

  const chartData = prepareChartData();

  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // orange
    '#ef4444', // red
    '#8b5cf6', // purple
  ];

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No trend data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Theme Trend</h3>
            <p className="text-sm text-gray-500 mt-1">
              Mentions over time
            </p>
          </div>

          <div className="flex gap-2">
            {([7, 30, 90, 'all'] as const).map((range) => (
              <Button
                key={range}
                size="sm"
                variant={selectedTimeRange === range ? 'default' : 'outline'}
                onClick={() => setSelectedTimeRange(range)}
              >
                {range === 'all' ? 'All' : `${range}d`}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => format(parseISO(date), 'MMM dd')}
              stroke="#6b7280"
              style={{ fontSize: 12 }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: 12 }}
              label={{
                value: 'Mentions',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 12, fill: '#6b7280' },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: 12,
              }}
              labelFormatter={(date) => format(parseISO(date as string), 'MMM dd, yyyy')}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              iconType="line"
            />
            {themeIds.map((themeId, index) => (
              <Line
                key={themeId}
                type="monotone"
                dataKey={`theme_${themeId}`}
                name={`Theme ${index + 1}`}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Summary Stats */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {chartData.reduce((sum, point) => {
                  return sum + themeIds.reduce((s, id) => s + (point[`theme_${id}`] || 0), 0);
                }, 0)}
              </p>
              <p className="text-xs text-gray-600 mt-1">Total Mentions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {chartData.length}
              </p>
              <p className="text-xs text-gray-600 mt-1">Days Tracked</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {themeIds.length}
              </p>
              <p className="text-xs text-gray-600 mt-1">Themes</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
