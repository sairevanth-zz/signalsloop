'use client';

/**
 * Anomalies Page
 * Displays AI-detected anomalies in feedback patterns
 */

import React from 'react';
import { useParams } from 'next/navigation';
import { AnomalyAlertCard } from '@/components/dashboard/AnomalyAlertCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Shield, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function AnomaliesPage() {
    const params = useParams();
    const slug = params?.slug as string;
    const [projectId, setProjectId] = useState<string | null>(null);

    useEffect(() => {
        async function loadProject() {
            try {
                const res = await fetch('/api/projects?all=true', { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to load projects');
                const data = await res.json();
                const project = data.projects?.find((p: any) => p.slug === slug);
                if (project) {
                    setProjectId(project.id);
                }
            } catch (error) {
                console.error('Error loading project:', error);
            }
        }
        if (slug) loadProject();
    }, [slug]);

    return (
        <div className="min-h-screen p-6 bg-background">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Shield className="w-6 h-6 text-orange-500" />
                        Anomaly Detection
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        AI-powered detection of unusual patterns in your feedback
                    </p>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-red-500/10">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">Sentiment Spikes</p>
                                    <p className="text-sm text-muted-foreground">Unusual sentiment changes</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-yellow-500/10">
                                    <Activity className="w-5 h-5 text-yellow-500" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">Volume Surges</p>
                                    <p className="text-sm text-muted-foreground">Unexpected feedback volume</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/10">
                                    <Shield className="w-5 h-5 text-purple-500" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">Topic Emergence</p>
                                    <p className="text-sm text-muted-foreground">New emerging themes</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Anomaly Alert Card - the main component */}
                {projectId ? (
                    <AnomalyAlertCard projectId={projectId} />
                ) : (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-muted-foreground">Loading project...</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
