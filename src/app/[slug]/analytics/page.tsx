'use client';

/**
 * Project-scoped Analytics Dashboard Page
 * Shows analytics for the current project without project selector
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-client';
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard';
import { BarChart3, Loader2 } from 'lucide-react';

interface Project {
    id: string;
    name: string;
    slug: string;
}

export default function ProjectAnalyticsPage() {
    const params = useParams();
    const slug = params?.slug as string;

    const [projectId, setProjectId] = useState<string | null>(null);
    const [projectName, setProjectName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadProject() {
            if (!slug) {
                setError('No project selected');
                setLoading(false);
                return;
            }

            try {
                const supabase = getSupabaseClient();
                if (!supabase) {
                    setError('Unable to connect to database');
                    setLoading(false);
                    return;
                }

                const { data, error: fetchError } = await supabase
                    .from('projects')
                    .select('id, name, slug')
                    .eq('slug', slug)
                    .single();

                if (fetchError || !data) {
                    setError('Project not found');
                    setLoading(false);
                    return;
                }

                setProjectId(data.id);
                setProjectName(data.name);
            } catch (err) {
                console.error('Error loading project:', err);
                setError('Failed to load project');
            } finally {
                setLoading(false);
            }
        }

        loadProject();
    }, [slug]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error || !projectId) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        {error || 'Unable to Load Analytics'}
                    </h2>
                    <p className="text-gray-600">
                        Please check that this project exists and you have access to it.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-2">
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <BarChart3 className="size-8 text-blue-500" />
                        Analytics Dashboard
                    </h1>
                </div>
                <p className="text-muted-foreground">
                    Track your feedback board performance and user engagement
                </p>
            </div>

            {/* Analytics Dashboard Component */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <AnalyticsDashboard projectId={projectId} />
            </div>
        </div>
    );
}
