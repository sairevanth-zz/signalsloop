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
  ReferenceLine,
} from 'recharts';
import {
  SentimentTrendChartProps,
  TimeRange,
  SentimentTrendPoint,
} from '@/types/sentiment';
import { format, parseISO } from 'date-fns';

/**
 * SentimentTrendChart Component
 * Shows sentiment trends over time with a line chart
 *
 * Features:
 * - Line chart showing average sentiment score
 * - Stacked area showing sentiment category counts
 * - Date range selector
 * - Annotations for significant changes
 */
export function SentimentTrendChart({
  projectId,
  defaultTimeRange = 30,
  className = '',
}: SentimentTrendChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultTimeRange);
  const [trendData, setTrendData] = useState<SentimentTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch sentiment trend data
  useEffect(() => {
    fetchTrend();
  }, [projectId, timeRange]);

  const fetchTrend = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/analyze-sentiment?projectId=${projectId}&days=${timeRange}`,
      );

      if (!response.ok) {
        throw new Error('Failed to fetch sentiment trend');
      }

      const data = await response.json();
      setTrendData(data.trend || []);
    } catch (err) {
      console.error('[SENTIMENT TREND] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const chartData = trendData.map((point) => ({
    date: format(parseISO(point.date), 'MMM dd'),
    fullDate: point.date,
    score: parseFloat(point.avg_sentiment_score.toString()),
    positive: point.positive_count,
    negative: point.negative_count,
    neutral: point.neutral_count,
    mixed: point.mixed_count,
    total: point.positive_count + point.negative_count + point.neutral_count + point.mixed_count,
  }));

  // Calculate average sentiment
  const averageSentiment =
    chartData.length > 0
      ? chartData.reduce((sum, item) => sum + item.score, 0) / chartData.length
      : 0;

  // Detect significant changes (>20% change in score)
  const significantChanges = chartData.filter((item, idx) => {
    if (idx === 0) return false;
    const prevScore = chartData[idx - 1].score;
    const change = Math.abs(item.score - prevScore);
    return change > 0.2;
  });

  // Determine trend direction
  const getTrendDirection = () => {
    if (chartData.length < 2) return 'stable';
    const firstHalf = chartData.slice(0, Math.floor(chartData.length / 2));
    const secondHalf = chartData.slice(Math.floor(chartData.length / 2));

    const firstAvg = firstHalf.reduce((sum, item) => sum + item.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, item) => sum + item.score, 0) / secondHalf.length;

    const change = secondAvg - firstAvg;
    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'declining';
    return 'stable';
  };

  const trendDirection = getTrendDirection();

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sentiment Trend</h3>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Average score: <span className="font-medium">{averageSentiment.toFixed(2)}</span>
              </p>
              <div
                className={`
                  inline-flex items-center gap-1 text-sm font-medium
                  ${trendDirection === 'improving' ? 'text-green-600 dark:text-green-400' : ''}
                  ${trendDirection === 'declining' ? 'text-red-600 dark:text-red-400' : ''}
                  ${trendDirection === 'stable' ? 'text-gray-600 dark:text-gray-400' : ''}
                `}
              >
                {trendDirection === 'improving' && (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    Improving
                  </>
                )}
                {trendDirection === 'declining' && (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    Declining
                  </>
                )}
                {trendDirection === 'stable' && (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                    </svg>
                    Stable
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-2">
            {([7, 30, 90] as TimeRange[]).map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`
                  px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                  ${timeRange === days
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-slate-600 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }
                `}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center h-80">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-80">
            <div className="text-center">
              <p className="text-red-600 font-medium">Error loading data</p>
              <p className="text-sm text-gray-500 mt-1">{error}</p>
              <button
                onClick={fetchTrend}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-80">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No trend data</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Not enough data to show trends for this time range.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Line Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  domain={[-1, 1]}
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  ticks={[-1, -0.5, 0, 0.5, 1]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                          <p className="font-medium text-gray-900">{data.date}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Average Score: <span className="font-semibold">{data.score.toFixed(2)}</span>
                          </p>
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-green-600">
                              Positive: {data.positive}
                            </p>
                            <p className="text-xs text-gray-600">
                              Neutral: {data.neutral}
                            </p>
                            <p className="text-xs text-amber-600">
                              Mixed: {data.mixed}
                            </p>
                            <p className="text-xs text-red-600">
                              Negative: {data.negative}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 pt-1 border-t">
                            Total: {data.total} items
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => (
                    <span className="text-gray-700">{value}</span>
                  )}
                />
                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Sentiment Score"
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Significant Changes Annotations */}
            {significantChanges.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-amber-900 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Significant Changes Detected
                </h4>
                <ul className="mt-2 space-y-1">
                  {significantChanges.slice(0, 3).map((change, idx) => (
                    <li key={idx} className="text-xs text-amber-800">
                      • {change.date}: Large sentiment shift detected
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Positive', value: chartData.reduce((sum, d) => sum + d.positive, 0), color: 'green' },
                { label: 'Neutral', value: chartData.reduce((sum, d) => sum + d.neutral, 0), color: 'gray' },
                { label: 'Mixed', value: chartData.reduce((sum, d) => sum + d.mixed, 0), color: 'amber' },
                { label: 'Negative', value: chartData.reduce((sum, d) => sum + d.negative, 0), color: 'red' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`p-3 rounded-lg bg-${stat.color}-50 border border-${stat.color}-200`}
                >
                  <p className={`text-xs text-${stat.color}-600`}>{stat.label}</p>
                  <p className={`text-lg font-semibold text-${stat.color}-900`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
