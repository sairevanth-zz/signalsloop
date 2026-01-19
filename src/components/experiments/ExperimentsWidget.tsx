/**
 * ExperimentsWidget Component
 * Shows active experiments status on Mission Control dashboard
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    FlaskConical,
    TrendingUp,
    Trophy,
    Clock,
    ArrowRight,
    AlertCircle,
    Play,
    CheckCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ActiveExperiment {
    id: string;
    name: string;
    status: string;
    lift?: number;
    confidence?: number;
    daysRunning?: number;
    isSignificant?: boolean;
}

interface ExperimentsWidgetProps {
    projectId: string;
    projectSlug: string;
}

export function ExperimentsWidget({ projectId, projectSlug }: ExperimentsWidgetProps) {
    const router = useRouter();
    const [experiments, setExperiments] = useState<ActiveExperiment[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ running: 0, awaitingDecision: 0, thisWeek: 0 });

    useEffect(() => {
        const fetchExperiments = async () => {
            try {
                const response = await fetch(`/api/experiments?projectId=${projectId}&status=running`);
                if (response.ok) {
                    const data = await response.json();

                    // Transform experiments data
                    const activeExps = (data.experiments || []).map((e: { experiment: ActiveExperiment } & { significant_results?: number }) => ({
                        ...e.experiment,
                        isSignificant: e.significant_results > 0,
                    }));

                    setExperiments(activeExps.slice(0, 3)); // Show top 3

                    setStats({
                        running: activeExps.filter((e: ActiveExperiment) => e.status === 'running').length,
                        awaitingDecision: activeExps.filter((e: ActiveExperiment) => e.isSignificant).length,
                        thisWeek: activeExps.length, // Simplified
                    });
                }
            } catch (error) {
                console.error('Error fetching experiments:', error);
            } finally {
                setLoading(false);
            }
        };

        if (projectId) {
            fetchExperiments();
        }
    }, [projectId]);

    if (loading) {
        return (
            <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <FlaskConical className="h-5 w-5 text-purple-500" />
                    <h3 className="font-semibold">Active Experiments</h3>
                </div>
                <div className="animate-pulse space-y-3">
                    <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                        <FlaskConical className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="font-semibold">Active Experiments</h3>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/${projectSlug}/experiments`)}
                >
                    View All
                    <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
            </div>

            {/* Alert for significant results */}
            {stats.awaitingDecision > 0 && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-800 dark:text-green-200">
                            {stats.awaitingDecision} experiment{stats.awaitingDecision > 1 ? 's' : ''} reached significance!
                        </span>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Review results and decide whether to ship.
                    </p>
                </div>
            )}

            {/* Experiments List */}
            {experiments.length > 0 ? (
                <div className="space-y-3">
                    {experiments.map((exp) => (
                        <div
                            key={exp.id}
                            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            onClick={() => router.push(`/${projectSlug}/experiments/${exp.id}`)}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm truncate max-w-[180px]">
                                    {exp.name}
                                </span>
                                {exp.isSignificant ? (
                                    <Badge className="bg-green-500 text-white">
                                        <Trophy className="h-3 w-3 mr-1" />
                                        Winner
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-xs">
                                        <Play className="h-3 w-3 mr-1" />
                                        Running
                                    </Badge>
                                )}
                            </div>
                            {exp.lift !== undefined && (
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span className={`flex items-center gap-1 ${exp.lift >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        <TrendingUp className="h-3 w-3" />
                                        {exp.lift >= 0 ? '+' : ''}{exp.lift.toFixed(1)}% lift
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" />
                                        {exp.confidence?.toFixed(0)}% conf
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-6">
                    <FlaskConical className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No active experiments</p>
                    <Button
                        variant="link"
                        size="sm"
                        onClick={() => router.push(`/${projectSlug}/experiments/new`)}
                    >
                        Create one →
                    </Button>
                </div>
            )}

            {/* Stats Footer */}
            <div className="mt-4 pt-4 border-t flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <Play className="h-3 w-3" />
                    Running: {stats.running}
                </span>
                <span className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Awaiting Decision: {stats.awaitingDecision}
                </span>
            </div>
        </Card>
    );
}
