'use client';

/**
 * Create New Poll Page
 */

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PollBuilder } from '@/components/polls/PollBuilder';
import { toast } from 'sonner';

export default function NewPollPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const slug = params?.slug as string;

    const themeId = searchParams?.get('themeId') || undefined;

    const [projectId, setProjectId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProject();
    }, [slug]);

    const loadProject = async () => {
        try {
            const res = await fetch('/api/projects?all=true');
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

    const handleSave = (pollId: string) => {
        router.push(`/${slug}/polls/${pollId}`);
    };

    const handleCancel = () => {
        router.push(`/${slug}/polls`);
    };

    if (loading || !projectId) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1d23' }}>
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="mt-2 text-slate-400">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6" style={{ backgroundColor: '#1a1d23' }}>
            <div className="max-w-3xl mx-auto">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    onClick={() => router.push(`/${slug}/polls`)}
                    className="mb-4 text-slate-400 hover:text-white"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to Polls
                </Button>

                {/* Poll Builder */}
                <PollBuilder
                    projectId={projectId}
                    themeId={themeId}
                    onSave={handleSave}
                    onCancel={handleCancel}
                />
            </div>
        </div>
    );
}
