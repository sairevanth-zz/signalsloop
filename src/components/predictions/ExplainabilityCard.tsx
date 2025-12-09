'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
    TrendingUp,
    TrendingDown,
    Lightbulb,
    Brain,
    Activity,
    HelpCircle,
    History,
    Zap,
    Info
} from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import type { ExplanationFactor, PredictionStrategy } from '@/types/prediction'

interface PredictionExplainabilityProps {
    featureName: string
    predictedAdoption: number | null // 0-1
    predictedSentimentImpact: number | null // -1 to 1
    predictedChurnReduction: number | null // 0-1
    confidenceScore: number // 0-1
    confidenceIntervalLow: number
    confidenceIntervalHigh: number
    predictionStrategy: PredictionStrategy
    factors: ExplanationFactor[]
    explanationText: string
    similarFeaturesCount?: number
}

const STRATEGY_INFO = {
    heuristic: {
        label: 'Rule-Based Analysis',
        description: 'Using rule-based scoring due to limited historical data (<10 outcomes)',
        icon: Zap
    },
    similar_features: {
        label: 'Similar Feature Matching',
        description: 'Weighted average from similar features in your history (10-50 outcomes)',
        icon: History
    },
    ml_model: {
        label: 'Machine Learning Model',
        description: 'Full ML model with 50+ historical outcomes',
        icon: Brain
    }
}

export function ExplainabilityCard({
    featureName,
    predictedAdoption,
    predictedSentimentImpact,
    predictedChurnReduction,
    confidenceScore,
    confidenceIntervalLow,
    confidenceIntervalHigh,
    predictionStrategy,
    factors,
    explanationText,
    similarFeaturesCount
}: PredictionExplainabilityProps) {
    const strategyInfo = STRATEGY_INFO[predictionStrategy]
    const StrategyIcon = strategyInfo.icon

    // Split factors into positive (boost) and negative (risk)
    const positiveFactors = factors.filter(f => f.impact.startsWith('+'))
    const negativeFactors = factors.filter(f => f.impact.startsWith('-'))

    // Determine confidence level
    const confidenceLevel = confidenceScore > 0.7 ? 'high' : confidenceScore > 0.4 ? 'moderate' : 'low'
    const confidenceColors = {
        high: 'text-green-400 bg-green-500/10',
        moderate: 'text-yellow-400 bg-yellow-500/10',
        low: 'text-red-400 bg-red-500/10'
    }

    return (
        <Card className="border-slate-700 bg-slate-900">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-400" />
                        Why This Prediction?
                    </CardTitle>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge variant="outline" className="border-slate-600 cursor-help flex items-center gap-1">
                                    <StrategyIcon className="w-3 h-3" />
                                    {strategyInfo.label}
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-xs bg-slate-800 border-slate-700">
                                <p className="text-sm">{strategyInfo.description}</p>
                                {similarFeaturesCount && (
                                    <p className="text-xs text-slate-400 mt-1">
                                        Based on {similarFeaturesCount} similar feature{similarFeaturesCount !== 1 ? 's' : ''}
                                    </p>
                                )}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* AI Explanation Summary */}
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <p className="text-slate-300 text-sm leading-relaxed">{explanationText}</p>
                </div>

                {/* Key Predictions Grid */}
                <div className="grid grid-cols-3 gap-4">
                    {/* Adoption Rate */}
                    <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-4 h-4 text-blue-400" />
                            <span className="text-xs text-slate-400">Adoption</span>
                        </div>
                        <p className="text-2xl font-bold text-white">
                            {predictedAdoption !== null ? `${Math.round(predictedAdoption * 100)}%` : 'N/A'}
                        </p>
                    </div>

                    {/* Sentiment Impact */}
                    <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-2 mb-2">
                            {(predictedSentimentImpact || 0) >= 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-400" />
                            ) : (
                                <TrendingDown className="w-4 h-4 text-red-400" />
                            )}
                            <span className="text-xs text-slate-400">Sentiment</span>
                        </div>
                        <p className={`text-2xl font-bold ${(predictedSentimentImpact || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {predictedSentimentImpact !== null
                                ? `${predictedSentimentImpact > 0 ? '+' : ''}${(predictedSentimentImpact * 100).toFixed(0)}%`
                                : 'N/A'}
                        </p>
                    </div>

                    {/* Churn Reduction */}
                    <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingDown className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs text-slate-400">Churn ↓</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-400">
                            {predictedChurnReduction !== null
                                ? `${Math.round(predictedChurnReduction * 100)}%`
                                : 'N/A'}
                        </p>
                    </div>
                </div>

                {/* Factor Breakdown */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Positive Factors */}
                    <div>
                        <h4 className="text-sm font-medium text-green-400 mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Positive Signals ({positiveFactors.length})
                        </h4>
                        <div className="space-y-2">
                            {positiveFactors.length === 0 ? (
                                <p className="text-xs text-slate-500 italic">No positive signals detected</p>
                            ) : (
                                positiveFactors.slice(0, 5).map((factor, i) => (
                                    <div key={i} className="p-2 bg-green-500/10 border border-green-500/20 rounded">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs text-slate-300 line-clamp-1">{factor.factor}</span>
                                            <Badge className="bg-green-600 text-white text-[10px] ml-2 flex-shrink-0">
                                                {factor.impact}
                                            </Badge>
                                        </div>
                                        <Progress value={factor.weight * 100} className="h-1 bg-green-900" />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Negative Factors */}
                    <div>
                        <h4 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
                            <TrendingDown className="w-4 h-4" />
                            Risk Signals ({negativeFactors.length})
                        </h4>
                        <div className="space-y-2">
                            {negativeFactors.length === 0 ? (
                                <p className="text-xs text-slate-500 italic">No risk signals detected</p>
                            ) : (
                                negativeFactors.slice(0, 5).map((factor, i) => (
                                    <div key={i} className="p-2 bg-red-500/10 border border-red-500/20 rounded">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs text-slate-300 line-clamp-1">{factor.factor}</span>
                                            <Badge className="bg-red-600 text-white text-[10px] ml-2 flex-shrink-0">
                                                {factor.impact}
                                            </Badge>
                                        </div>
                                        <Progress value={factor.weight * 100} className="h-1 bg-red-900" />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Confidence Indicator */}
                <div className="pt-4 border-t border-slate-700">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-400">Prediction Confidence</span>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs bg-slate-800 border-slate-700">
                                        <p className="text-sm">
                                            Range: {Math.round(confidenceIntervalLow * 100)}% - {Math.round(confidenceIntervalHigh * 100)}%
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <Badge className={`${confidenceColors[confidenceLevel]} border-0`}>
                            {Math.round(confidenceScore * 100)}% - {confidenceLevel.charAt(0).toUpperCase() + confidenceLevel.slice(1)}
                        </Badge>
                    </div>
                    <Progress
                        value={confidenceScore * 100}
                        className={`h-2 ${confidenceLevel === 'high' ? 'bg-green-900' :
                                confidenceLevel === 'moderate' ? 'bg-yellow-900' : 'bg-red-900'
                            }`}
                    />
                    <p className="text-xs text-slate-500 mt-2">
                        {confidenceLevel === 'high'
                            ? 'High confidence based on strong data signals and historical patterns'
                            : confidenceLevel === 'moderate'
                                ? 'Moderate confidence - consider additional validation before committing'
                                : 'Lower confidence due to limited historical data - use as directional guidance'}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
