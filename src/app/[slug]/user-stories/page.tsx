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
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                    <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Auto-Generated User Stories</h1>
                    <p className="text-muted-foreground text-sm">
                        Transform feedback themes into sprint-ready development work
                    </p>
                </div>
            </div>
            <UserStoriesDashboard projectId={projectId} slug={slug} />
        </div>
    );
}

