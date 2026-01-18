/**
 * AI Experiment Watchdog Component
 * Monitors running experiments and provides real-time health status and recommendations
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    AlertTriangle,
    CheckCircle,
    Shield,
    TrendingUp,
    TrendingDown,
    Clock,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Sparkles,
    XCircle,
    Target,
    Zap,
} from 'lucide-react';

interface WatchdogResult {
    experimentId: string;
    status: 'healthy' | 'warning' | 'critical';
    anomalies: Anomaly[];
    recommendations: Recommendation[];
    projections: Projection;
    healthScore: number;
}

interface Anomaly {
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    detectedAt: string;
}

interface Recommendation {
    action: string;
    confidence: number;
    reasoning: string;
    priority: 'low' | 'medium' | 'high';
}

interface Projection {
    daysToSignificance: number | null;
    projectedWinner: 'control' | 'treatment' | 'inconclusive' | null;
    projectedLift: number | null;
    confidenceToReach95: number;
}

interface AIExperimentWatchdogProps {
    experimentId: string;
    experimentStatus: string;
}

export function AIExperimentWatchdog({ experimentId, experimentStatus }: AIExperimentWatchdogProps) {
    const [data, setData] = useState<WatchdogResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    const fetchWatchdogData = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/experiments/ai-watchdog?experimentId=${experimentId}`);
            if (response.ok) {
                const result = await response.json();
                setData(result);
                setLastRefresh(new Date());
            }
        } catch (error) {
            console.error('[AIWatchdog] Error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (experimentStatus === 'running') {
            fetchWatchdogData();
            // Auto-refresh every 5 minutes for running experiments
            const interval = setInterval(fetchWatchdogData, 5 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [experimentId, experimentStatus]);

    if (experimentStatus !== 'running' && experimentStatus !== 'paused') {
        return null;
    }

    const statusConfig = {
        healthy: {
            icon: CheckCircle,
            color: 'text-green-600',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
            borderColor: 'border-green-200 dark:border-green-800',
            label: 'Healthy',
        },
        warning: {
            icon: AlertTriangle,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
            borderColor: 'border-yellow-200 dark:border-yellow-800',
            label: 'Needs Attention',
        },
        critical: {
            icon: XCircle,
            color: 'text-red-600',
            bgColor: 'bg-red-50 dark:bg-red-900/20',
            borderColor: 'border-red-200 dark:border-red-800',
            label: 'Critical Issues',
        },
    };

    const priorityColors = {
        low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };

    const config = data ? statusConfig[data.status] : statusConfig.healthy;
    const StatusIcon = config.icon;

    return (
        <Card className={`overflow-hidden border-2 ${config.borderColor}`}>
            {/* Header */}
            <div
                className={`p-4 ${config.bgColor} cursor-pointer flex items-center justify-between`}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                        <span className="font-semibold text-gray-900 dark:text-white">AI Watchdog</span>
                    </div>
                    {!loading && data && (
                        <>
                            <StatusIcon className={`h-5 w-5 ${config.color}`} />
                            <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                            <Badge variant="outline" className="ml-2">
                                Health: {data.healthScore}%
                            </Badge>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            fetchWatchdogData();
                        }}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    {expanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                </div>
            </div>

            {/* Content */}
            {expanded && (
                <div className="p-4 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-2" />
                            <span className="text-gray-500">Analyzing experiment...</span>
                        </div>
                    ) : data ? (
                        <>
                            {/* Projections */}
                            {data.projections.projectedWinner && (
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div className="flex items-center justify-center mb-1">
                                            {data.projections.projectedWinner === 'treatment' ? (
                                                <TrendingUp className="h-5 w-5 text-green-500" />
                                            ) : data.projections.projectedWinner === 'control' ? (
                                                <TrendingDown className="h-5 w-5 text-red-500" />
                                            ) : (
                                                <Target className="h-5 w-5 text-gray-500" />
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Projected Winner</p>
                                        <p className="font-semibold text-gray-900 dark:text-white capitalize">
                                            {data.projections.projectedWinner}
                                        </p>
                                    </div>

                                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div className="flex items-center justify-center mb-1">
                                            <Zap className="h-5 w-5 text-purple-500" />
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Projected Lift</p>
                                        <p className={`font-semibold ${data.projections.projectedLift && data.projections.projectedLift > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {data.projections.projectedLift ? `${data.projections.projectedLift > 0 ? '+' : ''}${data.projections.projectedLift.toFixed(1)}%` : 'N/A'}
                                        </p>
                                    </div>

                                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div className="flex items-center justify-center mb-1">
                                            <Clock className="h-5 w-5 text-blue-500" />
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Days to 95%</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {data.projections.daysToSignificance !== null ? `~${data.projections.daysToSignificance}` : 'Calculating...'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Confidence Progress */}
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-600 dark:text-gray-400">Confidence Progress</span>
                                    <span className="font-medium">{data.projections.confidenceToReach95.toFixed(1)}%</span>
                                </div>
                                <Progress value={data.projections.confidenceToReach95} className="h-2" />
                            </div>

                            {/* Anomalies */}
                            {data.anomalies.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                        Detected Anomalies
                                    </h4>
                                    <div className="space-y-2">
                                        {data.anomalies.map((anomaly, i) => (
                                            <div
                                                key={i}
                                                className={`p-3 rounded-lg border ${anomaly.severity === 'high'
                                                        ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                                                        : anomaly.severity === 'medium'
                                                            ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                                                            : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-2">
                                                    <Badge variant="outline" className={priorityColors[anomaly.severity]}>
                                                        {anomaly.severity}
                                                    </Badge>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">{anomaly.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recommendations */}
                            {data.recommendations.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-purple-500" />
                                        AI Recommendations
                                    </h4>
                                    <div className="space-y-2">
                                        {data.recommendations.map((rec, i) => (
                                            <div
                                                key={i}
                                                className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg"
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <Badge className={priorityColors[rec.priority]}>{rec.action.replace(/_/g, ' ')}</Badge>
                                                    <span className="text-xs text-gray-500">{(rec.confidence * 100).toFixed(0)}% confidence</span>
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300">{rec.reasoning}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Last Updated */}
                            {lastRefresh && (
                                <p className="text-xs text-gray-400 text-right">
                                    Last updated: {lastRefresh.toLocaleTimeString()}
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="text-center text-gray-500 py-4">Unable to load watchdog data</p>
                    )}
                </div>
            )}
        </Card>
    );
}
