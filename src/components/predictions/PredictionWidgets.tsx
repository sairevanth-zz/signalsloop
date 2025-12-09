'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, Target, BarChart3 } from 'lucide-react'
import type { ExplanationFactor } from '@/types/prediction'

interface PredictionSummaryProps {
    predictedAdoption: number | null
    predictedSentimentImpact: number | null
    predictedChurnReduction: number | null
    confidenceScore: number
    topPositiveFactors: ExplanationFactor[]
    topNegativeFactors: ExplanationFactor[]
}

/**
 * Compact prediction summary for dashboard widgets
 */
export function PredictionSummaryWidget({
    predictedAdoption,
    predictedSentimentImpact,
    predictedChurnReduction,
    confidenceScore,
    topPositiveFactors,
    topNegativeFactors
}: PredictionSummaryProps) {
    const topFactor = topPositiveFactors[0] || topNegativeFactors[0]
    const isPositive = topPositiveFactors.length >= topNegativeFactors.length

    return (
        <Card className="border-slate-700 bg-slate-900">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Success Prediction
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Main prediction */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-3xl font-bold text-white">
                            {predictedAdoption !== null ? `${Math.round(predictedAdoption * 100)}%` : '--'}
                        </p>
                        <p className="text-xs text-slate-400">Predicted Adoption</p>
                    </div>
                    <Badge
                        className={`${confidenceScore > 0.7
                                ? 'bg-green-500/20 text-green-400'
                                : confidenceScore > 0.4
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'bg-red-500/20 text-red-400'
                            }`}
                    >
                        {Math.round(confidenceScore * 100)}% confidence
                    </Badge>
                </div>

                {/* Key insight */}
                {topFactor && (
                    <div className={`p-2 rounded text-xs ${isPositive ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>
                        {isPositive ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                        {topFactor.factor} ({topFactor.impact})
                    </div>
                )}

                {/* Mini metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                        <span className="text-slate-400">Sentiment:</span>
                        <span className={predictedSentimentImpact && predictedSentimentImpact > 0 ? 'text-green-400' : 'text-red-400'}>
                            {predictedSentimentImpact !== null
                                ? `${predictedSentimentImpact > 0 ? '+' : ''}${Math.round(predictedSentimentImpact * 100)}%`
                                : '--'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-slate-400">Churn ↓:</span>
                        <span className="text-emerald-400">
                            {predictedChurnReduction !== null ? `${Math.round(predictedChurnReduction * 100)}%` : '--'}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

interface FactorBreakdownProps {
    factors: ExplanationFactor[]
    maxItems?: number
}

/**
 * Standalone factor breakdown list
 */
export function FactorBreakdown({ factors, maxItems = 8 }: FactorBreakdownProps) {
    const sortedFactors = [...factors].sort((a, b) => b.weight - a.weight).slice(0, maxItems)

    return (
        <Card className="border-slate-700 bg-slate-900">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Factor Analysis
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {sortedFactors.map((factor, i) => {
                    const isPositive = factor.impact.startsWith('+')
                    return (
                        <div key={i} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-300 line-clamp-1 flex-1">{factor.factor}</span>
                                <Badge
                                    className={`text-[10px] ml-2 ${isPositive ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                                        }`}
                                >
                                    {factor.impact}
                                </Badge>
                            </div>
                            <Progress
                                value={factor.weight * 100}
                                className={`h-1 ${isPositive ? 'bg-green-900' : 'bg-red-900'}`}
                            />
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    )
}
