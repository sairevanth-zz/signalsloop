'use client';

import React, { useEffect, useState } from 'react';
import { ComponentSpec } from '@/types/stakeholder';
import {
  SummaryText,
  MetricCard,
  SentimentChart,
  FeedbackList,
  ActionCard,
  CompetitorCompare,
  ThemeCloud,
  TimelineEvents,
} from './index';
import { Loader2 } from 'lucide-react';

interface ComponentRendererProps {
  component: ComponentSpec;
  projectId: string;
}

/**
 * Dynamic component renderer
 * Maps component type to React component and handles data fetching
 */
export function ComponentRenderer({ component, projectId }: ComponentRendererProps) {
  const [data, setData] = useState<any>(component.props);
  const [loading, setLoading] = useState(!!component.data_query);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (component.data_query) {
      fetchData();
    }
  }, [component.data_query]);

  async function fetchData() {
    try {
      setLoading(true);
      const response = await fetch('/api/stakeholder/fetch-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component,
          projectId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const result = await response.json();
      setData({ ...component.props, ...result.data });
      setError(result.error || null);
    } catch (err) {
      console.error('[ComponentRenderer] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 border border-gray-200 dark:border-gray-700 rounded-lg">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950/20">
        <p className="text-red-800 dark:text-red-200">Error loading component: {error}</p>
      </div>
    );
  }

  // Render the appropriate component based on type
  switch (component.type) {
    case 'SummaryText':
      return <SummaryText {...data} order={component.order} />;

    case 'MetricCard':
      return <MetricCard {...data} order={component.order} />;

    case 'SentimentChart':
      return <SentimentChart {...data} order={component.order} />;

    case 'FeedbackList':
      return <FeedbackList {...data} order={component.order} />;

    case 'ActionCard':
      return <ActionCard {...data} order={component.order} />;

    case 'CompetitorCompare':
      return <CompetitorCompare {...data} order={component.order} />;

    case 'ThemeCloud':
      return <ThemeCloud {...data} order={component.order} />;

    case 'TimelineEvents':
      return <TimelineEvents {...data} order={component.order} />;

    default:
      return (
        <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">
            Unknown component type: {component.type}
          </p>
        </div>
      );
  }
}

/**
 * Render multiple components in order
 */
interface ComponentListRendererProps {
  components: ComponentSpec[];
  projectId: string;
}

export function ComponentListRenderer({ components, projectId }: ComponentListRendererProps) {
  // Sort components by order
  const sortedComponents = [...components].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      {sortedComponents.map((component, idx) => (
        <ComponentRenderer key={idx} component={component} projectId={projectId} />
      ))}
    </div>
  );
}
