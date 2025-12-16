'use client';

/**
 * Project-specific Call Intelligence Page
 * 
 * Displays the CallsDashboard within the project context,
 * integrated with the Mission Control sidebar layout.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CallsDashboard } from '@/components/calls/CallsDashboard';
import WorkflowSidebar from '@/components/WorkflowSidebar';
import GlobalBanner from '@/components/GlobalBanner';

export default function ProjectCallsPage() {
    const params = useParams();
    const slug = params?.slug as string;
    const { user, loading: authLoading } = useAuth();
    const [projectId, setProjectId] = useState<string | null>(null);
    const [projectName, setProjectName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const supabase = getSupabaseClient();

    useEffect(() => {
        async function loadProject() {
            if (!supabase || !slug) return;

            try {
                const { data, error } = await supabase
                    .from('projects')
                    .select('id, name')
                    .eq('slug', slug)
                    .single();

                if (error) {
                    setError('Project not found');
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
    }, [supabase, slug]);

    // Loading states
    if (authLoading || loading) {
        return (
            <div className="flex min-h-screen bg-[#13151a]">
                <WorkflowSidebar projectSlug={slug} />
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
                </div>
            </div>
        );
    }

    // Auth required
    if (!user) {
        return (
            <div className="flex min-h-screen bg-[#13151a]">
                <WorkflowSidebar projectSlug={slug} />
                <div className="flex-1 flex items-center justify-center">
                    <Card className="max-w-md">
                        <CardHeader>
                            <CardTitle>Authentication Required</CardTitle>
                            <CardDescription>Please sign in to view call analytics</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/login">
                                <Button>Sign In</Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !projectId) {
        return (
            <div className="flex min-h-screen bg-[#13151a]">
                <WorkflowSidebar projectSlug={slug} />
                <div className="flex-1 flex items-center justify-center">
                    <Card className="max-w-md">
                        <CardHeader>
                            <CardTitle>Error</CardTitle>
                            <CardDescription>{error || 'Project not found'}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/app">
                                <Button>Go to Dashboard</Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#13151a]">
            <WorkflowSidebar projectSlug={slug} />
            <div className="flex-1 flex flex-col min-w-0">
                <GlobalBanner
                    projectSlug={slug}
                    showBackButton={true}
                    backUrl={`/${slug}/dashboard`}
                    backLabel="Back to Dashboard"
                />
                <main className="flex-1 overflow-auto bg-gray-50 dark:bg-[#13151a]">
                    <CallsDashboard projectId={projectId} />
                </main>
            </div>
        </div>
    );
}
