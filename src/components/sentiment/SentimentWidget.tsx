'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import {
  SentimentWidgetProps,
  TimeRange,
  SentimentDistributionWithPercentage,
  SentimentCategory,
  SENTIMENT_CONFIG,
} from '@/types/sentiment';

/**
 * SentimentWidget Component
 * Dashboard widget showing sentiment distribution with a pie chart
 *
 * Features:
 * - Pie chart visualization
 * - Time range selector (7/30/90 days)
 * - Click-to-filter functionality
 * - Legend with counts and percentages
 */
export function SentimentWidget({
  projectId,
  defaultTimeRange = 30,
  onFilterChange,
  className = '',
}: SentimentWidgetProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultTimeRange);
  const [distribution, setDistribution] = useState<SentimentDistributionWithPercentage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<SentimentCategory | null>(null);

  // Fetch sentiment distribution
  useEffect(() => {
    fetchDistribution();
  }, [projectId, timeRange]);

  const fetchDistribution = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/analyze-sentiment?projectId=${projectId}&days=${timeRange}`,
      );

      if (!response.ok) {
        throw new Error('Failed to fetch sentiment data');
      }

      const data = await response.json();
      setDistribution(data.distribution || []);
    } catch (err) {
      console.error('[SENTIMENT WIDGET] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Handle category click for filtering
  const handleCategoryClick = (category: SentimentCategory) => {
    const newSelection = selectedCategory === category ? null : category;
    setSelectedCategory(newSelection);
    onFilterChange?.(newSelection);
  };

  // Prepare chart data
  const chartData = distribution.map((item) => ({
    name: item.sentiment_category.charAt(0).toUpperCase() + item.sentiment_category.slice(1),
    value: item.count,
    percentage: item.percentage,
    category: item.sentiment_category,
  }));

  // Calculate total
  const total = distribution.reduce((sum, item) => sum + item.count, 0);

  // Colors for pie chart
  const COLORS: Record<SentimentCategory, string> = {
    positive: '#10b981', // green-500
    negative: '#ef4444', // red-500
    neutral: '#6b7280', // gray-500
    mixed: '#f59e0b', // amber-500
  };

  // Custom label renderer
  const renderLabel = (entry: any) => {
    if (entry.percentage < 5) return ''; // Hide labels for small slices
    return `${entry.percentage.toFixed(0)}%`;
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Sentiment Analysis</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {total > 0 ? `${total} feedback items analyzed` : 'No data available'}
            </p>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-2">
            {([7, 30, 90] as TimeRange[]).map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`
                  px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                  ${
                    timeRange === days
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
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
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-600 font-medium">Error loading data</p>
              <p className="text-sm text-gray-500 mt-1">{error}</p>
              <button
                onClick={fetchDistribution}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        ) : total === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No sentiment data</h3>
              <p className="mt-1 text-sm text-gray-500">
                No feedback has been analyzed yet for this time range.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pie Chart */}
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[entry.category as SentimentCategory]}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleCategoryClick(entry.category as SentimentCategory)}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                          <p className="font-medium text-gray-900">{data.name}</p>
                          <p className="text-sm text-gray-600">
                            {data.value} items ({data.percentage.toFixed(1)}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend with Click-to-Filter */}
            <div className="grid grid-cols-2 gap-2">
              {chartData.map((item) => {
                const category = item.category as SentimentCategory;
                const config = SENTIMENT_CONFIG[category];
                const isSelected = selectedCategory === category;

                return (
                  <button
                    key={category}
                    onClick={() => handleCategoryClick(category)}
                    className={`
                      flex items-center justify-between p-3 rounded-lg border-2 transition-all
                      ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[category] }}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {config.emoji} {item.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">{item.value}</div>
                      <div className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedCategory && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Filter active:</span> Showing only{' '}
                  {selectedCategory} feedback
                  <button
                    onClick={() => handleCategoryClick(selectedCategory)}
                    className="ml-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    Clear filter
                  </button>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
