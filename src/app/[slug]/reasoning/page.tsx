'use client';

/**
 * Project-Scoped AI Reasoning Page
 * 
 * View all AI reasoning traces for the current project within the dashboard context.
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Brain,
    Filter,
    Search,
    Clock,
    Zap,
    AlertCircle,
    CheckCircle,
    ChevronRight,
    Sparkles,
    BarChart3,
    TrendingUp,
    Loader2,
    RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { getSupabaseClient } from '@/lib/supabase-client';
import { ReasoningDrawer } from '@/components/reasoning/ReasoningDrawer';
import { ReasoningTrace, ReasoningFeature } from '@/types/reasoning';
import { toast } from 'sonner';

const FEATURE_LABELS: Record<ReasoningFeature, string> = {
    devils_advocate: "Devil's Advocate",
    prediction: 'Feature Prediction',
    prioritization: 'Priority Scoring',
    classification: 'Classification',
    sentiment_analysis: 'Sentiment Analysis',
    theme_detection: 'Theme Detection',
    spec_writer: 'Spec Writer',
    roadmap_suggestion: 'Roadmap Suggestion',
    competitive_intel: 'Competitive Intel',
    anomaly_detection: 'Anomaly Detection',
    churn_prediction: 'Churn Prediction',
    impact_simulation: 'Impact Simulation',
    stakeholder_response: 'Stakeholder Response',
};

const FEATURE_COLORS: Record<ReasoningFeature, string> = {
    devils_advocate: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    prediction: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    prioritization: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    classification: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    sentiment_analysis: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    theme_detection: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    spec_writer: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    roadmap_suggestion: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    competitive_intel: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    anomaly_detection: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    churn_prediction: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    impact_simulation: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    stakeholder_response: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};

export default function ProjectReasoningPage() {
    const params = useParams();
    const projectSlug = params?.slug as string;

    const [projectId, setProjectId] = useState<string>('');
    const [projectName, setProjectName] = useState<string>('');
    const [loadingProject, setLoadingProject] = useState(true);
    const [traces, setTraces] = useState<ReasoningTrace[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFeature, setSelectedFeature] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTrace, setSelectedTrace] = useState<ReasoningTrace | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [backfilling, setBackfilling] = useState(false);

    useEffect(() => {
        if (projectSlug) {
            loadProject();
        }
    }, [projectSlug]);

    useEffect(() => {
        if (projectId) {
            fetchTraces();
        }
    }, [projectId, selectedFeature]);

    async function loadProject() {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('projects')
                .select('id, name')
                .eq('slug', projectSlug)
                .single();

            if (data) {
                setProjectId(data.id);
                setProjectName(data.name);
            }
        } catch (error) {
            console.error('Failed to load project:', error);
        } finally {
            setLoadingProject(false);
        }
    }

    async function fetchTraces() {
        if (!projectId) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({ projectId });
            if (selectedFeature !== 'all') {
                params.append('feature', selectedFeature);
            }

            const response = await fetch(`/api/reasoning?${params}`);
            const data = await response.json();
            setTraces(data.traces || []);
        } catch (error) {
            console.error('Failed to fetch traces:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredTraces = traces.filter((trace) => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                trace.decision_summary.toLowerCase().includes(query) ||
                trace.decision_type.toLowerCase().includes(query) ||
                trace.feature.toLowerCase().includes(query)
            );
        }
        return true;
    });

    // Calculate stats
    const stats = {
        total: traces.length,
        avgConfidence: traces.length > 0
            ? traces.reduce((acc, t) => acc + (t.outputs.confidence || 0), 0) / traces.length
            : 0,
        avgLatency: traces.length > 0
            ? traces.reduce((acc, t) => acc + (t.metadata.latency_ms || 0), 0) / traces.length
            : 0,
        byFeature: traces.reduce((acc, t) => {
            acc[t.feature] = (acc[t.feature] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
    };

    function getConfidenceColor(confidence: number): string {
        if (confidence >= 0.8) return 'text-green-500';
        if (confidence >= 0.6) return 'text-yellow-500';
        return 'text-red-500';
    }

    async function handleBackfill() {
        if (!projectId) return;

        setBackfilling(true);
        try {
            const response = await fetch('/api/reasoning/backfill', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success(`Imported ${data.total} historical AI decisions`);
                fetchTraces(); // Refresh the list
            } else {
                toast.error(data.error || 'Backfill failed');
            }
        } catch (error) {
            console.error('Backfill error:', error);
            toast.error('Failed to import historical data');
        } finally {
            setBackfilling(false);
        }
    }

    function openTraceDetails(trace: ReasoningTrace) {
        setSelectedTrace(trace);
        setDrawerOpen(true);
    }

    if (loadingProject) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                        <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            AI Reasoning Layer
                        </h1>
                        <p className="text-muted-foreground">
                            Transparent AI decision-making - see why AI made each recommendation
                            {projectName && <span className="ml-2">• Project: {projectName}</span>}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-purple-200 dark:border-purple-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.total}</p>
                                <p className="text-sm text-muted-foreground">Total Decisions</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-green-200 dark:border-green-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{(stats.avgConfidence * 100).toFixed(0)}%</p>
                                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.avgLatency.toFixed(0)}ms</p>
                                <p className="text-sm text-muted-foreground">Avg Latency</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-orange-200 dark:border-orange-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{Object.keys(stats.byFeature).length}</p>
                                <p className="text-sm text-muted-foreground">AI Features</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search decisions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={selectedFeature} onValueChange={setSelectedFeature}>
                    <SelectTrigger className="w-[200px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Filter by feature" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Features</SelectItem>
                        {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Traces List */}
            <Card>
                <CardHeader>
                    <CardTitle>AI Decision History</CardTitle>
                    <CardDescription>
                        Click on any decision to see the full reasoning process
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-24 w-full" />
                            ))}
                        </div>
                    ) : filteredTraces.length === 0 ? (
                        <div className="text-center py-12">
                            <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="font-medium">No AI Decisions Yet</h3>
                            <p className="text-sm text-muted-foreground mt-2 mb-6">
                                AI reasoning will appear here as you use SignalsLoop's AI features.
                            </p>
                            <Button
                                onClick={handleBackfill}
                                disabled={backfilling}
                                variant="outline"
                                className="gap-2"
                            >
                                {backfilling ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-4 h-4" />
                                )}
                                {backfilling ? 'Importing...' : 'Import Historical Data'}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredTraces.map((trace, index) => (
                                <motion.div
                                    key={trace.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => openTraceDetails(trace)}
                                    className="p-4 rounded-xl border hover:border-purple-300 dark:hover:border-purple-700 cursor-pointer transition-all hover:shadow-md group"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge className={FEATURE_COLORS[trace.feature]}>
                                                    {FEATURE_LABELS[trace.feature]}
                                                </Badge>
                                                <Badge variant="outline" className="text-xs">
                                                    {trace.decision_type.replace(/_/g, ' ')}
                                                </Badge>
                                            </div>
                                            <p className="font-medium group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                                {trace.decision_summary}
                                            </p>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(trace.created_at).toLocaleString()}
                                                </span>
                                                <span className={`flex items-center gap-1 ${getConfidenceColor(trace.outputs.confidence)}`}>
                                                    {trace.outputs.confidence >= 0.8 ? (
                                                        <CheckCircle className="w-3 h-3" />
                                                    ) : (
                                                        <AlertCircle className="w-3 h-3" />
                                                    )}
                                                    {Math.round(trace.outputs.confidence * 100)}% confidence
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Zap className="w-3 h-3" />
                                                    {trace.reasoning_steps.length} steps
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-purple-500 transition-colors" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Reasoning Drawer */}
            {selectedTrace && (
                <ReasoningDrawer
                    isOpen={drawerOpen}
                    onClose={() => {
                        setDrawerOpen(false);
                        setSelectedTrace(null);
                    }}
                    entityType={selectedTrace.entity_type || selectedTrace.feature}
                    entityId={selectedTrace.entity_id || selectedTrace.id}
                    feature={selectedTrace.feature}
                />
            )}
        </div>
    );
}
