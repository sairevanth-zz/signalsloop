'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SentimentTrendChartProps {
  data: Array<{
    date: string;
    avg_sentiment: number;
    mention_count: number;
  }>;
}

export function SentimentTrendChart({ data }: SentimentTrendChartProps) {
  // Format data for chart
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    sentiment: item.avg_sentiment,
    mentions: item.mention_count,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          stroke="#9ca3af"
        />
        <YAxis
          domain={[-1, 1]}
          ticks={[-1, -0.5, 0, 0.5, 1]}
          tick={{ fontSize: 12 }}
          stroke="#9ca3af"
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                  <p className="text-xs text-gray-500">{payload[0].payload.date}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    Sentiment: {(payload[0].value as number).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-600">
                    Mentions: {payload[0].payload.mentions}
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Line
          type="monotone"
          dataKey="sentiment"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
