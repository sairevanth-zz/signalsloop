'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
    TrendingUp,
    TrendingDown,
    Target,
    Check,
    AlertCircle,
    Lightbulb,
    ArrowRight
} from 'lucide-react'

interface MetricComparison {
    metric: string
    predicted: number | null
    actual: number | null
    accuracyScore: number
}

interface ClosureInsight {
    accuracyRating: 'excellent' | 'good' | 'fair' | 'poor'
    summary: string
    learnings: string[]
    improvements: string[]
}

interface OutcomeComparisonProps {
    featureName: string
    predictionDate: Date
    outcomeDate: Date
    comparisons: MetricComparison[]
    overallAccuracy: number
    insight: ClosureInsight
    outcomeClassification?: 'success' | 'partial_success' | 'no_impact' | 'negative_impact'
}

const ACCURACY_COLORS = {
    excellent: 'text-green-400 bg-green-500/10 border-green-500/20',
    good: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    fair: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    poor: 'text-red-400 bg-red-500/10 border-red-500/20'
}

const OUTCOME_BADGES = {
    success: { color: 'bg-green-600 text-white', label: 'Success' },
    partial_success: { color: 'bg-blue-600 text-white', label: 'Partial Success' },
    no_impact: { color: 'bg-yellow-600 text-black', label: 'No Impact' },
    negative_impact: { color: 'bg-red-600 text-white', label: 'Negative Impact' }
}

const METRIC_LABELS: Record<string, string> = {
    adoption: 'Adoption Rate',
    sentiment: 'Sentiment Impact',
    churn: 'Churn Reduction'
}

export function OutcomeComparisonCard({
    featureName,
    predictionDate,
    outcomeDate,
    comparisons,
    overallAccuracy,
    insight,
    outcomeClassification
}: OutcomeComparisonProps) {
    const daysBetween = Math.round(
        (outcomeDate.getTime() - predictionDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    const formatValue = (value: number | null, metric: string): string => {
        if (value === null) return 'N/A'
        if (metric === 'sentiment') {
            return `${value > 0 ? '+' : ''}${(value * 100).toFixed(0)}%`
        }
        return `${(value * 100).toFixed(0)}%`
    }

    return (
        <Card className="border-slate-700 bg-slate-900">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-400" />
                        Prediction vs Outcome
                    </CardTitle>
                    {outcomeClassification && (
                        <Badge className={OUTCOME_BADGES[outcomeClassification].color}>
                            {OUTCOME_BADGES[outcomeClassification].label}
                        </Badge>
                    )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                    {featureName} • Loop closed after {daysBetween} days
                </p>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Overall Accuracy Banner */}
                <div className={`p-4 rounded-lg border ${ACCURACY_COLORS[insight.accuracyRating]}`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Prediction Accuracy</span>
                        <Badge variant="outline" className="border-current">
                            {insight.accuracyRating.charAt(0).toUpperCase() + insight.accuracyRating.slice(1)}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl font-bold">{Math.round(overallAccuracy * 100)}%</span>
                        <Progress value={overallAccuracy * 100} className="flex-1 h-2" />
                    </div>
                    <p className="text-sm mt-2 opacity-80">{insight.summary}</p>
                </div>

                {/* Metric Comparisons */}
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-slate-400">Metric Breakdown</h4>

                    {comparisons.map((comp, i) => (
                        <div key={i} className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-white">
                                    {METRIC_LABELS[comp.metric] || comp.metric}
                                </span>
                                <div className="flex items-center gap-1">
                                    {comp.accuracyScore >= 0.7 ? (
                                        <Check className="w-4 h-4 text-green-400" />
                                    ) : comp.accuracyScore >= 0.4 ? (
                                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 text-red-400" />
                                    )}
                                    <span className={`text-xs ${comp.accuracyScore >= 0.7 ? 'text-green-400' :
                                            comp.accuracyScore >= 0.4 ? 'text-yellow-400' : 'text-red-400'
                                        }`}>
                                        {Math.round(comp.accuracyScore * 100)}% accurate
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex-1">
                                    <p className="text-xs text-slate-400 mb-1">Predicted</p>
                                    <p className="font-mono text-slate-200">{formatValue(comp.predicted, comp.metric)}</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-500" />
                                <div className="flex-1">
                                    <p className="text-xs text-slate-400 mb-1">Actual</p>
                                    <p className="font-mono text-white">{formatValue(comp.actual, comp.metric)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Learnings */}
                {insight.learnings.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4" />
                            Key Learnings
                        </h4>
                        <ul className="space-y-1">
                            {insight.learnings.map((learning, i) => (
                                <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                    <span className="text-green-400 mt-0.5">•</span>
                                    {learning}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Improvements */}
                {insight.improvements.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Future Improvements
                        </h4>
                        <ul className="space-y-1">
                            {insight.improvements.map((improvement, i) => (
                                <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                    <span className="text-blue-400 mt-0.5">→</span>
                                    {improvement}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

/**
 * Compact widget for dashboard
 */
export function LoopClosureStats({
    closedLoops,
    totalPredictions,
    averageAccuracy
}: {
    closedLoops: number
    totalPredictions: number
    averageAccuracy: number
}) {
    const closureRate = totalPredictions > 0 ? closedLoops / totalPredictions : 0

    return (
        <Card className="border-slate-700 bg-slate-900">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Prediction Performance
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                        <p className="text-2xl font-bold text-white">{closedLoops}</p>
                        <p className="text-xs text-slate-400">Loops Closed</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-white">
                            {Math.round(closureRate * 100)}%
                        </p>
                        <p className="text-xs text-slate-400">Closure Rate</p>
                    </div>
                    <div>
                        <p className={`text-2xl font-bold ${averageAccuracy >= 0.7 ? 'text-green-400' :
                                averageAccuracy >= 0.5 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                            {Math.round(averageAccuracy * 100)}%
                        </p>
                        <p className="text-xs text-slate-400">Avg Accuracy</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
