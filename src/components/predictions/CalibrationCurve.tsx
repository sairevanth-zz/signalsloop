'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Target,
    AlertTriangle,
    CheckCircle2,
    TrendingUp,
    TrendingDown,
    Minus,
    Info
} from 'lucide-react'
import type { CalibrationCurveData, CalibrationBucket } from '@/types/confidence-calibration'

interface CalibrationCurveProps {
    data: CalibrationCurveData
}

const QUALITY_STYLES = {
    excellent: 'bg-green-500/20 text-green-400 border-green-500/30',
    good: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    fair: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    poor: 'bg-red-500/20 text-red-400 border-red-500/30'
}

export function CalibrationCurve({ data }: CalibrationCurveProps) {
    const maxPredictions = Math.max(...data.buckets.map(b => b.predictionCount), 1)

    return (
        <Card className="border-slate-700 bg-slate-900">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-purple-400" />
                        Confidence Calibration
                    </CardTitle>
                    <Badge
                        variant="outline"
                        className={`border ${QUALITY_STYLES[data.calibrationQuality]}`}
                    >
                        {data.calibrationQuality.charAt(0).toUpperCase() + data.calibrationQuality.slice(1)}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Calibration Chart */}
                <div className="relative h-[200px] bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                    {/* Perfect calibration line */}
                    <div
                        className="absolute inset-4 border-l border-b border-slate-600"
                        style={{
                            background: 'linear-gradient(135deg, transparent 49.5%, rgba(100,100,100,0.3) 49.5%, rgba(100,100,100,0.3) 50.5%, transparent 50.5%)'
                        }}
                    />

                    {/* Bucket bars */}
                    <div className="relative h-full flex items-end justify-around gap-1 z-10">
                        {data.buckets.map((bucket, i) => (
                            <div
                                key={i}
                                className="flex flex-col items-center gap-1 flex-1"
                                title={`${bucket.confidenceLabel}\nPredictions: ${bucket.predictionCount}\nAvg Confidence: ${(bucket.avgConfidence * 100).toFixed(0)}%\nActual Accuracy: ${(bucket.actualAccuracy * 100).toFixed(0)}%`}
                            >
                                {/* Accuracy bar */}
                                <div
                                    className={`w-full rounded-t transition-all ${bucket.predictionCount === 0 ? 'bg-slate-700' :
                                            bucket.calibrationError < 0.1 ? 'bg-green-500' :
                                                bucket.calibrationError < 0.2 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                    style={{
                                        height: bucket.predictionCount > 0
                                            ? `${Math.max(10, bucket.actualAccuracy * 150)}px`
                                            : '4px'
                                    }}
                                />
                                <span className="text-[9px] text-slate-400">
                                    {bucket.confidenceLabel.split('-')[0]}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Legend */}
                    <div className="absolute top-2 right-2 text-xs text-slate-400 flex items-center gap-2">
                        <div className="w-2 h-2 bg-slate-500 rounded-full" /> Perfect Line
                    </div>
                </div>

                {/* ECE Explanation */}
                <div className="p-4 bg-slate-800 rounded-lg">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm text-slate-300 mb-2">
                                <strong>Expected Calibration Error (ECE):</strong> {(data.expectedCalibrationError * 100).toFixed(1)}%
                            </p>
                            <p className="text-xs text-slate-400">
                                A lower ECE means predictions are better calibrated. For example, 70% confidence predictions
                                should be correct ~70% of the time.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-800 rounded-lg text-center">
                        <p className="text-2xl font-bold text-white">
                            {(data.expectedCalibrationError * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-400">ECE</p>
                    </div>
                    <div className="p-3 bg-slate-800 rounded-lg text-center">
                        <p className={`text-2xl font-bold ${data.overconfidenceRatio > 0.5 ? 'text-orange-400' : 'text-slate-300'}`}>
                            {(data.overconfidenceRatio * 100).toFixed(0)}%
                        </p>
                        <p className="text-xs text-slate-400">Overconfident</p>
                    </div>
                    <div className="p-3 bg-slate-800 rounded-lg text-center">
                        <p className={`text-2xl font-bold ${data.underconfidenceRatio > 0.5 ? 'text-blue-400' : 'text-slate-300'}`}>
                            {(data.underconfidenceRatio * 100).toFixed(0)}%
                        </p>
                        <p className="text-xs text-slate-400">Underconfident</p>
                    </div>
                </div>

                {/* Recommendations */}
                {data.recommendations.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-slate-400">Recommendations</h4>
                        {data.recommendations.map((rec, i) => (
                            <div
                                key={i}
                                className="flex items-start gap-2 p-2 bg-slate-800 rounded text-sm"
                            >
                                {rec.includes('Excellent') ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                                ) : (
                                    <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                                )}
                                <span className="text-slate-300">{rec}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Sample Size Note */}
                <p className="text-xs text-slate-500 text-center">
                    Based on {data.predictionsWithOutcomes} of {data.totalPredictions} predictions with verified outcomes
                </p>
            </CardContent>
        </Card>
    )
}

/**
 * Compact widget for dashboard
 */
export function CalibrationWidget({
    ece,
    quality,
    predictionsCount
}: {
    ece: number
    quality: 'excellent' | 'good' | 'fair' | 'poor'
    predictionsCount: number
}) {
    return (
        <Card className="border-slate-700 bg-slate-900">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Calibration
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                    <p className={`text-3xl font-bold ${quality === 'excellent' ? 'text-green-400' :
                            quality === 'good' ? 'text-blue-400' :
                                quality === 'fair' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                        {(ece * 100).toFixed(1)}%
                    </p>
                    <Badge
                        variant="outline"
                        className={`border ${QUALITY_STYLES[quality]}`}
                    >
                        {quality.charAt(0).toUpperCase() + quality.slice(1)}
                    </Badge>
                </div>

                <div className="text-xs text-slate-400">
                    ECE from {predictionsCount} verified predictions
                </div>
            </CardContent>
        </Card>
    )
}
