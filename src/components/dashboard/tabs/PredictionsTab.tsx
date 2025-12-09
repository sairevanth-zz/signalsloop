/**
 * PredictionsTab - Predictions tab content for Dashboard
 * 
 * Contains: Accuracy Dashboard, Calibration Curve, Loop Closure Stats
 */

'use client';

import React, { useEffect, useState } from 'react';
import { AccuracyWidget } from '@/components/predictions/AccuracyDashboard';
import { CalibrationWidget } from '@/components/predictions/CalibrationCurve';
import { LoopClosureStats } from '@/components/predictions/OutcomeComparisonCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Activity, TrendingUp, Loader2 } from 'lucide-react';

interface PredictionsTabProps {
    projectId: string;
    projectSlug: string;
}

interface PredictionStats {
    accuracy: number;
    loopsClosed: number;
    totalPredictions: number;
    ece: number;
    calibrationQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export default function PredictionsTab({ projectId, projectSlug }: PredictionsTabProps) {
    const [stats, setStats] = useState<PredictionStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const [accuracyRes, calibrationRes] = await Promise.all([
                    fetch(`/api/predictions/accuracy?projectId=${projectId}`),
                    fetch(`/api/predictions/calibration?projectId=${projectId}`)
                ]);

                const accuracyData = await accuracyRes.json();
                const calibrationData = await calibrationRes.json();

                setStats({
                    accuracy: accuracyData.stats?.overallAccuracy || 0,
                    loopsClosed: accuracyData.stats?.predictionsWithOutcomes || 0,
                    totalPredictions: accuracyData.stats?.totalPredictions || 0,
                    ece: calibrationData.curve?.expectedCalibrationError || 0,
                    calibrationQuality: calibrationData.curve?.calibrationQuality || 'fair'
                });
            } catch (error) {
                console.error('Error fetching prediction stats:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, [projectId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Accuracy Widget */}
                <AccuracyWidget
                    accuracy={stats?.accuracy || 0}
                    loopsClosed={stats?.loopsClosed || 0}
                    totalPredictions={stats?.totalPredictions || 0}
                />

                {/* Calibration Widget */}
                <CalibrationWidget
                    ece={stats?.ece || 0}
                    quality={stats?.calibrationQuality || 'fair'}
                    predictionsCount={stats?.loopsClosed || 0}
                />

                {/* Loop Closure Stats */}
                <LoopClosureStats
                    closedLoops={stats?.loopsClosed || 0}
                    totalPredictions={stats?.totalPredictions || 0}
                    averageAccuracy={stats?.accuracy || 0}
                />
            </div>

            {/* Info Card */}
            <Card className="border-slate-800 bg-slate-900/50">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-400" />
                        About Feature Predictions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-300">
                        <div>
                            <h4 className="font-medium text-white mb-2">How Predictions Work</h4>
                            <p className="text-slate-400">
                                SignalsLoop analyzes historical feature outcomes, user feedback patterns,
                                and similar features to predict adoption rates, sentiment impact, and
                                churn reduction for new features.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium text-white mb-2">Improving Accuracy</h4>
                            <p className="text-slate-400">
                                Prediction accuracy improves as more features ship and outcomes are
                                tracked. The system learns from each closed loop to refine future
                                predictions for your specific product.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a
                    href={`/${projectSlug}/outcomes`}
                    className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 transition-colors"
                >
                    <div className="p-2 rounded-lg bg-green-500/10">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <p className="font-medium text-white">View Feature Outcomes</p>
                        <p className="text-xs text-slate-400">See how predictions compared to actual results</p>
                    </div>
                </a>
                <a
                    href={`/app/predictions?projectId=${projectId}`}
                    className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 transition-colors"
                >
                    <div className="p-2 rounded-lg bg-blue-500/10">
                        <Target className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <p className="font-medium text-white">Full Accuracy Dashboard</p>
                        <p className="text-xs text-slate-400">Detailed breakdown by strategy and confidence</p>
                    </div>
                </a>
            </div>
        </div>
    );
}
