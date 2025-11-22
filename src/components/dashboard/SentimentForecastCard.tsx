'use client';

/**
 * Sentiment Forecast Card
 *
 * Displays AI-predicted sentiment trends for the next 7, 14, or 30 days
 * Shows confidence intervals and trend direction
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Sparkles,
  Calendar,
  Target,
} from 'lucide-react';

interface SentimentForecast {
  id: string;
  forecastDate: string;
  targetDate: string;
  horizon: number;
  predictedSentiment: number;
  confidenceLower: number;
  confidenceUpper: number;
  trendDirection: 'improving' | 'declining' | 'stable';
  model: string;
  trainingWindow: number;
  dataPoints: number;
  avgSentiment: number;
  volatility: number;
}

interface Props {
  projectId: string;
}

export function SentimentForecastCard({ projectId }: Props) {
  const [forecasts, setForecasts] = useState<Record<number, SentimentForecast | null>>({
    7: null,
    14: null,
    30: null,
  });
  const [selectedHorizon, setSelectedHorizon] = useState<7 | 14 | 30>(7);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentForecast = forecasts[selectedHorizon];

  // Fetch all forecasts on mount
  useEffect(() => {
    fetchAllForecasts();
  }, [projectId]);

  async function fetchAllForecasts() {
    setIsLoading(true);
    setError(null);

    try {
      const horizons = [7, 14, 30];
      const results = await Promise.all(
        horizons.map(async (horizon) => {
          const response = await fetch(
            `/api/forecasts/sentiment?projectId=${projectId}&horizon=${horizon}`
          );
          const data = await response.json();
          return { horizon, forecast: data.forecast };
        })
      );

      const newForecasts: Record<number, SentimentForecast | null> = {};
      results.forEach(({ horizon, forecast }) => {
        newForecasts[horizon] = forecast;
      });

      setForecasts(newForecasts);
    } catch (err) {
      console.error('Error fetching forecasts:', err);
      setError('Failed to load forecasts');
    } finally {
      setIsLoading(false);
    }
  }

  async function generateAllForecasts() {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/forecasts/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          generateAll: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate forecasts');
      }

      // Refresh forecasts after generation
      await fetchAllForecasts();
    } catch (err) {
      console.error('Error generating forecasts:', err);
      setError('Failed to generate forecasts. Ensure you have sufficient historical data.');
    } finally {
      setIsGenerating(false);
    }
  }

  function getSentimentColor(score: number): string {
    if (score >= 0.3) return 'text-green-600';
    if (score <= -0.3) return 'text-red-600';
    return 'text-gray-600';
  }

  function getSentimentLabel(score: number): string {
    if (score >= 0.7) return 'Very Positive';
    if (score >= 0.3) return 'Positive';
    if (score <= -0.7) return 'Very Negative';
    if (score <= -0.3) return 'Negative';
    return 'Neutral';
  }

  function getTrendIcon(direction: string) {
    switch (direction) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  }

  function getTrendBadgeColor(direction: string): string {
    switch (direction) {
      case 'improving':
        return 'bg-green-100 text-green-800';
      case 'declining':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Calculate confidence interval width as percentage
  function getConfidenceWidth(forecast: SentimentForecast): number {
    const range = forecast.confidenceUpper - forecast.confidenceLower;
    return (range / 2) * 100; // As percentage of scale
  }

  if (isLoading) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Sentiment Forecast
          </CardTitle>
          <CardDescription>AI-predicted sentiment trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAnyForecast = Object.values(forecasts).some((f) => f !== null);

  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Sentiment Forecast
            </CardTitle>
            <CardDescription>AI-predicted sentiment trends using GPT-4o</CardDescription>
          </div>
          <Button
            onClick={generateAllForecasts}
            disabled={isGenerating}
            size="sm"
            variant="outline"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {hasAnyForecast ? 'Refresh' : 'Generate'}
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {error}
          </div>
        )}

        {!hasAnyForecast && !error && (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">
              No forecasts available yet. Generate forecasts to see predicted sentiment trends.
            </p>
            <Button onClick={generateAllForecasts} disabled={isGenerating}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Forecasts
            </Button>
          </div>
        )}

        {hasAnyForecast && (
          <Tabs value={selectedHorizon.toString()} onValueChange={(v) => setSelectedHorizon(Number(v) as 7 | 14 | 30)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="7">7 Days</TabsTrigger>
              <TabsTrigger value="14">14 Days</TabsTrigger>
              <TabsTrigger value="30">30 Days</TabsTrigger>
            </TabsList>

            {[7, 14, 30].map((horizon) => (
              <TabsContent key={horizon} value={horizon.toString()} className="mt-4">
                {forecasts[horizon] ? (
                  <div className="space-y-4">
                    {/* Main Prediction */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium text-gray-700">
                            Predicted for {formatDate(forecasts[horizon]!.targetDate)}
                          </span>
                        </div>
                        <div className={`text-3xl font-bold ${getSentimentColor(forecasts[horizon]!.predictedSentiment)}`}>
                          {getSentimentLabel(forecasts[horizon]!.predictedSentiment)}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Score: {forecasts[horizon]!.predictedSentiment.toFixed(2)} (±{getConfidenceWidth(forecasts[horizon]!).toFixed(0)}%)
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <Badge className={getTrendBadgeColor(forecasts[horizon]!.trendDirection)}>
                          <span className="flex items-center gap-1">
                            {getTrendIcon(forecasts[horizon]!.trendDirection)}
                            {forecasts[horizon]!.trendDirection}
                          </span>
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {forecasts[horizon]!.dataPoints} data points
                        </span>
                      </div>
                    </div>

                    {/* Confidence Interval Visualization */}
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm font-medium text-gray-700 mb-3">
                        Confidence Interval (95%)
                      </div>
                      <div className="relative h-12 bg-gray-100 rounded-full overflow-hidden">
                        {/* Scale markers */}
                        <div className="absolute inset-0 flex justify-between px-2 items-center text-xs text-gray-400">
                          <span>-1.0</span>
                          <span>0</span>
                          <span>+1.0</span>
                        </div>

                        {/* Confidence band */}
                        <div
                          className="absolute h-full bg-purple-200 opacity-50"
                          style={{
                            left: `${((forecasts[horizon]!.confidenceLower + 1) / 2) * 100}%`,
                            width: `${((forecasts[horizon]!.confidenceUpper - forecasts[horizon]!.confidenceLower) / 2) * 100}%`,
                          }}
                        />

                        {/* Predicted value marker */}
                        <div
                          className="absolute h-full w-1 bg-purple-600"
                          style={{
                            left: `${((forecasts[horizon]!.predictedSentiment + 1) / 2) * 100}%`,
                          }}
                        />
                      </div>

                      <div className="flex justify-between text-xs text-gray-600 mt-2">
                        <span>Lower: {forecasts[horizon]!.confidenceLower.toFixed(2)}</span>
                        <span className="font-medium">Predicted: {forecasts[horizon]!.predictedSentiment.toFixed(2)}</span>
                        <span>Upper: {forecasts[horizon]!.confidenceUpper.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-3 bg-gray-50 rounded border">
                        <div className="text-gray-500 mb-1">Historical Average</div>
                        <div className={`font-semibold ${getSentimentColor(forecasts[horizon]!.avgSentiment)}`}>
                          {forecasts[horizon]!.avgSentiment.toFixed(2)}
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded border">
                        <div className="text-gray-500 mb-1">Volatility</div>
                        <div className="font-semibold">
                          {(forecasts[horizon]!.volatility * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Forecast metadata */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t">
                      <Calendar className="h-3 w-3" />
                      <span>Generated: {formatDate(forecasts[horizon]!.forecastDate)}</span>
                      <span>•</span>
                      <span>Using {forecasts[horizon]!.trainingWindow} days of data</span>
                      <span>•</span>
                      <span>{forecasts[horizon]!.model}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No {horizon}-day forecast available.</p>
                    <Button
                      onClick={generateAllForecasts}
                      disabled={isGenerating}
                      size="sm"
                      variant="outline"
                      className="mt-3"
                    >
                      Generate Forecast
                    </Button>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
