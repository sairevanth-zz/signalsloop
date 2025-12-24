'use client';

/**
 * Create New Survey Page
 */

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SurveyBuilder } from '@/components/surveys/SurveyBuilder';
import { toast } from 'sonner';

export default function NewSurveyPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;

    const [projectId, setProjectId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProject();
    }, [slug]);

    const loadProject = async () => {
        try {
            const res = await fetch('/api/projects?all=true', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load projects');
            const data = await res.json();
            const project = data.projects?.find((p: any) => p.slug === slug);
            if (project) setProjectId(project.id);
        } catch (error) {
            toast.error('Failed to load project');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = (surveyId: string) => {
        router.push(`/${slug}/surveys/${surveyId}`);
    };

    const handleCancel = () => {
        router.push(`/${slug}/surveys`);
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
                <Button
                    variant="ghost"
                    onClick={() => router.push(`/${slug}/surveys`)}
                    className="mb-4 text-muted-foreground hover:text-foreground"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to Surveys
                </Button>

                <SurveyBuilder
                    projectId={projectId}
                    onSave={handleSave}
                    onCancel={handleCancel}
                />
            </div>
        </div>
    );
}
