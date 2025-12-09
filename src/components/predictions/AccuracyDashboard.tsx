'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
    Target,
    TrendingUp,
    TrendingDown,
    BarChart3,
    Minus,
    CheckCircle2,
    XCircle,
    Activity
} from 'lucide-react'
import type { AccuracyStats, AccuracyTrend, PredictionAccuracyRecord } from '@/types/prediction-accuracy'

interface AccuracyDashboardProps {
    stats: AccuracyStats
    trends: AccuracyTrend[]
    recentPredictions: PredictionAccuracyRecord[]
}

const ACCURACY_COLORS = {
    excellent: 'text-green-400',
    good: 'text-blue-400',
    fair: 'text-yellow-400',
    poor: 'text-red-400'
}

function getAccuracyLevel(accuracy: number): keyof typeof ACCURACY_COLORS {
    if (accuracy >= 0.8) return 'excellent'
    if (accuracy >= 0.6) return 'good'
    if (accuracy >= 0.4) return 'fair'
    return 'poor'
}

const TrendIcon = ({ trend }: { trend: 'improving' | 'declining' | 'stable' }) => {
    if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-green-400" />
    if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-red-400" />
    return <Minus className="w-4 h-4 text-slate-400" />
}

export function AccuracyDashboard({
    stats,
    trends,
    recentPredictions
}: AccuracyDashboardProps) {
    const overallLevel = getAccuracyLevel(stats.overallAccuracy)

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="border-slate-700 bg-slate-900">
                    <CardContent className="pt-4">
                        <p className="text-sm text-slate-400 mb-1">Overall Accuracy</p>
                        <p className={`text-3xl font-bold ${ACCURACY_COLORS[overallLevel]}`}>
                            {Math.round(stats.overallAccuracy * 100)}%
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            {stats.predictionsWithOutcomes} of {stats.totalPredictions} verified
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-slate-700 bg-slate-900">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-sm text-slate-400">Adoption</p>
                            <TrendIcon trend={stats.adoptionAccuracy.trend} />
                        </div>
                        <p className="text-2xl font-bold text-white">
                            {Math.round(stats.adoptionAccuracy.avgAccuracy * 100)}%
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            {stats.adoptionAccuracy.count} predictions
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-slate-700 bg-slate-900">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-sm text-slate-400">Sentiment</p>
                            <TrendIcon trend={stats.sentimentAccuracy.trend} />
                        </div>
                        <p className="text-2xl font-bold text-white">
                            {Math.round(stats.sentimentAccuracy.avgAccuracy * 100)}%
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            {stats.sentimentAccuracy.count} predictions
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-slate-700 bg-slate-900">
                    <CardContent className="pt-4">
                        <p className="text-sm text-slate-400 mb-1">Loops Closed</p>
                        <p className="text-2xl font-bold text-white">
                            {stats.predictionsWithOutcomes}
                        </p>
                        <Progress
                            value={(stats.predictionsWithOutcomes / (stats.totalPredictions || 1)) * 100}
                            className="h-1.5 mt-2 bg-slate-700"
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Strategy Breakdown */}
            <Card className="border-slate-700 bg-slate-900">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-400" />
                        Accuracy by Strategy
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                        {(['heuristic', 'similar_features', 'ml_model'] as const).map(strategy => {
                            const data = stats.byStrategy[strategy]
                            const label = strategy === 'heuristic' ? 'Rule-Based' :
                                strategy === 'similar_features' ? 'Similar Features' : 'ML Model'
                            return (
                                <div key={strategy} className="p-4 bg-slate-800 rounded-lg">
                                    <p className="text-sm text-slate-400 mb-2">{label}</p>
                                    <p className={`text-2xl font-bold ${ACCURACY_COLORS[getAccuracyLevel(data.avgAccuracy)]}`}>
                                        {data.count > 0 ? `${Math.round(data.avgAccuracy * 100)}%` : 'N/A'}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">{data.count} predictions</p>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Recent Predictions */}
            <Card className="border-slate-700 bg-slate-900">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-400" />
                        Recent Predictions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {recentPredictions.slice(0, 6).map(pred => (
                            <div
                                key={pred.id}
                                className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700"
                            >
                                <div className="flex items-center gap-3">
                                    {pred.loopClosed ? (
                                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-slate-500" />
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-white">{pred.featureName}</p>
                                        <p className="text-xs text-slate-400">
                                            {new Date(pred.predictionDate).toLocaleDateString()} •
                                            {pred.predictionStrategy === 'heuristic' ? ' Rule-Based' :
                                                pred.predictionStrategy === 'similar_features' ? ' Similar Features' : ' ML'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {pred.loopClosed ? (
                                        <>
                                            <p className={`text-lg font-bold ${ACCURACY_COLORS[getAccuracyLevel(pred.overallAccuracy)]}`}>
                                                {Math.round(pred.overallAccuracy * 100)}%
                                            </p>
                                            <p className="text-xs text-slate-400">accuracy</p>
                                        </>
                                    ) : (
                                        <Badge variant="outline" className="border-slate-600 text-slate-400">
                                            Pending
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

/**
 * Compact widget for Mission Control
 */
export function AccuracyWidget({
    accuracy,
    loopsClosed,
    totalPredictions
}: {
    accuracy: number
    loopsClosed: number
    totalPredictions: number
}) {
    const level = getAccuracyLevel(accuracy)

    return (
        <Card className="border-slate-700 bg-slate-900">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Prediction Accuracy
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                    <p className={`text-3xl font-bold ${ACCURACY_COLORS[level]}`}>
                        {Math.round(accuracy * 100)}%
                    </p>
                    <Badge
                        variant="outline"
                        className={`border-current ${ACCURACY_COLORS[level]}`}
                    >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Badge>
                </div>

                <div className="text-sm">
                    <span className="text-slate-400">Verified: </span>
                    <span className="text-white font-medium">
                        {loopsClosed} of {totalPredictions}
                    </span>
                </div>
            </CardContent>
        </Card>
    )
}
