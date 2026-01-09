'use client';

/**
 * AI Tools Page
 * 
 * Provides a dedicated page for AI automation tools:
 * - Auto-prioritize feedback
 * - Smart Categorize
 * - Find Duplicates
 * - Analyze Sentiment
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-client';
import { toast } from 'sonner';
import GlobalBanner from '@/components/GlobalBanner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Target,
    Wand2,
    GitMerge,
    Sparkles,
    Loader2,
    Zap,
    CheckCircle,
    Play,
} from 'lucide-react';

export default function AIToolsPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const projectSlug = params?.slug as string;

    const [projectId, setProjectId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [autoPrioritizing, setAutoPrioritizing] = useState(false);
    const [autoCategorizing, setAutoCategorizing] = useState(false);
    const [findingDuplicates, setFindingDuplicates] = useState(false);
    const [analyzingSentiment, setAnalyzingSentiment] = useState(false);

    const supabase = getSupabaseClient();

    // Fetch project ID
    useEffect(() => {
        const fetchProject = async () => {
            if (!supabase || !projectSlug) return;
            try {
                const { data } = await supabase
                    .from('projects')
                    .select('id')
                    .eq('slug', projectSlug)
                    .single();
                if (data) setProjectId(data.id);
            } catch (error) {
                console.error('Error fetching project:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProject();
    }, [supabase, projectSlug]);

    // Track if action was already executed to prevent duplicate runs
    const actionExecutedRef = React.useRef<string | null>(null);

    // Auto-run action from URL param (only once)
    useEffect(() => {
        const action = searchParams?.get('action');
        if (action && projectId && actionExecutedRef.current !== action) {
            actionExecutedRef.current = action;
            switch (action) {
                case 'prioritize':
                    handleAutoPrioritize();
                    break;
                case 'categorize':
                    handleAutoCategorize();
                    break;
                case 'duplicates':
                    handleFindDuplicates();
                    break;
                case 'sentiment':
                    handleAnalyzeSentiment();
                    break;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    const handleAutoPrioritize = useCallback(async () => {
        if (!supabase) {
            toast.error('Database connection not available.');
            return;
        }
        try {
            setAutoPrioritizing(true);
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session?.access_token) {
                toast.error('Please sign in to use AI auto-prioritization.');
                return;
            }
            const response = await fetch(`/api/projects/${projectSlug}/auto-prioritize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${sessionData.session.access_token}`,
                },
                body: JSON.stringify({ limit: 10 }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload?.error || 'Failed to auto-prioritize');

            const { updatedCount = 0, remaining = 0 } = payload;
            if (updatedCount === 0) {
                toast.info('All posts already prioritized!');
            } else {
                toast.success(`AI prioritized ${updatedCount} posts${remaining > 0 ? `. ${remaining} more to go.` : `. All done!`}`);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to auto-prioritize');
        } finally {
            setAutoPrioritizing(false);
        }
    }, [supabase, projectSlug]);

    const handleAutoCategorize = useCallback(async () => {
        if (!supabase) {
            toast.error('Database connection not available.');
            return;
        }
        try {
            setAutoCategorizing(true);
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session?.access_token) {
                toast.error('Please sign in.');
                return;
            }
            const response = await fetch(`/api/projects/${projectSlug}/auto-categorize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${sessionData.session.access_token}`,
                },
                body: JSON.stringify({ limit: 25 }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload?.error || 'Failed to auto-categorize');

            const { updatedCount = 0 } = payload;
            if (updatedCount === 0) {
                toast.info('All posts already categorized!');
            } else {
                toast.success(`AI categorized ${updatedCount} posts!`);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to auto-categorize');
        } finally {
            setAutoCategorizing(false);
        }
    }, [supabase, projectSlug]);

    const handleFindDuplicates = useCallback(async () => {
        if (!supabase) {
            toast.error('Database connection not available.');
            return;
        }
        try {
            setFindingDuplicates(true);
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session?.access_token) {
                toast.error('Please sign in.');
                return;
            }
            const response = await fetch(`/api/projects/${projectSlug}/find-duplicates`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${sessionData.session.access_token}`,
                },
                body: JSON.stringify({ limit: 50, threshold: 0.75 }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload?.error || 'Failed to find duplicates');

            const { clustersFound = 0, duplicatesMarked = 0 } = payload;
            if (clustersFound === 0) {
                toast.info('No duplicates found!');
            } else {
                toast.success(`Found ${clustersFound} duplicate groups, merged ${duplicatesMarked} posts.`);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to find duplicates');
        } finally {
            setFindingDuplicates(false);
        }
    }, [supabase, projectSlug]);

    const handleAnalyzeSentiment = useCallback(async () => {
        if (!supabase || !projectId) {
            toast.error('Database connection not available.');
            return;
        }
        try {
            setAnalyzingSentiment(true);

            // First fetch posts that need sentiment analysis
            const { data: posts, error: fetchError } = await supabase
                .from('posts')
                .select('id')
                .eq('project_id', projectId)
                .limit(50);

            if (fetchError) {
                throw new Error('Failed to fetch posts: ' + fetchError.message);
            }

            if (!posts || posts.length === 0) {
                toast.info('No posts to analyze!');
                return;
            }

            const postIds = posts.map((p: { id: string }) => p.id);

            const response = await fetch('/api/analyze-sentiment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ postIds, projectId }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload?.error || 'Failed to analyze sentiment');

            const { processed = 0 } = payload;
            if (processed === 0) {
                toast.info('All posts already analyzed!');
            } else {
                toast.success(`AI analyzed sentiment for ${processed} posts!`);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to analyze sentiment');
        } finally {
            setAnalyzingSentiment(false);
        }
    }, [supabase, projectId]);

    const tools = [
        {
            id: 'prioritize',
            title: 'Auto-Prioritize',
            description: 'Generate AI-powered priority scores for your feedback posts based on urgency, impact, and user sentiment.',
            icon: Target,
            color: '#3b82f6',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/30',
            loading: autoPrioritizing,
            action: handleAutoPrioritize,
        },
        {
            id: 'categorize',
            title: 'Smart Categorize',
            description: 'Let AI automatically categorize feedback into Bug, Feature Request, Improvement, UI/UX, and more.',
            icon: Wand2,
            color: '#8b5cf6',
            bgColor: 'bg-purple-500/10',
            borderColor: 'border-purple-500/30',
            loading: autoCategorizing,
            action: handleAutoCategorize,
        },
        {
            id: 'duplicates',
            title: 'Find Duplicates',
            description: 'AI scans for duplicate feedback across your board and automatically merges them to reduce clutter.',
            icon: GitMerge,
            color: '#f97316',
            bgColor: 'bg-orange-500/10',
            borderColor: 'border-orange-500/30',
            loading: findingDuplicates,
            action: handleFindDuplicates,
        },
        {
            id: 'sentiment',
            title: 'Analyze Sentiment',
            description: 'AI analyzes the emotional tone of feedback to identify positive, negative, and neutral sentiments.',
            icon: Sparkles,
            color: '#ec4899',
            bgColor: 'bg-pink-500/10',
            borderColor: 'border-pink-500/30',
            loading: analyzingSentiment,
            action: handleAnalyzeSentiment,
        },
    ];

    const isAnyRunning = autoPrioritizing || autoCategorizing || findingDuplicates || analyzingSentiment;

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950">
            <GlobalBanner showBackButton backLabel="Back to Dashboard" />

            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">AI Tools</h1>
                        <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30">
                            Automation
                        </Badge>
                    </div>
                    <p className="text-slate-400">
                        Automate feedback processing with AI-powered tools. Click any tool to run it on your feedback.
                    </p>
                </div>

                {/* Tools Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {tools.map((tool) => {
                        const Icon = tool.icon;
                        return (
                            <Card
                                key={tool.id}
                                className={`${tool.bgColor} ${tool.borderColor} border-2 bg-slate-900/50 hover:bg-slate-900/70 transition-all`}
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="p-2 rounded-lg"
                                                style={{ backgroundColor: `${tool.color}20` }}
                                            >
                                                <Icon className="w-5 h-5" style={{ color: tool.color }} />
                                            </div>
                                            <CardTitle className="text-white">{tool.title}</CardTitle>
                                        </div>
                                        {tool.loading && (
                                            <Badge className="bg-slate-800 text-teal-400 border-teal-500/30">
                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                Running...
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-slate-400 mb-4">
                                        {tool.description}
                                    </CardDescription>
                                    <Button
                                        onClick={tool.action}
                                        disabled={isAnyRunning}
                                        className="w-full"
                                        style={{
                                            backgroundColor: tool.loading ? tool.color : `${tool.color}20`,
                                            color: tool.loading ? 'white' : tool.color,
                                            borderColor: tool.color,
                                        }}
                                        variant="outline"
                                    >
                                        {tool.loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-4 h-4 mr-2" />
                                                Run {tool.title}
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Run All Button */}
                <div className="mt-8 text-center">
                    <Button
                        size="lg"
                        disabled={isAnyRunning}
                        onClick={async () => {
                            await handleAutoPrioritize();
                            await handleAutoCategorize();
                            await handleFindDuplicates();
                            await handleAnalyzeSentiment();
                            toast.success('All AI tools completed!');
                        }}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8"
                    >
                        <Zap className="w-5 h-5 mr-2" />
                        Run All AI Tools
                    </Button>
                </div>
            </div>
        </div>
    );
}
