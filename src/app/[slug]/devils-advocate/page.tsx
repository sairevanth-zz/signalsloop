'use client';

/**
 * Project-Scoped Devil's Advocate Page
 * 
 * Shows all PRDs/specs with their risk alerts within the project dashboard context.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Shield, AlertTriangle, FileText, Sparkles, Loader2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';

export default function ProjectDevilsAdvocatePage() {
    const params = useParams();
    const projectSlug = params?.slug as string;
    const { user, loading: authLoading } = useAuth();

    const [projectId, setProjectId] = useState<string>('');
    const [projectName, setProjectName] = useState<string>('');
    const [specs, setSpecs] = useState<any[]>([]);
    const [loadingProject, setLoadingProject] = useState(true);
    const [loadingSpecs, setLoadingSpecs] = useState(true);
    const [summary, setSummary] = useState<any>(null);

    useEffect(() => {
        if (projectSlug) {
            loadProject();
        }
    }, [projectSlug]);

    useEffect(() => {
        if (projectId) {
            fetchSpecs(projectId);
            fetchSummary(projectId);
        }
    }, [projectId]);

    const loadProject = async () => {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        try {
            const { data, error } = await supabase
                .from('projects')
                .select('id, name')
                .eq('slug', projectSlug)
                .single();

            if (error) throw error;
            if (data) {
                setProjectId(data.id);
                setProjectName(data.name);
            }
        } catch (error) {
            console.error('Error loading project:', error);
        } finally {
            setLoadingProject(false);
        }
    };

    const fetchSpecs = async (projId: string) => {
        setLoadingSpecs(true);
        try {
            const supabase = getSupabaseClient();
            if (!supabase) return;

            const { data } = await supabase
                .from('specs')
                .select('id, title, status, created_at')
                .eq('project_id', projId)
                .order('created_at', { ascending: false });

            setSpecs(data || []);
        } catch (error) {
            console.error('Error fetching specs:', error);
        } finally {
            setLoadingSpecs(false);
        }
    };

    const fetchSummary = async (projId: string) => {
        try {
            const response = await fetch(
                `/api/devils-advocate/alerts?projectId=${projId}&action=summary`
            );
            const data = await response.json();

            if (data.success) {
                setSummary(data.summary);
            }
        } catch (error) {
            console.error('Error fetching summary:', error);
        }
    };

    if (authLoading || loadingProject) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold mb-4">Devil's Advocate</h1>
                    <p className="text-muted-foreground mb-8">Please sign in to access this feature</p>
                    <Button asChild>
                        <Link href="/login">Sign In</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Hero */}
            <Card className="mb-8 bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-yellow-900/20 border-red-200 dark:border-red-800">
                <CardHeader>
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-2xl mb-2 bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                                Devil's Advocate Agent
                            </CardTitle>
                            <CardDescription className="text-base">
                                Adversarial AI that ruthlessly challenges your PRDs with competitive
                                intelligence and internal data. Find flaws before engineering resources
                                are spent.
                            </CardDescription>
                            {projectName && (
                                <p className="text-sm text-muted-foreground mt-2">
                                    Project: {projectName}
                                </p>
                            )}
                        </div>
                        <Button asChild variant="outline">
                            <Link href={`/${projectSlug}/competitive`}>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Track Competitors
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            {/* Summary Stats */}
            {summary && (
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                                <div>
                                    <p className="text-2xl font-bold">{summary.total_alerts}</p>
                                    <p className="text-xs text-muted-foreground">Total Alerts</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                <div>
                                    <p className="text-2xl font-bold">{summary.critical_alerts}</p>
                                    <p className="text-xs text-muted-foreground">Critical</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                                <div>
                                    <p className="text-2xl font-bold">{summary.high_alerts}</p>
                                    <p className="text-xs text-muted-foreground">High Priority</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-blue-500" />
                                <div>
                                    <p className="text-2xl font-bold">{summary.open_alerts}</p>
                                    <p className="text-xs text-muted-foreground">Open</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Specs List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Your PRDs & Specs
                    </CardTitle>
                    <CardDescription>
                        Select a PRD to run Devil's Advocate analysis
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {loadingSpecs ? (
                        <div className="text-center py-12">
                            <Loader2 className="size-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                            <p className="text-muted-foreground">Loading specs...</p>
                        </div>
                    ) : specs.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No PRDs Yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Create a PRD to start using Devil's Advocate analysis
                            </p>
                            <Button asChild>
                                <Link href={`/${projectSlug}/specs/new`}>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Create PRD
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {specs.map((spec) => (
                                <Link
                                    key={spec.id}
                                    href={`/${projectSlug}/specs/${spec.id}#devils-advocate`}
                                    className="block"
                                >
                                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold">{spec.title}</h3>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Created {new Date(spec.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Badge variant="outline">{spec.status}</Badge>
                                                    <Button size="sm" variant="outline">
                                                        <Shield className="w-4 h-4 mr-1" />
                                                        Analyze
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
