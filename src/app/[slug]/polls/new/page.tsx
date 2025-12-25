'use client';

/**
 * Create New Poll Page
 * Supports pre-filling from Knowledge Gap suggestions via sessionStorage
 */

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PollBuilder } from '@/components/polls/PollBuilder';
import { toast } from 'sonner';
import type { CreatePollInput } from '@/types/polls';

interface PrefillData {
    title?: string;
    question?: string;
    description?: string;
    poll_type?: string;
    options?: string[];
}

export default function NewPollPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const slug = params?.slug as string;

    const themeId = searchParams?.get('themeId') || undefined;
    const isPrefill = searchParams?.get('prefill') === 'true';

    const [projectId, setProjectId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [initialData, setInitialData] = useState<Partial<CreatePollInput> | null>(null);
    const [showPrefillBanner, setShowPrefillBanner] = useState(false);

    useEffect(() => {
        loadProject();
        loadPrefillData();
    }, [slug, isPrefill]);

    const loadProject = async () => {
        try {
            const res = await fetch('/api/projects?all=true', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load projects');
            const data = await res.json();
            const project = data.projects?.find((p: any) => p.slug === slug);
            if (project) {
                setProjectId(project.id);
            }
        } catch (error) {
            toast.error('Failed to load project');
        } finally {
            setLoading(false);
        }
    };

    const loadPrefillData = () => {
        if (!isPrefill) return;

        try {
            const prefillStr = sessionStorage.getItem('prefillPoll');
            if (prefillStr) {
                const prefill: PrefillData = JSON.parse(prefillStr);

                // Convert to CreatePollInput format
                const pollData: Partial<CreatePollInput> = {
                    title: prefill.title || prefill.question || '',
                    description: prefill.description || `Poll suggested by AI based on detected knowledge gaps.`,
                    poll_type: (prefill.poll_type as any) || 'single_choice',
                    options: prefill.options?.map(opt => ({
                        option_text: opt,
                        description: ''
                    })) || [],
                    allow_anonymous: true,
                };

                setInitialData(pollData);
                setShowPrefillBanner(true);

                // Clear the sessionStorage after reading
                sessionStorage.removeItem('prefillPoll');

                toast.success('Poll fields pre-filled from AI suggestion!');
            }
        } catch (error) {
            console.error('Error loading prefill data:', error);
        }
    };

    const handleSave = (pollId: string) => {
        router.push(`/${slug}/polls/${pollId}`);
    };

    const handleCancel = () => {
        router.push(`/${slug}/polls`);
    };

    if (loading || !projectId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="mt-2 text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 bg-background">
            <div className="max-w-3xl mx-auto">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    onClick={() => router.push(`/${slug}/polls`)}
                    className="mb-4 text-muted-foreground hover:text-foreground"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to Polls
                </Button>

                {/* AI Pre-fill Banner */}
                {showPrefillBanner && (
                    <div className="mb-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-purple-500 mt-0.5" />
                        <div>
                            <p className="font-medium text-purple-600 dark:text-purple-400">
                                AI-Suggested Poll
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                This poll was pre-filled based on a detected knowledge gap.
                                Review and adjust the options before publishing.
                            </p>
                        </div>
                    </div>
                )}

                {/* Poll Builder */}
                <PollBuilder
                    projectId={projectId}
                    themeId={themeId}
                    initialData={initialData || undefined}
                    onSave={handleSave}
                    onCancel={handleCancel}
                />
            </div>
        </div>
    );
}

