'use client';

/**
 * KnowledgeGapCard - Detect knowledge gaps and suggest polls
 * 
 * Analyzes feedback themes to find areas where you need more clarity,
 * then suggests polls to gather targeted feedback.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Brain,
    RefreshCw,
    Lightbulb,
    Plus,
    CheckCircle,
    HelpCircle,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// Interface matches actual API response from /lib/polls/knowledge-gap-detection.ts
interface KnowledgeGap {
    theme_id?: string;
    theme_name: string;
    description?: string;
    feedback_count?: number;
    specificity_score: number; // 0-1, lower = less specific
    suggested_poll_title: string;
    suggested_options: string[];
    reasoning: string;
}

interface Props {
    projectId: string;
    projectSlug: string;
}

export function KnowledgeGapCard({ projectId, projectSlug }: Props) {
    const router = useRouter();
    const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    useEffect(() => {
        fetchSuggestions();
    }, [projectId]);

    async function fetchSuggestions() {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/polls/detect-gaps?projectId=${projectId}&limit=5`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to fetch suggestions');
            }

            setGaps(data.suggestions || []);
        } catch (err) {
            console.error('Error fetching knowledge gaps:', err);
            setError('Failed to load suggestions');
        } finally {
            setIsLoading(false);
        }
    }

    async function runDetection() {
        setIsDetecting(true);
        setError(null);

        try {
            const res = await fetch('/api/polls/detect-gaps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    minFeedbackCount: 3,
                    maxSpecificity: 0.5,
                    createActions: false,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to detect gaps');
            }

            setGaps(data.gaps || []);
        } catch (err) {
            console.error('Error detecting knowledge gaps:', err);
            setError('Failed to run detection');
        } finally {
            setIsDetecting(false);
        }
    }

    function createPollFromGap(gap: KnowledgeGap) {
        // Navigate to poll creation with pre-filled data
        const pollData = {
            title: gap.suggested_poll_title,
            question: gap.suggested_poll_title,
            poll_type: 'single',
            options: gap.suggested_options,
        };

        // Store in session for pre-filling
        sessionStorage.setItem('prefillPoll', JSON.stringify(pollData));
        router.push(`/${projectSlug}/polls/new?prefill=true`);
    }

    function getSpecificityLabel(score: number): { label: string; color: string } {
        if (score < 0.3) return { label: 'Very Vague', color: 'text-red-500' };
        if (score < 0.5) return { label: 'Unclear', color: 'text-yellow-500' };
        if (score < 0.7) return { label: 'Moderate', color: 'text-blue-500' };
        return { label: 'Clear', color: 'text-green-500' };
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <Brain className="h-5 w-5 text-purple-500" />
                        Knowledge Gaps
                    </CardTitle>
                    <CardDescription>AI-detected areas needing more clarity</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-32">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <Brain className="h-5 w-5 text-purple-500" />
                            Knowledge Gaps
                            {gaps.length > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {gaps.length}
                                </Badge>
                            )}
                        </CardTitle>
                        <CardDescription>Areas where you need more clarity from users</CardDescription>
                    </div>
                    <Button
                        onClick={runDetection}
                        disabled={isDetecting}
                        size="sm"
                        variant="outline"
                    >
                        {isDetecting ? (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Detect Gaps
                            </>
                        )}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {gaps.length === 0 ? (
                    <div className="text-center py-8">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                        <p className="text-foreground mb-2 font-medium">No knowledge gaps detected</p>
                        <p className="text-sm text-muted-foreground">
                            Your feedback gives you clear understanding. Check back after more feedback arrives.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {gaps.map((gap, index) => {
                            const specificity = getSpecificityLabel(gap.specificity_score);
                            const isExpanded = expandedIndex === index;

                            return (
                                <div
                                    key={index}
                                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                                >
                                    {/* Gap Header */}
                                    <div
                                        className="flex items-start justify-between cursor-pointer"
                                        onClick={() => setExpandedIndex(isExpanded ? null : index)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <HelpCircle className="h-5 w-5 text-purple-500 mt-0.5" />
                                            <div>
                                                <p className="font-medium text-foreground">{gap.theme_name}</p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {gap.reasoning}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={specificity.color}>
                                                {specificity.label}
                                            </Badge>
                                            {isExpanded ? (
                                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Content */}
                                    {isExpanded && (
                                        <div className="mt-4 pt-4 border-t space-y-4">
                                            {/* Suggested Poll */}
                                            <div className="bg-purple-500/10 rounded-lg p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Lightbulb className="h-4 w-4 text-purple-500" />
                                                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                                        Suggested Poll
                                                    </span>
                                                </div>
                                                <p className="font-medium text-foreground mb-2">
                                                    {gap.suggested_poll_title}
                                                </p>
                                                {gap.feedback_count && (
                                                    <p className="text-sm text-muted-foreground mb-3">
                                                        Based on {gap.feedback_count} feedback items
                                                    </p>
                                                )}
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {gap.suggested_options.slice(0, 4).map((opt, i) => (
                                                        <Badge key={i} variant="secondary" className="text-xs">
                                                            {opt}
                                                        </Badge>
                                                    ))}
                                                    {gap.suggested_options.length > 4 && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            +{gap.suggested_options.length - 4} more
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Button */}
                                            <Button
                                                onClick={() => createPollFromGap(gap)}
                                                className="w-full bg-purple-600 hover:bg-purple-700"
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Create This Poll
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
