/**
 * ExperimentResultsLive Component
 * Real-time display of experiment results with statistical analysis
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Trophy,
    TrendingUp,
    TrendingDown,
    Users,
    Target,
    RefreshCw,
    AlertCircle,
    CheckCircle,
    Clock,
} from 'lucide-react';
import {
    analyzeExperiment,
    formatPercent,
    formatNumber,
    ExperimentAnalysis,
} from '@/lib/experiments/statistics';

interface VariantData {
    name: string;
    visitors: number;
    conversions: number;
    isControl: boolean;
}

interface ExperimentResultsLiveProps {
    experimentId: string;
    sampleSizeTarget?: number;
    refreshInterval?: number; // in milliseconds
}

export function ExperimentResultsLive({
    experimentId,
    sampleSizeTarget = 5000,
    refreshInterval = 30000, // 30 seconds
}: ExperimentResultsLiveProps) {
    const [variants, setVariants] = useState<VariantData[]>([
        { name: 'Control', visitors: 0, conversions: 0, isControl: true },
        { name: 'Treatment', visitors: 0, conversions: 0, isControl: false },
    ]);
    const [analysis, setAnalysis] = useState<ExperimentAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    // Fetch results
    const fetchResults = async () => {
        try {
            const response = await fetch(`/api/experiments/${experimentId}/results`);
            if (response.ok) {
                const data = await response.json();
                if (data.variants && data.variants.length > 0) {
                    setVariants(data.variants);

                    // Analyze results
                    const control = data.variants.find((v: VariantData) => v.isControl) || data.variants[0];
                    const treatment = data.variants.find((v: VariantData) => !v.isControl) || data.variants[1];

                    if (control && treatment) {
                        const result = analyzeExperiment(
                            control.conversions,
                            control.visitors,
                            treatment.conversions,
                            treatment.visitors,
                            sampleSizeTarget
                        );
                        setAnalysis(result);
                    }
                }
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error('Error fetching results:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchResults();
        const interval = setInterval(fetchResults, refreshInterval);
        return () => clearInterval(interval);
    }, [experimentId, refreshInterval]);

    const control = variants.find(v => v.isControl) || variants[0];
    const treatment = variants.find(v => !v.isControl) || variants[1];
    const totalVisitors = variants.reduce((sum, v) => sum + v.visitors, 0);
    const progress = Math.min(100, (totalVisitors / (sampleSizeTarget * 2)) * 100);

    const getRecommendationColor = (rec: string) => {
        switch (rec) {
            case 'ship': return 'bg-green-100 text-green-800 border-green-300';
            case 'stop_negative': return 'bg-red-100 text-red-800 border-red-300';
            case 'continue': return 'bg-blue-100 text-blue-800 border-blue-300';
            default: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        }
    };

    if (loading && !analysis) {
        return (
            <Card className="p-6">
                <div className="flex items-center justify-center h-48">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading results...</span>
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Live Results</h3>
                    <Badge variant="outline" className="animate-pulse">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                        Live
                    </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Updated {lastUpdated.toLocaleTimeString()}
                </div>
            </div>

            {/* Variant Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Control */}
                <div className={`p-4 rounded-lg border-2 ${analysis && analysis.lift < 0 ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-gray-200 dark:border-gray-700'
                    }`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-medium">{control.name}</span>
                        {analysis && analysis.lift < 0 && analysis.isSignificant && (
                            <Badge className="bg-green-500">
                                <Trophy className="h-3 w-3 mr-1" />
                                Leading
                            </Badge>
                        )}
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-2xl font-bold">{formatNumber(control.visitors)}</span>
                            <span className="text-sm text-muted-foreground">visitors</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <span className="text-2xl font-bold">{formatNumber(control.conversions)}</span>
                            <span className="text-sm text-muted-foreground">conversions</span>
                        </div>
                        <div className="pt-2 border-t">
                            <span className="text-3xl font-bold">
                                {control.visitors > 0 ? formatPercent(control.conversions / control.visitors) : '0%'}
                            </span>
                            <span className="text-sm text-muted-foreground ml-2">conversion rate</span>
                        </div>
                    </div>
                </div>

                {/* Treatment */}
                <div className={`p-4 rounded-lg border-2 ${analysis && analysis.lift > 0 ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-gray-200 dark:border-gray-700'
                    }`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-medium">{treatment.name}</span>
                        {analysis && analysis.lift > 0 && analysis.isSignificant && (
                            <Badge className="bg-green-500">
                                <Trophy className="h-3 w-3 mr-1" />
                                Leading
                            </Badge>
                        )}
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-2xl font-bold">{formatNumber(treatment.visitors)}</span>
                            <span className="text-sm text-muted-foreground">visitors</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <span className="text-2xl font-bold">{formatNumber(treatment.conversions)}</span>
                            <span className="text-sm text-muted-foreground">conversions</span>
                        </div>
                        <div className="pt-2 border-t">
                            <span className="text-3xl font-bold">
                                {treatment.visitors > 0 ? formatPercent(treatment.conversions / treatment.visitors) : '0%'}
                            </span>
                            <span className="text-sm text-muted-foreground ml-2">conversion rate</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            {analysis && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            {analysis.lift >= 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                            <span className={`text-2xl font-bold ${analysis.lift >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {analysis.lift >= 0 ? '+' : ''}{analysis.lift.toFixed(1)}%
                            </span>
                        </div>
                        <span className="text-sm text-muted-foreground">Lift</span>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className={`text-2xl font-bold ${analysis.confidence >= 95 ? 'text-green-600' :
                                analysis.confidence >= 80 ? 'text-yellow-600' : 'text-gray-600'
                            }`}>
                            {analysis.confidence.toFixed(1)}%
                        </span>
                        <div className="text-sm text-muted-foreground">Confidence</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="text-2xl font-bold">
                            {analysis.pValue < 0.001 ? '<0.001' : analysis.pValue.toFixed(4)}
                        </span>
                        <div className="text-sm text-muted-foreground">P-Value</div>
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Sample Size Progress</span>
                    <span className="font-medium">
                        {formatNumber(totalVisitors)} / {formatNumber(sampleSizeTarget * 2)}
                    </span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="text-xs text-muted-foreground mt-1">
                    {progress.toFixed(0)}% complete
                </div>
            </div>

            {/* Recommendation */}
            {analysis && (
                <div className={`p-4 rounded-lg border ${getRecommendationColor(analysis.recommendation)}`}>
                    <div className="flex items-start gap-3">
                        {analysis.recommendation === 'ship' ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        ) : analysis.recommendation === 'stop_negative' ? (
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        ) : (
                            <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                        )}
                        <div>
                            <p className="font-medium">
                                {analysis.recommendation === 'ship' ? '🏆 Ready to Ship!' :
                                    analysis.recommendation === 'stop_negative' ? '⚠️ Consider Stopping' :
                                        analysis.recommendation === 'continue' ? '⏳ Keep Running' :
                                            '🔍 Inconclusive'}
                            </p>
                            <p className="text-sm mt-1">{analysis.recommendationText}</p>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}
