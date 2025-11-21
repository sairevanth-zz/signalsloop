/**
 * Specs Dashboard Widget
 * Shows recent specs and quick stats for the main dashboard
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight, FileText, Clock, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useSpecs } from '@/hooks/use-specs';
import { getStatusColorScheme, SPEC_STATUS_LABELS } from '@/types/specs';
import { SpecsEmptyState } from './specs-empty-state';

interface SpecsDashboardWidgetProps {
  projectId: string;
  projectSlug: string;
}

export function SpecsDashboardWidget({
  projectId,
  projectSlug,
}: SpecsDashboardWidgetProps) {
  const { specs, loading, error } = useSpecs(projectId, undefined, 'created_desc');

  // Get recent specs (last 3)
  const recentSpecs = specs.slice(0, 3);

  // Calculate stats
  const totalSpecs = specs.length;
  const timeSavedHours = totalSpecs * 4; // 4 hours saved per spec
  const lastWeekSpecs = specs.filter(
    (spec) =>
      new Date(spec.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-600 dark:text-gray-400">Loading specs...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600 py-4">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (totalSpecs === 0) {
    return <SpecsEmptyState projectSlug={projectSlug} variant="compact" />;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-lg">Spec Writer</CardTitle>
          </div>
          <Link href={`/${projectSlug}/specs`}>
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {totalSpecs}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Total Specs
            </div>
          </div>

          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {timeSavedHours}h
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Time Saved
            </div>
          </div>

          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center">
              {lastWeekSpecs > 0 && (
                <TrendingUp className="h-4 w-4 mr-1" />
              )}
              {lastWeekSpecs}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              This Week
            </div>
          </div>
        </div>

        {/* Recent Specs */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Recent Specs
          </h4>
          {recentSpecs.map((spec) => {
            const statusColors = getStatusColorScheme(spec.status);
            return (
              <Link
                key={spec.id}
                href={`/${projectSlug}/specs/${spec.id}`}
                className="block"
              >
                <div className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {spec.title}
                      </h5>
                    </div>
                    <Badge
                      className={`ml-2 ${statusColors.bg} ${statusColors.text} text-xs`}
                    >
                      {SPEC_STATUS_LABELS[spec.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="h-3 w-3 mr-1" />
                    {new Date(spec.created_at).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Create New CTA */}
        <Link href={`/${projectSlug}/specs/new`}>
          <Button className="w-full bg-purple-600 hover:bg-purple-700">
            <Sparkles className="h-4 w-4 mr-2" />
            Create New Spec
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
