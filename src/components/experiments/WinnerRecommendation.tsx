/**
 * WinnerRecommendation Component
 * AI-powered recommendation when experiment reaches significance
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Trophy,
    Rocket,
    XCircle,
    TrendingUp,
    DollarSign,
    Sparkles,
    AlertTriangle,
} from 'lucide-react';
import { ExperimentAnalysis } from '@/lib/experiments/statistics';

interface WinnerRecommendationProps {
    analysis: ExperimentAnalysis;
    experimentName: string;
    winnerVariant: string;
    loserVariant: string;
    onDeploy?: () => void;
    onContinue?: () => void;
    onStop?: () => void;
    estimatedImpact?: {
        monthlyRevenue?: number;
        monthlyUsers?: number;
    };
}

export function WinnerRecommendation({
    analysis,
    experimentName,
    winnerVariant,
    loserVariant,
    onDeploy,
    onContinue,
    onStop,
    estimatedImpact,
}: WinnerRecommendationProps) {
    const [deploying, setDeploying] = useState(false);

    const handleDeploy = async () => {
        setDeploying(true);
        try {
            await onDeploy?.();
        } finally {
            setDeploying(false);
        }
    };

    const isPositiveResult = analysis.lift > 0;
    const confidenceEmoji = analysis.confidence >= 99 ? '🔥' :
        analysis.confidence >= 95 ? '✅' :
            analysis.confidence >= 90 ? '👍' : '🔍';

    return (
        <Card className={`p-6 ${isPositiveResult
                ? 'border-2 border-green-400 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950'
                : 'border-2 border-red-400 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950'
            }`}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 rounded-full ${isPositiveResult ? 'bg-green-200 dark:bg-green-800' : 'bg-red-200 dark:bg-red-800'
                    }`}>
                    {isPositiveResult ? (
                        <Trophy className="h-6 w-6 text-green-700 dark:text-green-300" />
                    ) : (
                        <AlertTriangle className="h-6 w-6 text-red-700 dark:text-red-300" />
                    )}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold">
                            {isPositiveResult ? '🎉 Winner Found!' : '⚠️ Negative Result'}
                        </h2>
                        <Badge variant="outline" className="bg-white/50">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI Analysis
                        </Badge>
                    </div>
                    <p className="text-muted-foreground">{experimentName}</p>
                </div>
            </div>

            {/* Winner Banner */}
            <div className={`p-4 rounded-lg mb-6 ${isPositiveResult
                    ? 'bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700'
                    : 'bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700'
                }`}>
                <div className="flex items-center gap-3">
                    <Trophy className={`h-8 w-8 ${isPositiveResult ? 'text-green-600' : 'text-red-600'
                        }`} />
                    <div>
                        <p className={`text-lg font-bold ${isPositiveResult ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                            }`}>
                            {isPositiveResult ? winnerVariant : loserVariant} is the winner
                        </p>
                        <p className={`text-sm ${isPositiveResult ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                            }`}>
                            Outperforms {isPositiveResult ? loserVariant : winnerVariant} by{' '}
                            <strong>{Math.abs(analysis.lift).toFixed(1)}%</strong>
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-1">
                        <TrendingUp className={`h-4 w-4 ${analysis.lift >= 0 ? 'text-green-500' : 'text-red-500'
                            }`} />
                        <span className={`text-2xl font-bold ${analysis.lift >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {analysis.lift >= 0 ? '+' : ''}{analysis.lift.toFixed(1)}%
                        </span>
                    </div>
                    <span className="text-sm text-muted-foreground">Lift</span>
                </div>
                <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                    <span className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                        {confidenceEmoji} {analysis.confidence.toFixed(1)}%
                    </span>
                    <div className="text-sm text-muted-foreground">Confidence</div>
                </div>
                <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                    <span className="text-2xl font-bold">
                        p={analysis.pValue < 0.001 ? '<0.001' : analysis.pValue.toFixed(4)}
                    </span>
                    <div className="text-sm text-muted-foreground">P-Value</div>
                </div>
            </div>

            {/* Estimated Impact */}
            {estimatedImpact && isPositiveResult && (
                <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <span className="font-semibold">Estimated Impact</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {estimatedImpact.monthlyRevenue && (
                            <div>
                                <span className="text-2xl font-bold text-green-600">
                                    +${(estimatedImpact.monthlyRevenue * (analysis.lift / 100)).toLocaleString()}
                                </span>
                                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                            </div>
                        )}
                        {estimatedImpact.monthlyUsers && (
                            <div>
                                <span className="text-2xl font-bold text-green-600">
                                    +{Math.round(estimatedImpact.monthlyUsers * (analysis.lift / 100)).toLocaleString()}
                                </span>
                                <p className="text-sm text-muted-foreground">Monthly Conversions</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* AI Recommendation */}
            <div className="p-4 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <span className="font-semibold text-purple-800 dark:text-purple-200">AI Recommendation</span>
                </div>
                <p className="text-purple-900 dark:text-purple-100">
                    {analysis.recommendation === 'ship' ? (
                        <>
                            <strong>Ship the {winnerVariant} variant.</strong> With {analysis.confidence.toFixed(1)}%
                            confidence and +{analysis.lift.toFixed(1)}% improvement, this is a clear winner.
                            The statistical power achieved is {(analysis.achievedPower * 100).toFixed(0)}%,
                            indicating reliable results.
                        </>
                    ) : analysis.recommendation === 'stop_negative' ? (
                        <>
                            <strong>Consider stopping this experiment.</strong> The {loserVariant} variant
                            is performing {Math.abs(analysis.lift).toFixed(1)}% worse than control.
                            Rolling back to control is recommended.
                        </>
                    ) : (
                        <>
                            <strong>Continue collecting data.</strong> While there's a trend, we haven't
                            reached sufficient confidence yet. Keep running to get more reliable results.
                        </>
                    )}
                </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
                {isPositiveResult && onDeploy && (
                    <Button
                        onClick={handleDeploy}
                        disabled={deploying}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                        <Rocket className="h-4 w-4 mr-2" />
                        {deploying ? 'Deploying...' : 'Deploy Winner'}
                    </Button>
                )}
                {onContinue && (
                    <Button variant="outline" onClick={onContinue} className="flex-1">
                        Continue Testing
                    </Button>
                )}
                {onStop && (
                    <Button
                        variant="outline"
                        onClick={onStop}
                        className={!isPositiveResult ? 'flex-1 border-red-300 text-red-600 hover:bg-red-50' : ''}
                    >
                        <XCircle className="h-4 w-4 mr-2" />
                        End Experiment
                    </Button>
                )}
            </div>
        </Card>
    );
}
