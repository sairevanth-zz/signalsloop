'use client';

/**
 * OutcomeCard Component
 *
 * Displays a single feature outcome with its classification and metrics.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { FeatureOutcomeDetailed, OutcomeClassification } from '@/types/outcome-attribution';

interface OutcomeCardProps {
  outcome: FeatureOutcomeDetailed;
  onClick?: () => void;
  className?: string;
}

/**
 * Get badge variant and text for classification
 */
function getClassificationBadge(classification: OutcomeClassification | null): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  text: string;
  icon: string;
} {
  switch (classification) {
    case 'success':
      return { variant: 'default', text: 'Success', icon: '✅' };
    case 'partial_success':
      return { variant: 'secondary', text: 'Partial Success', icon: '🔶' };
    case 'no_impact':
      return { variant: 'outline', text: 'No Impact', icon: '➖' };
    case 'negative_impact':
      return { variant: 'destructive', text: 'Negative Impact', icon: '❌' };
    case 'pending':
    default:
      return { variant: 'outline', text: 'Pending', icon: '⏳' };
  }
}

/**
 * Format a number as a percentage change
 */
function formatDelta(delta: number | null, invert: boolean = false): string {
  if (delta === null) return 'N/A';
  const adjusted = invert ? -delta : delta;
  const sign = adjusted > 0 ? '+' : '';
  return `${sign}${(adjusted * 100).toFixed(1)}%`;
}

/**
 * Get color class for delta
 */
function getDeltaColor(delta: number | null, invert: boolean = false): string {
  if (delta === null) return 'text-muted-foreground';
  const adjusted = invert ? -delta : delta;
  if (adjusted > 0.05) return 'text-green-600 dark:text-green-400';
  if (adjusted < -0.05) return 'text-red-600 dark:text-red-400';
  return 'text-muted-foreground';
}

export function OutcomeCard({ outcome, onClick, className }: OutcomeCardProps) {
  const badge = getClassificationBadge(outcome.outcome_classification);
  const daysRemaining = Math.max(0, Math.ceil(outcome.days_remaining || 0));
  const monitorProgress = outcome.status === 'monitoring'
    ? Math.min(100, ((30 - daysRemaining) / 30) * 100)
    : 100;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-shadow hover:shadow-md',
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{outcome.theme_name}</CardTitle>
            <CardDescription className="text-xs">
              Shipped {new Date(outcome.shipped_at).toLocaleDateString()}
            </CardDescription>
          </div>
          <Badge variant={badge.variant}>
            <span className="mr-1">{badge.icon}</span>
            {badge.text}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Sentiment Change */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Sentiment Change</p>
            <p className={cn('text-sm font-medium', getDeltaColor(outcome.sentiment_delta))}>
              {formatDelta(outcome.sentiment_delta)}
            </p>
          </div>

          {/* Volume Change */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Feedback Volume</p>
            <p className={cn('text-sm font-medium', getDeltaColor(outcome.theme_volume_delta, true))}>
              {outcome.theme_volume_delta !== null
                ? `${outcome.theme_volume_delta > 0 ? '+' : ''}${outcome.theme_volume_delta}`
                : 'N/A'}
            </p>
          </div>
        </div>

        {/* Monitor Progress */}
        {outcome.status === 'monitoring' && (
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Monitoring Progress</span>
              <span>{daysRemaining} days left</span>
            </div>
            <Progress value={monitorProgress} className="h-1.5" />
          </div>
        )}

        {/* Confidence Score */}
        {outcome.classification_confidence !== null && outcome.status === 'completed' && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Classification Confidence</span>
              <span className="font-medium">
                {(outcome.classification_confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
