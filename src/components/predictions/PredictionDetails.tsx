'use client';

/**
 * Prediction Details Component
 *
 * Full detailed view of a prediction with all factors and charts
 */

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { FeaturePrediction } from '@/types/prediction';
import { X, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PredictionDetailsProps {
  prediction: FeaturePrediction;
  onClose?: () => void;
}

export function PredictionDetails({ prediction, onClose }: PredictionDetailsProps) {
  const adoptionRate = prediction.predicted_adoption_rate || 0;
  const confidence = prediction.confidence_score || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{prediction.feature_name}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Prediction generated {new Date(prediction.created_at).toLocaleDateString()}
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-5" />
          </Button>
        )}
      </div>

      {/* Summary Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Prediction Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Adoption Rate</div>
              <div className="text-3xl font-bold">{(adoptionRate * 100).toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                CI: {(prediction.confidence_interval_low! * 100).toFixed(0)}-
                {(prediction.confidence_interval_high! * 100).toFixed(0)}%
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-1">Sentiment Impact</div>
              <div className="text-3xl font-bold">
                {prediction.predicted_sentiment_impact! > 0 ? '+' : ''}
                {prediction.predicted_sentiment_impact?.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {prediction.predicted_sentiment_impact! > 0.1
                  ? 'Positive effect'
                  : 'Neutral/negative'}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-1">Confidence</div>
              <div className="text-3xl font-bold">{(confidence * 100).toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                {confidence > 0.8 ? 'High' : confidence > 0.6 ? 'Medium' : 'Low'}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-1">Strategy</div>
              <div className="text-lg font-semibold capitalize">
                {prediction.prediction_strategy.replace('_', ' ')}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {prediction.strategy_metadata.historical_outcomes_count || 0} historical features
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>Why This Prediction?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground">{prediction.explanation_text}</p>
        </CardContent>
      </Card>

      {/* Factors */}
      {prediction.explanation_factors && prediction.explanation_factors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Contributing Factors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {prediction.explanation_factors.map((factor, idx) => {
                const isPositive = factor.impact.startsWith('+');
                const Icon = isPositive ? CheckCircle2 : AlertCircle;
                const colorClass = isPositive
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-amber-600 dark:text-amber-400';

                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <Icon className={`size-5 mt-0.5 ${colorClass}`} />
                    <div className="flex-1">
                      <div className="font-medium">{factor.factor}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Impact: <span className={colorClass}>{factor.impact}</span> • Weight:{' '}
                        {(factor.weight * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Input Features */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Characteristics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Category</div>
              <div className="font-medium capitalize mt-1">
                {prediction.input_features.feature_category}
              </div>
            </div>

            <div>
              <div className="text-muted-foreground">Target Segment</div>
              <div className="font-medium capitalize mt-1">
                {prediction.input_features.target_segment}
              </div>
            </div>

            <div>
              <div className="text-muted-foreground">Complexity</div>
              <div className="font-medium capitalize mt-1">
                {prediction.input_features.technical_complexity}
              </div>
            </div>

            <div>
              <div className="text-muted-foreground">Feedback Volume</div>
              <div className="font-medium mt-1">{prediction.input_features.feedback_volume}</div>
            </div>

            <div>
              <div className="text-muted-foreground">Estimated Effort</div>
              <div className="font-medium mt-1">
                {prediction.input_features.estimated_effort_weeks} weeks
              </div>
            </div>

            <div>
              <div className="text-muted-foreground">Enterprise Demand</div>
              <div className="font-medium mt-1">
                {(prediction.input_features.enterprise_requester_pct * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t space-y-2">
            {prediction.input_features.addresses_churn_theme && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 text-green-500" />
                <span>Addresses churn-related theme</span>
              </div>
            )}
            {prediction.input_features.addresses_expansion_theme && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 text-green-500" />
                <span>Addresses expansion opportunity</span>
              </div>
            )}
            {prediction.input_features.has_clear_success_metric && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 text-green-500" />
                <span>Has clear success metrics</span>
              </div>
            )}
            {prediction.input_features.competitor_has_feature && (
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="size-4 text-amber-500" />
                <span>
                  Competitor has similar feature ({prediction.input_features.competitor_advantage_months}{' '}
                  months ahead)
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-5" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {adoptionRate > 0.7 && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <div className="font-medium text-green-900 dark:text-green-100">
                  ✓ High confidence prediction - Consider prioritizing
                </div>
                <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                  This feature shows strong potential for adoption and user satisfaction.
                </div>
              </div>
            )}

            {adoptionRate < 0.4 && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <div className="font-medium text-amber-900 dark:text-amber-100">
                  ⚠ Lower adoption expected - Consider validation
                </div>
                <div className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Gather more customer feedback or consider pivoting the approach.
                </div>
              </div>
            )}

            {confidence < 0.6 && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div className="font-medium text-blue-900 dark:text-blue-100">
                  ℹ Low confidence - Need more data
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  This prediction has limited historical data. Ship smaller features to build
                  prediction accuracy over time.
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
