'use client';

/**
 * Prediction Card Component
 *
 * Displays a feature success prediction with key metrics
 */

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { FeaturePrediction } from '@/types/prediction';
import { TrendingUp, TrendingDown, Minus, Sparkles, Info } from 'lucide-react';

interface PredictionCardProps {
  prediction: FeaturePrediction;
  onViewDetails?: () => void;
}

export function PredictionCard({ prediction, onViewDetails }: PredictionCardProps) {
  const adoptionRate = prediction.predicted_adoption_rate || 0;
  const sentimentImpact = prediction.predicted_sentiment_impact || 0;
  const confidence = prediction.confidence_score || 0;

  // Determine adoption trend icon
  const AdoptionIcon =
    adoptionRate > 0.65 ? TrendingUp : adoptionRate > 0.35 ? Minus : TrendingDown;

  // Determine sentiment icon
  const SentimentIcon =
    sentimentImpact > 0.1 ? TrendingUp : sentimentImpact > -0.1 ? Minus : TrendingDown;

  // Color based on adoption rate
  const adoptionColor =
    adoptionRate > 0.65
      ? 'text-green-600 dark:text-green-400'
      : adoptionRate > 0.35
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-red-600 dark:text-red-400';

  const sentimentColor =
    sentimentImpact > 0.1
      ? 'text-green-600 dark:text-green-400'
      : sentimentImpact > -0.1
      ? 'text-gray-600 dark:text-gray-400'
      : 'text-red-600 dark:text-red-400';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-purple-500" />
              {prediction.feature_name}
            </CardTitle>
            <CardDescription className="mt-1.5">
              Generated {new Date(prediction.created_at).toLocaleDateString()} •{' '}
              {prediction.prediction_strategy === 'heuristic'
                ? 'Heuristic Analysis'
                : prediction.prediction_strategy === 'similar_features'
                ? `Based on ${prediction.similar_feature_ids?.length || 0} similar features`
                : 'ML Model'}
            </CardDescription>
          </div>
          {onViewDetails && (
            <Button variant="ghost" size="sm" onClick={onViewDetails}>
              <Info className="size-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4">
          {/* Adoption Rate */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Predicted Adoption</div>
            <div className={`text-2xl font-bold flex items-center gap-1.5 ${adoptionColor}`}>
              <AdoptionIcon className="size-5" />
              {(adoptionRate * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">
              {prediction.confidence_interval_low &&
                prediction.confidence_interval_high &&
                `${(prediction.confidence_interval_low * 100).toFixed(0)}-${(prediction.confidence_interval_high * 100).toFixed(0)}%`}
            </div>
          </div>

          {/* Sentiment Impact */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Sentiment Impact</div>
            <div className={`text-2xl font-bold flex items-center gap-1.5 ${sentimentColor}`}>
              <SentimentIcon className="size-5" />
              {sentimentImpact > 0 ? '+' : ''}
              {sentimentImpact.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              {sentimentImpact > 0.1
                ? 'Positive'
                : sentimentImpact > -0.1
                ? 'Neutral'
                : 'Negative'}
            </div>
          </div>

          {/* Confidence */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Confidence</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {(confidence * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">
              {confidence > 0.8 ? 'High' : confidence > 0.6 ? 'Medium' : 'Low'}
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="pt-3 border-t">
          <p className="text-sm text-muted-foreground line-clamp-3">{prediction.explanation_text}</p>
        </div>

        {/* Top Factors */}
        {prediction.explanation_factors && prediction.explanation_factors.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Top Factors</div>
            <div className="space-y-1.5">
              {prediction.explanation_factors.slice(0, 2).map((factor, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <div className="mt-0.5 size-1.5 rounded-full bg-purple-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-foreground">{factor.factor}</span>
                    <span className="ml-2 text-muted-foreground">{factor.impact}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
