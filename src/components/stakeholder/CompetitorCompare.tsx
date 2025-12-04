'use client';

import React from 'react';
import { CompetitorCompareProps } from '@/types/stakeholder';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Minus } from 'lucide-react';

export function CompetitorCompare({ competitors, metrics, title }: CompetitorCompareProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title || 'Competitive Comparison'}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Metric
              </th>
              {competitors.map((competitor, idx) => (
                <th
                  key={idx}
                  className="text-center py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {idx === 0 ? (
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      You
                    </Badge>
                  ) : (
                    competitor
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric, idx) => {
              const AdvantageIcon =
                metric.advantage === 'yours'
                  ? Trophy
                  : metric.advantage === 'theirs'
                  ? TrendingUp
                  : Minus;

              const advantageColor =
                metric.advantage === 'yours'
                  ? 'text-green-600 dark:text-green-400'
                  : metric.advantage === 'theirs'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-600 dark:text-gray-400';

              return (
                <tr
                  key={idx}
                  className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                >
                  <td className="py-3 px-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                    <div className="flex items-center gap-2">
                      {metric.advantage && (
                        <AdvantageIcon className={`w-4 h-4 ${advantageColor}`} />
                      )}
                      {metric.name}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {metric.value}
                  </td>
                  {/* Placeholder cells for other competitors */}
                  {competitors.slice(1).map((_, cidx) => (
                    <td
                      key={cidx}
                      className="py-3 px-2 text-center text-sm text-gray-700 dark:text-gray-300"
                    >
                      -
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <strong>Note:</strong> Competitive data is based on publicly available information and customer feedback mentions.
        </p>
      </div>
    </Card>
  );
}
