'use client';

/**
 * Launch Boards List Page
 * Overview of all Go/No-Go boards for the project
 */

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Rocket, ArrowLeft, Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase-client';
import type { LaunchBoard } from '@/types/launch';

export default function LaunchBoardsPage() {
    const params = useParams();
    const router = useRouter();
    const projectSlug = params?.slug as string;
    const [boards, setBoards] = useState<LaunchBoard[]>([]);
    const [loading, setLoading] = useState(true);
    const [projectId, setProjectId] = useState<string | null>(null);

    // Fetch project ID
    useEffect(() => {
        async function fetchProjectId() {
            const supabase = getSupabaseClient();
            if (!supabase || !projectSlug) return;

            const { data } = await supabase
                .from('projects')
                .select('id')
                .eq('slug', projectSlug)
                .single();

            if (data) {
                setProjectId(data.id);
            }
        }
        fetchProjectId();
    }, [projectSlug]);

    // Fetch boards
    useEffect(() => {
        async function fetchBoards() {
            if (!projectId) return;

            try {
                const response = await fetch(`/api/launch?projectId=${projectId}`);
                if (!response.ok) throw new Error('Failed to fetch boards');
                const data = await response.json();
                setBoards(data.boards || []);
            } catch (error) {
                console.error('Error fetching boards:', error);
                toast.error('Failed to load launch boards');
            } finally {
                setLoading(false);
            }
        }

        if (projectId) {
            fetchBoards();
        }
    }, [projectId]);

    const getStatusIcon = (status: string, decision?: string) => {
        if (decision === 'go') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
        if (decision === 'no_go') return <AlertCircle className="w-4 h-4 text-red-500" />;
        if (decision === 'conditional') return <Clock className="w-4 h-4 text-yellow-500" />;
        return <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
    };

    const getStatusBadge = (status: string, decision?: string) => {
        if (decision) {
            const colors = {
                go: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', label: 'GO' },
                no_go: { bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-400', label: 'NO-GO' },
                conditional: { bg: 'bg-yellow-100 dark:bg-yellow-500/20', text: 'text-yellow-700 dark:text-yellow-400', label: 'CONDITIONAL' },
            };
            const config = colors[decision as keyof typeof colors];
            return (
                <span className={`text-xs px-2 py-1 rounded-full ${config.bg} ${config.text}`}>
                    {config.label}
                </span>
            );
        }

        const statusColors = {
            draft: { bg: 'bg-gray-100 dark:bg-gray-500/20', text: 'text-gray-700 dark:text-gray-400', label: 'Draft' },
            reviewing: { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-400', label: 'Reviewing' },
            decided: { bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-700 dark:text-purple-400', label: 'Decided' },
        };
        const config = statusColors[status as keyof typeof statusColors] || statusColors.draft;
        return (
            <span className={`text-xs px-2 py-1 rounded-full ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-white/10 px-6 py-4">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push(`/${projectSlug}/dashboard`)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Rocket className="w-5 h-5 text-teal-500 dark:text-teal-400" />
                                Launch Go/No-Go
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                AI-powered launch readiness assessment
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => router.push(`/${projectSlug}/launch/new`)}
                        className="bg-teal-600 hover:bg-teal-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Launch Board
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto p-6">
                {boards.length === 0 ? (
                    <div className="text-center py-16">
                        <Rocket className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No launch boards yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Create a Go/No-Go board to assess launch readiness with AI insights
                        </p>
                        <Button
                            onClick={() => router.push(`/${projectSlug}/launch/new`)}
                            className="bg-teal-600 hover:bg-teal-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Your First Board
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {boards.map(board => (
                            <div
                                key={board.id}
                                onClick={() => router.push(`/${projectSlug}/launch/${board.id}`)}
                                className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-white/10 hover:border-teal-500/50 cursor-pointer transition-all group"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(board.status, board.decision ?? undefined)}
                                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-teal-500 dark:group-hover:text-teal-400 transition-colors">
                                            {board.title}
                                        </h3>
                                    </div>
                                    {getStatusBadge(board.status, board.decision ?? undefined)}
                                </div>

                                {board.description && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                                        {board.description}
                                    </p>
                                )}

                                <div className="flex items-center justify-between">
                                    {board.target_date && (
                                        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(board.target_date).toLocaleDateString()}
                                        </div>
                                    )}

                                    {board.overall_score !== null && board.overall_score !== undefined && (
                                        <div
                                            className="text-lg font-bold"
                                            style={{
                                                color: board.overall_score >= 75 ? '#10b981' : board.overall_score >= 50 ? '#fbbf24' : '#ef4444'
                                            }}
                                        >
                                            {board.overall_score}%
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
