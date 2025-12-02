'use client';

/**
 * OutcomeTimeline Component
 *
 * Displays a timeline of feature outcomes with visual indicators.
 */

import { cn } from '@/lib/utils';
import type { FeatureOutcomeDetailed, OutcomeClassification } from '@/types/outcome-attribution';

interface OutcomeTimelineProps {
  outcomes: FeatureOutcomeDetailed[];
  onSelect?: (outcome: FeatureOutcomeDetailed) => void;
  selectedId?: string;
  className?: string;
}

/**
 * Get color for classification
 */
function getClassificationColor(classification: OutcomeClassification | null): string {
  switch (classification) {
    case 'success':
      return 'bg-green-500';
    case 'partial_success':
      return 'bg-yellow-500';
    case 'no_impact':
      return 'bg-gray-400';
    case 'negative_impact':
      return 'bg-red-500';
    case 'pending':
    default:
      return 'bg-blue-500 animate-pulse';
  }
}

/**
 * Get icon for classification
 */
function getClassificationIcon(classification: OutcomeClassification | null): string {
  switch (classification) {
    case 'success':
      return '✓';
    case 'partial_success':
      return '◐';
    case 'no_impact':
      return '○';
    case 'negative_impact':
      return '✗';
    case 'pending':
    default:
      return '◉';
  }
}

export function OutcomeTimeline({
  outcomes,
  onSelect,
  selectedId,
  className,
}: OutcomeTimelineProps) {
  if (outcomes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No outcomes to display</p>
        <p className="text-sm">Ship features to start tracking outcomes</p>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

      {/* Timeline items */}
      <div className="space-y-6">
        {outcomes.map((outcome, index) => {
          const isSelected = outcome.id === selectedId;
          const isLast = index === outcomes.length - 1;

          return (
            <div
              key={outcome.id}
              className={cn(
                'relative pl-10 cursor-pointer transition-opacity',
                onSelect && 'hover:opacity-80',
                isSelected && 'opacity-100',
                !isSelected && selectedId && 'opacity-50'
              )}
              onClick={() => onSelect?.(outcome)}
            >
              {/* Timeline dot */}
              <div
                className={cn(
                  'absolute left-2 w-5 h-5 rounded-full flex items-center justify-center text-xs text-white font-bold',
                  getClassificationColor(outcome.outcome_classification),
                  isSelected && 'ring-2 ring-offset-2 ring-primary'
                )}
              >
                {getClassificationIcon(outcome.outcome_classification)}
              </div>

              {/* Content */}
              <div
                className={cn(
                  'p-4 rounded-lg border transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-primary/50'
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-sm">{outcome.theme_name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {outcome.priority_level} priority
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(outcome.shipped_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Metrics summary */}
                <div className="flex gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Sentiment: </span>
                    <span
                      className={cn(
                        'font-medium',
                        (outcome.sentiment_delta ?? 0) > 0
                          ? 'text-green-600 dark:text-green-400'
                          : (outcome.sentiment_delta ?? 0) < 0
                          ? 'text-red-600 dark:text-red-400'
                          : ''
                      )}
                    >
                      {outcome.sentiment_delta !== null
                        ? `${outcome.sentiment_delta > 0 ? '+' : ''}${(outcome.sentiment_delta * 100).toFixed(1)}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Volume: </span>
                    <span
                      className={cn(
                        'font-medium',
                        (outcome.theme_volume_delta ?? 0) < 0
                          ? 'text-green-600 dark:text-green-400'
                          : (outcome.theme_volume_delta ?? 0) > 0
                          ? 'text-red-600 dark:text-red-400'
                          : ''
                      )}
                    >
                      {outcome.theme_volume_delta !== null
                        ? `${outcome.theme_volume_delta > 0 ? '+' : ''}${outcome.theme_volume_delta}`
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Status indicator */}
                {outcome.status === 'monitoring' && (
                  <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                    {Math.ceil(outcome.days_remaining || 0)} days remaining
                  </div>
                )}
              </div>

              {/* Connector line to next item */}
              {!isLast && (
                <div className="absolute left-[0.9rem] top-8 bottom-[-24px] w-0.5 bg-border" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
