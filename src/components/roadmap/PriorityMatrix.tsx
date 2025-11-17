'use client';

/**
 * Priority Matrix Component
 *
 * Visual quadrant chart showing:
 * - X-axis: Effort (left = low effort, right = high effort)
 * - Y-axis: Impact (bottom = low impact, top = high impact)
 * - Quadrants: Quick Wins, Big Bets, Fill-Ins, Low Priority
 */

import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PriorityMatrixProps {
  suggestions: any[];
  onSelectSuggestion?: (id: string) => void;
}

export function PriorityMatrix({ suggestions, onSelectSuggestion }: PriorityMatrixProps) {
  // Transform suggestions into chart data
  const chartData = suggestions.map(s => ({
    id: s.id,
    name: s.themes?.theme_name || 'Unknown',
    // X-axis: Effort (inverted - high effort_score = low effort)
    effort: (1 - Number(s.effort_score)) * 100,
    // Y-axis: Impact (priority score)
    impact: Number(s.priority_score),
    priority: s.priority_level,
    mentions: s.themes?.frequency || 0
  }));

  const priorityColors = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#3b82f6'
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Priority Matrix</h2>
        <p className="text-sm text-gray-600">
          Impact vs. Effort visualization - aim for top-left quadrant (Quick Wins)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-1">✅ Quick Wins</h3>
          <p className="text-green-700">High Impact, Low Effort - DO FIRST</p>
        </div>
        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-1">⚡ Big Bets</h3>
          <p className="text-blue-700">High Impact, High Effort - DO NEXT</p>
        </div>
        <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-900 mb-1">🔧 Fill-Ins</h3>
          <p className="text-yellow-700">Low Impact, Low Effort - DO WHEN IDLE</p>
        </div>
        <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-1">⏸️ Low Priority</h3>
          <p className="text-gray-700">Low Impact, High Effort - DEFER</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={500}>
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="effort"
            name="Effort"
            label={{ value: 'Effort →', position: 'bottom' }}
            domain={[0, 100]}
          />
          <YAxis
            type="number"
            dataKey="impact"
            name="Impact"
            label={{ value: '← Impact', angle: -90, position: 'left' }}
            domain={[0, 100]}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 border rounded-lg shadow-lg">
                    <p className="font-semibold">{data.name}</p>
                    <p className="text-sm text-gray-600">Impact: {Math.round(data.impact)}/100</p>
                    <p className="text-sm text-gray-600">Effort: {Math.round(data.effort)}%</p>
                    <p className="text-sm text-gray-600">{data.mentions} mentions</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Scatter
            data={chartData}
            onClick={(data: any) => onSelectSuggestion?.(data.id)}
            style={{ cursor: 'pointer' }}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={priorityColors[entry.priority as keyof typeof priorityColors]}
              />
            ))}
          </Scatter>

          {/* Quadrant lines */}
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#ddd" strokeDasharray="5 5" />
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#ddd" strokeDasharray="5 5" />
        </ScatterChart>
      </ResponsiveContainer>

      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Critical</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span>High</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Low</span>
        </div>
      </div>
    </div>
  );
}
