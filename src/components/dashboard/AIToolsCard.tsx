'use client';

/**
 * AIToolsCard - Quick access to AI automation tools
 * 
 * Displays 4 AI tools with action buttons:
 * - Auto-prioritize feedback
 * - Smart Categorize  
 * - Find Duplicates
 * - Analyze Sentiment
 */

import React, { useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { toast } from 'sonner';
import {
    Target,
    Wand2,
    GitMerge,
    Sparkles,
    Loader2,
    Zap,
} from 'lucide-react';

interface AIToolsCardProps {
    projectSlug: string;
    projectId: string;
}

export function AIToolsCard({ projectSlug, projectId }: AIToolsCardProps) {
    const [autoPrioritizing, setAutoPrioritizing] = useState(false);
    const [autoCategorizing, setAutoCategorizing] = useState(false);
    const [findingDuplicates, setFindingDuplicates] = useState(false);
    const [analyzingSentiment, setAnalyzingSentiment] = useState(false);

    const supabase = getSupabaseClient();

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
        if (!supabase) {
            toast.error('Database connection not available.');
            return;
        }
        try {
            setAnalyzingSentiment(true);
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session?.access_token) {
                toast.error('Please sign in.');
                return;
            }
            const response = await fetch('/api/analyze-sentiment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${sessionData.session.access_token}`,
                },
                body: JSON.stringify({ projectId, limit: 50 }),
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

    const isAnyRunning = autoPrioritizing || autoCategorizing || findingDuplicates || analyzingSentiment;

    const tools = [
        { id: 'prioritize', label: 'Prioritize', icon: Target, color: '#3b82f6', loading: autoPrioritizing, action: handleAutoPrioritize },
        { id: 'categorize', label: 'Categorize', icon: Wand2, color: '#8b5cf6', loading: autoCategorizing, action: handleAutoCategorize },
        { id: 'duplicates', label: 'Duplicates', icon: GitMerge, color: '#f97316', loading: findingDuplicates, action: handleFindDuplicates },
        { id: 'sentiment', label: 'Sentiment', icon: Sparkles, color: '#ec4899', loading: analyzingSentiment, action: handleAnalyzeSentiment },
    ];

    return (
        <div
            style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                border: '2px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '20px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: '280px',
                boxShadow: '0 8px 32px rgba(59, 130, 246, 0.2)',
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div
                    style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Zap style={{ width: '24px', height: '24px', color: 'white' }} />
                </div>
                <div>
                    <h3 style={{ fontWeight: 600, fontSize: '18px', color: 'white', margin: 0 }}>AI Tools</h3>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Automate feedback processing</p>
                </div>
            </div>

            {/* Tool Buttons Grid */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                    flex: 1,
                }}
            >
                {tools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                        <button
                            key={tool.id}
                            onClick={tool.action}
                            disabled={isAnyRunning}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '16px 12px',
                                borderRadius: '12px',
                                border: `1px solid ${tool.color}40`,
                                background: `${tool.color}15`,
                                cursor: isAnyRunning ? 'not-allowed' : 'pointer',
                                opacity: isAnyRunning && !tool.loading ? 0.5 : 1,
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                                if (!isAnyRunning) {
                                    e.currentTarget.style.background = `${tool.color}30`;
                                    e.currentTarget.style.transform = 'scale(1.02)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = `${tool.color}15`;
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            {tool.loading ? (
                                <Loader2 style={{ width: '20px', height: '20px', color: tool.color, animation: 'spin 1s linear infinite' }} />
                            ) : (
                                <Icon style={{ width: '20px', height: '20px', color: tool.color }} />
                            )}
                            <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                                {tool.loading ? 'Running...' : tool.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
