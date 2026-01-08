'use client';

/**
 * Project-Scoped User Stories Page
 * 
 * AI-powered conversion of themes to sprint-ready user stories
 */

import { useParams } from 'next/navigation';
import { UserStoriesDashboard } from '@/components/user-stories/UserStoriesDashboard';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Zap } from 'lucide-react';

export default function UserStoriesPage() {
    const params = useParams();
    const slug = params?.slug as string;
    const [projectId, setProjectId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = getSupabaseClient();

    useEffect(() => {
        async function fetchProject() {
            if (!supabase || !slug) return;

            try {
                const { data, error } = await supabase
                    .from('projects')
                    .select('id')
                    .eq('slug', slug)
                    .single();

                if (error) throw error;
                setProjectId(data?.id || null);
            } catch (error) {
                console.error('Error fetching project:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchProject();
    }, [supabase, slug]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    if (!projectId) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-muted-foreground">Project not found</div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-2">
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Zap className="size-8 text-blue-500" />
                        Auto-Generated User Stories
                    </h1>
                </div>
                <p className="text-muted-foreground">
                    Transform feedback themes into sprint-ready development work
                </p>
            </div>
            <UserStoriesDashboard projectId={projectId} slug={slug} />
        </div>
    );
}

