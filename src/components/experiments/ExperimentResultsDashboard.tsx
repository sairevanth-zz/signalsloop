/**
 * Experiment Results Dashboard Component
 * Shows real-time A/B test results with statistical significance
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Users,
    Target,
    Trophy,
    AlertTriangle,
    CheckCircle,
    Clock,
    BarChart3,
} from 'lucide-react';

interface VariantResult {
    variantId: string;
    variantKey: string;
    variantName: string;
    isControl: boolean;
    visitors: number;
    conversions: number;
    conversionRate: number;
    lift: number | null;
    confidence: number;
    isWinner: boolean;
    isSignificant: boolean;
}

interface ExperimentResults {
    experimentId: string;
    experimentName: string;
    status: string;
    startDate: string | null;
    totalVisitors: number;
    totalConversions: number;
    variants: VariantResult[];
    hasSignificantWinner: boolean;
    recommendedAction: 'continue' | 'stop_winner' | 'stop_loser' | 'needs_more_data';
    daysRunning: number;
    projectedDaysToSignificance: number | null;
}

interface Props {
    experimentId: string;
}

export function ExperimentResultsDashboard({ experimentId }: Props) {
    const [results, setResults] = useState<ExperimentResults | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchResults = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/experiments/${experimentId}/results`);
            if (!response.ok) throw new Error('Failed to fetch results');
            const data = await response.json();
            setResults(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchResults();
        // Poll for updates every 30 seconds
        const interval = setInterval(fetchResults, 30000);
        return () => clearInterval(interval);
    }, [experimentId]);

    if (loading && !results) {
        return (
            <Card className="p-6">
                <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin text-gray-400 mr-2" />
                    <span className="text-gray-500">Loading results...</span>
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="p-6 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Error loading results: {error}</span>
                </div>
            </Card>
        );
    }

    if (!results) return null;

    const recommendationStyles = {
        continue: { icon: Clock, text: 'Continue Running', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
        stop_winner: { icon: Trophy, text: 'Clear Winner - Stop Test', color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
        stop_loser: { icon: AlertTriangle, text: 'No Winner - Consider Stopping', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' },
        needs_more_data: { icon: BarChart3, text: 'Needs More Data', color: 'text-gray-600 bg-gray-100 dark:bg-gray-800' },
    };

    const recommendation = recommendationStyles[results.recommendedAction];
    const RecommendationIcon = recommendation.icon;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Visitors</p>
                            <p className="text-2xl font-bold">{results.totalVisitors.toLocaleString()}</p>
                        </div>
                        <Users className="h-8 w-8 text-blue-500" />
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Conversions</p>
                            <p className="text-2xl font-bold">{results.totalConversions.toLocaleString()}</p>
                        </div>
                        <Target className="h-8 w-8 text-green-500" />
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Days Running</p>
                            <p className="text-2xl font-bold">{results.daysRunning}</p>
                        </div>
                        <Clock className="h-8 w-8 text-purple-500" />
                    </div>
                </Card>

                <Card className={`p-4 ${recommendation.color}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-80">Recommendation</p>
                            <p className="text-lg font-semibold">{recommendation.text}</p>
                        </div>
                        <RecommendationIcon className="h-8 w-8" />
                    </div>
                </Card>
            </div>

            {/* Variants Comparison */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">Variant Performance</h3>
                    <Button variant="outline" size="sm" onClick={fetchResults} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                <div className="space-y-4">
                    {results.variants.map((variant) => (
                        <div
                            key={variant.variantId}
                            className={`p-4 rounded-lg border ${variant.isWinner
                                    ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
                                    : 'border-gray-200 dark:border-gray-700'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <span className="font-semibold">{variant.variantName}</span>
                                    {variant.isControl && (
                                        <Badge variant="secondary" className="text-xs">Control</Badge>
                                    )}
                                    {variant.isWinner && (
                                        <Badge className="bg-green-500 text-white text-xs">
                                            <Trophy className="h-3 w-3 mr-1" />
                                            Winner
                                        </Badge>
                                    )}
                                    {variant.isSignificant && !variant.isWinner && (
                                        <Badge className="bg-blue-500 text-white text-xs">Significant</Badge>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold">{variant.conversionRate.toFixed(2)}%</div>
                                    <div className="text-sm text-muted-foreground">
                                        {variant.conversions} / {variant.visitors}
                                    </div>
                                </div>
                            </div>

                            {/* Conversion Rate Bar */}
                            <div className="mb-3">
                                <Progress
                                    value={Math.min(variant.conversionRate * 10, 100)}
                                    className={variant.isWinner ? 'bg-green-200' : ''}
                                />
                            </div>

                            {/* Lift and Confidence */}
                            {!variant.isControl && variant.lift !== null && (
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1">
                                        {variant.lift >= 0 ? (
                                            <TrendingUp className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <TrendingDown className="h-4 w-4 text-red-500" />
                                        )}
                                        <span className={variant.lift >= 0 ? 'text-green-600' : 'text-red-600'}>
                                            {variant.lift >= 0 ? '+' : ''}{variant.lift.toFixed(1)}% lift
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {variant.isSignificant ? (
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Clock className="h-4 w-4 text-gray-400" />
                                        )}
                                        <span className={variant.isSignificant ? 'text-green-600' : 'text-gray-500'}>
                                            {variant.confidence.toFixed(1)}% confidence
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </Card>

            {/* Projected Timeline */}
            {results.projectedDaysToSignificance !== null && !results.hasSignificantWinner && (
                <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                        <p className="text-blue-700 dark:text-blue-300">
                            <strong>Estimated {results.projectedDaysToSignificance} days</strong> until statistical significance
                            at current traffic rate.
                        </p>
                    </div>
                </Card>
            )}
        </div>
    );
}
