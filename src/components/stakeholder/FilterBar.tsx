'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStakeholderFilters, FilterState } from '@/contexts/StakeholderFilterContext';
import { X, Filter } from 'lucide-react';

export function FilterBar() {
  const { filters, removeFilter, clearFilters, hasActiveFilters } = useStakeholderFilters();

  if (!hasActiveFilters) return null;

  const formatFilterValue = (key: string, value: any): string => {
    if (key === 'dateRange' && value) {
      return `${value.start} to ${value.end}`;
    }
    return String(value);
  };

  const formatFilterLabel = (key: string): string => {
    const labels: Record<string, string> = {
      theme: 'Theme',
      sentiment: 'Sentiment',
      competitor: 'Competitor',
      source: 'Source',
      dateRange: 'Date Range',
      customer: 'Customer',
    };
    return labels[key] || key;
  };

  return (
    <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Active Filters:
            </span>
          </div>

          {(Object.keys(filters) as Array<keyof FilterState>).map((key) => {
            const value = filters[key];
            if (!value) return null;

            return (
              <Badge
                key={key}
                variant="secondary"
                className="gap-2 py-1 px-3 text-sm"
              >
                <span className="font-medium">{formatFilterLabel(key)}:</span>
                <span>{formatFilterValue(key, value)}</span>
                <button
                  onClick={() => removeFilter(key)}
                  className="ml-1 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="gap-2 text-blue-600 hover:text-blue-700"
        >
          <X className="w-4 h-4" />
          Clear All
        </Button>
      </div>
    </Card>
  );
}
