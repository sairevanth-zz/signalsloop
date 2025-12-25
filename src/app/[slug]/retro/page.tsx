'use client';

/**
 * Retrospectives List Page
 * Overview of all retrospective boards for the project
 */

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, History, ArrowLeft, Calendar, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase-client';
import type { RetroBoard } from '@/types/retro';
import { PERIOD_CONFIGS } from '@/types/retro';

export default function RetrospectivesPage() {
    const params = useParams();
    const router = useRouter();
    const projectSlug = params?.slug as string;
    const [boards, setBoards] = useState<RetroBoard[]>([]);
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
                const response = await fetch(`/api/retro?projectId=${projectId}`);
                if (!response.ok) throw new Error('Failed to fetch boards');
                const data = await response.json();
                setBoards(data.boards || []);
            } catch (error) {
                console.error('Error fetching boards:', error);
                toast.error('Failed to load retrospectives');
            } finally {
                setLoading(false);
            }
        }

        if (projectId) {
            fetchBoards();
        }
    }, [projectId]);

    const getStatusBadge = (status: string) => {
        const statusColors = {
            active: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Active' },
            completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Completed' },
            archived: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Archived' },
        };
        const config = statusColors[status as keyof typeof statusColors] || statusColors.active;
        return (
            <span className={`text-xs px-2 py-1 rounded-full ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#13151a]">
            {/* Header */}
            <div className="bg-[#141b2d] border-b border-white/10 px-6 py-4">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push(`/${projectSlug}/dashboard`)}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-400" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                <History className="w-5 h-5 text-purple-400" />
                                Retrospectives
                            </h1>
                            <p className="text-sm text-gray-400">
                                Period-aware retrospectives with AI insights
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => router.push(`/${projectSlug}/retro/new`)}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Retrospective
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto p-6">
                {boards.length === 0 ? (
                    <div className="text-center py-16">
                        <History className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">No retrospectives yet</h3>
                        <p className="text-gray-400 mb-6">
                            Create a retrospective to reflect on sprints, months, or quarters
                        </p>
                        <Button
                            onClick={() => router.push(`/${projectSlug}/retro/new`)}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Your First Retro
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {boards.map(board => {
                            const periodConfig = PERIOD_CONFIGS[board.period_type];

                            return (
                                <div
                                    key={board.id}
                                    onClick={() => router.push(`/${projectSlug}/retro/${board.id}`)}
                                    className="bg-[#141b2d] rounded-xl p-5 border border-white/10 hover:border-purple-500/50 cursor-pointer transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">{periodConfig.icon}</span>
                                            <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                                                {board.title}
                                            </h3>
                                        </div>
                                        {getStatusBadge(board.status)}
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                                        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">
                                            {periodConfig.label}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(board.start_date).toLocaleDateString()} - {new Date(board.end_date).toLocaleDateString()}
                                        </div>
                                    </div>

                                    {/* Metrics Preview */}
                                    {board.metrics && board.metrics.length > 0 && (
                                        <div className="flex gap-3 mt-3 pt-3 border-t border-white/5">
                                            {board.metrics.slice(0, 3).map((m, i) => (
                                                <div key={i} className="text-center">
                                                    <div className="text-sm font-bold text-white">{m.value}</div>
                                                    <div className="text-[9px] text-gray-500">{m.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
