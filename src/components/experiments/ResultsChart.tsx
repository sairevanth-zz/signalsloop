import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, CheckCircle, AlertCircle } from 'lucide-react';

interface ExperimentResult {
  metric_name: string;
  variant: string;
  sample_size: number;
  mean_value: number;
  std_dev: number;
  conversion_rate?: number;
  p_value?: number;
  confidence_interval?: { lower: number; upper: number };
  statistical_significance: boolean;
  relative_improvement?: number;
}

interface ResultsChartProps {
  results: ExperimentResult[];
  primaryMetric: string;
}

export function ResultsChart({ results, primaryMetric }: ResultsChartProps) {
  // Group results by metric
  const metricGroups = results.reduce((acc, result) => {
    if (!acc[result.metric_name]) {
      acc[result.metric_name] = [];
    }
    acc[result.metric_name].push(result);
    return acc;
  }, {} as Record<string, ExperimentResult[]>);

  // Sort to show primary metric first
  const sortedMetrics = Object.keys(metricGroups).sort((a, b) => {
    if (a === primaryMetric) return -1;
    if (b === primaryMetric) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      {sortedMetrics.map((metricName) => {
        const metricResults = metricGroups[metricName];
        const control = metricResults.find((r) => r.variant === 'control');
        const treatment = metricResults.find((r) => r.variant === 'treatment');

        if (!control || !treatment) return null;

        const isPrimary = metricName === primaryMetric;
        const isSignificant = treatment.statistical_significance;
        const improvement = treatment.relative_improvement || 0;
        const isPositive = improvement > 0;

        return (
          <Card key={metricName} className={`p-6 ${isPrimary ? 'border-2 border-blue-500' : ''}`}>
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold">{metricName}</h3>
                  {isPrimary && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Primary Metric
                    </Badge>
                  )}
                </div>
                {treatment.p_value !== undefined && (
                  <p className="text-sm text-muted-foreground">
                    p-value: {treatment.p_value.toFixed(4)}
                  </p>
                )}
              </div>

              {/* Significance Badge */}
              {isSignificant ? (
                <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Significant</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Not Significant</span>
                </div>
              )}
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Control */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <p className="text-sm text-muted-foreground mb-2">Control (A)</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-2xl font-bold">
                      {control.conversion_rate !== undefined
                        ? `${(control.conversion_rate * 100).toFixed(2)}%`
                        : control.mean_value.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {control.sample_size.toLocaleString()} samples
                    </p>
                  </div>
                  {control.confidence_interval && (
                    <div className="text-xs">
                      <p className="text-muted-foreground">95% CI:</p>
                      <p className="font-medium">
                        [{control.confidence_interval.lower.toFixed(2)}, {control.confidence_interval.upper.toFixed(2)}]
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Treatment */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <p className="text-sm text-muted-foreground mb-2">Treatment (B)</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-2xl font-bold">
                      {treatment.conversion_rate !== undefined
                        ? `${(treatment.conversion_rate * 100).toFixed(2)}%`
                        : treatment.mean_value.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {treatment.sample_size.toLocaleString()} samples
                    </p>
                  </div>
                  {treatment.confidence_interval && (
                    <div className="text-xs">
                      <p className="text-muted-foreground">95% CI:</p>
                      <p className="font-medium">
                        [{treatment.confidence_interval.lower.toFixed(2)}, {treatment.confidence_interval.upper.toFixed(2)}]
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Improvement Indicator */}
            <div className="flex items-center justify-center gap-2 p-4 bg-gray-50 rounded-lg">
              {isPositive ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : improvement < 0 ? (
                <TrendingDown className="h-5 w-5 text-red-600" />
              ) : (
                <Minus className="h-5 w-5 text-gray-600" />
              )}
              <span className={`text-lg font-semibold ${
                isPositive ? 'text-green-600' : improvement < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {isPositive ? '+' : ''}{improvement.toFixed(2)}% {isPositive ? 'improvement' : improvement < 0 ? 'decrease' : 'no change'}
              </span>
            </div>

            {/* Visual Bar Comparison */}
            <div className="mt-6">
              <p className="text-sm text-muted-foreground mb-3">Visual Comparison</p>
              <div className="space-y-3">
                {/* Control Bar */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground w-20">Control</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                      <div
                        className="bg-gray-500 h-6 rounded-full flex items-center justify-end pr-2"
                        style={{
                          width: `${Math.min(100, (control.mean_value / Math.max(control.mean_value, treatment.mean_value)) * 100)}%`
                        }}
                      >
                        <span className="text-xs text-white font-medium">
                          {control.conversion_rate !== undefined
                            ? `${(control.conversion_rate * 100).toFixed(1)}%`
                            : control.mean_value.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Treatment Bar */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground w-20">Treatment</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                      <div
                        className={`h-6 rounded-full flex items-center justify-end pr-2 ${
                          isPositive ? 'bg-green-500' : improvement < 0 ? 'bg-red-500' : 'bg-gray-500'
                        }`}
                        style={{
                          width: `${Math.min(100, (treatment.mean_value / Math.max(control.mean_value, treatment.mean_value)) * 100)}%`
                        }}
                      >
                        <span className="text-xs text-white font-medium">
                          {treatment.conversion_rate !== undefined
                            ? `${(treatment.conversion_rate * 100).toFixed(1)}%`
                            : treatment.mean_value.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistical Details */}
            <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Std Deviation</p>
                <p className="font-semibold">
                  Control: {control.std_dev.toFixed(3)}
                </p>
                <p className="font-semibold">
                  Treatment: {treatment.std_dev.toFixed(3)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Sample</p>
                <p className="font-semibold">
                  {(control.sample_size + treatment.sample_size).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Effect Size</p>
                <p className="font-semibold">
                  {Math.abs((treatment.mean_value - control.mean_value) / control.std_dev).toFixed(3)}
                </p>
              </div>
            </div>
          </Card>
        );
      })}

      {results.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No results data available yet</p>
        </Card>
      )}
    </div>
  );
}
