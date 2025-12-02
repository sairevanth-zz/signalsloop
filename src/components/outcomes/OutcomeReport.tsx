'use client';

/**
 * OutcomeReport Component
 *
 * Displays a detailed report for a feature outcome including
 * metrics analysis, insights, and recommendations.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { OutcomeReport as OutcomeReportType, MetricTrend } from '@/types/outcome-attribution';

interface OutcomeReportProps {
  report: OutcomeReportType;
  className?: string;
}

/**
 * Get trend icon and color
 */
function getTrendDisplay(trend: MetricTrend): { icon: string; color: string } {
  switch (trend) {
    case 'improving':
      return { icon: '↑', color: 'text-green-600 dark:text-green-400' };
    case 'declining':
      return { icon: '↓', color: 'text-red-600 dark:text-red-400' };
    case 'stable':
    default:
      return { icon: '→', color: 'text-muted-foreground' };
  }
}

/**
 * Get badge for classification
 */
function getClassificationBadge(classification: string | null): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  text: string;
} {
  switch (classification) {
    case 'success':
      return { variant: 'default', text: 'Success' };
    case 'partial_success':
      return { variant: 'secondary', text: 'Partial Success' };
    case 'no_impact':
      return { variant: 'outline', text: 'No Impact' };
    case 'negative_impact':
      return { variant: 'destructive', text: 'Negative Impact' };
    default:
      return { variant: 'outline', text: 'Pending' };
  }
}

/**
 * Metric Card sub-component
 */
function MetricCard({
  title,
  before,
  after,
  delta,
  trend,
  unit = '',
  invertColor = false,
}: {
  title: string;
  before: number;
  after: number;
  delta: number;
  trend: MetricTrend;
  unit?: string;
  invertColor?: boolean;
}) {
  const trendDisplay = getTrendDisplay(invertColor && trend !== 'stable'
    ? (trend === 'improving' ? 'declining' : 'improving')
    : trend
  );
  const actualTrendDisplay = getTrendDisplay(trend);

  return (
    <div className="p-4 rounded-lg border bg-card">
      <h4 className="text-sm font-medium text-muted-foreground mb-3">{title}</h4>

      <div className="flex items-end justify-between mb-2">
        <div>
          <span className="text-2xl font-bold">
            {after.toFixed(2)}{unit}
          </span>
          <span className={cn('ml-2 text-sm font-medium', actualTrendDisplay.color)}>
            {actualTrendDisplay.icon} {delta > 0 ? '+' : ''}{delta.toFixed(2)}{unit}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Before: {before.toFixed(2)}{unit}</span>
        <span>→</span>
        <span>After: {after.toFixed(2)}{unit}</span>
      </div>
    </div>
  );
}

export function OutcomeReport({ report, className }: OutcomeReportProps) {
  const { outcome, metrics, insights, recommendations } = report;
  const badge = getClassificationBadge(outcome.outcome_classification);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{outcome.theme_name}</CardTitle>
              <CardDescription>
                Shipped on {new Date(outcome.shipped_at).toLocaleDateString()} |{' '}
                {outcome.priority_level} priority
              </CardDescription>
            </div>
            <Badge variant={badge.variant} className="text-sm">
              {badge.text}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Confidence Score */}
          {outcome.classification_confidence !== null && (
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Classification Confidence</span>
                <span className="font-medium">
                  {(outcome.classification_confidence * 100).toFixed(0)}%
                </span>
              </div>
              <Progress value={outcome.classification_confidence * 100} className="h-2" />
            </div>
          )}

          {/* Classification Reasoning */}
          {outcome.classification_reasoning?.summary && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">AI Analysis</h4>
              <p className="text-sm text-muted-foreground">
                {outcome.classification_reasoning.summary}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Metrics Comparison</CardTitle>
          <CardDescription>
            30-day comparison before and after shipping
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Sentiment Score"
              before={metrics.sentimentChange.before}
              after={metrics.sentimentChange.after}
              delta={metrics.sentimentChange.delta}
              trend={metrics.sentimentChange.trend}
            />
            <MetricCard
              title="Feedback Volume"
              before={metrics.volumeChange.before}
              after={metrics.volumeChange.after}
              delta={metrics.volumeChange.delta}
              trend={metrics.volumeChange.trend}
              invertColor={true}
            />
            <MetricCard
              title="Churn Risk"
              before={metrics.churnChange.before}
              after={metrics.churnChange.after}
              delta={metrics.churnChange.delta}
              trend={metrics.churnChange.trend}
              invertColor={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* Key Factors */}
      {outcome.classification_reasoning?.key_factors &&
        outcome.classification_reasoning.key_factors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Key Factors</CardTitle>
              <CardDescription>
                Factors that influenced the classification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {outcome.classification_reasoning.key_factors.map((factor, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg border"
                  >
                    <div
                      className={cn(
                        'w-2 h-2 mt-1.5 rounded-full shrink-0',
                        factor.impact === 'positive'
                          ? 'bg-green-500'
                          : factor.impact === 'negative'
                          ? 'bg-red-500'
                          : 'bg-gray-400'
                      )}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{factor.factor}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {factor.evidence}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {(factor.weight * 100).toFixed(0)}% weight
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                    {index + 1}
                  </span>
                  <p className="text-sm">{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Metadata */}
      <div className="text-center text-xs text-muted-foreground">
        Report generated on {new Date(report.generatedAt).toLocaleString()}
      </div>
    </div>
  );
}
