'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface FeatureData {
  title: string;
  count: number;
  total_arr?: number;
}

export function FeatureHeatmap({ features }: { features: FeatureData[] }) {
  // Prepare data for chart
  const chartData = features.slice(0, 10).map((f) => ({
    name: f.title.length > 30 ? f.title.substring(0, 27) + '...' : f.title,
    fullName: f.title,
    frequency: f.count,
    arr: f.total_arr || 0,
  }));

  const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5A00', '#059669', '#7C3AED'];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Feature Request Frequency</CardTitle>
        <CardDescription>Most requested features from customer calls</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No feature requests detected yet
          </div>
        ) : (
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded shadow-lg">
                          <p className="font-semibold mb-1">{data.fullName}</p>
                          <p className="text-sm text-gray-600">
                            Mentions: <span className="font-semibold">{data.frequency}</span>
                          </p>
                          {data.arr > 0 && (
                            <p className="text-sm text-gray-600">
                              Total ARR: <span className="font-semibold">${data.arr.toLocaleString()}</span>
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="frequency" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Feature List */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
              {features.slice(0, 6).map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-medium">{feature.title}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{feature.count}x</div>
                    {feature.total_arr && feature.total_arr > 0 && (
                      <div className="text-xs text-gray-500">
                        ${feature.total_arr.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
