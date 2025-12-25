'use client';

/**
 * Retrospective Dashboard
 * Period-aware retrospective tool with dynamic columns and AI insights
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Share2, Plus, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PeriodSelector } from './PeriodSelector';
import { MetricStrip } from './MetricStrip';
import { RetroKanban } from './RetroKanban';
import { ActionsPanel } from './ActionsPanel';
import { AISummaryPanel } from './AISummaryPanel';
import type { RetroBoardWithDetails, RetroPeriod, RetroCard } from '@/types/retro';
import { PERIOD_CONFIGS, getPeriodAICallout } from '@/types/retro';

interface RetrospectiveDashboardProps {
    boardId: string;
    projectSlug: string;
}

export function RetrospectiveDashboard({ boardId, projectSlug }: RetrospectiveDashboardProps) {
    const router = useRouter();
    const [board, setBoard] = useState<RetroBoardWithDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAIContent, setShowAIContent] = useState(true);
    const [isPopulating, setIsPopulating] = useState(false);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

    // Fetch board data
    useEffect(() => {
        async function fetchBoard() {
            try {
                const response = await fetch(`/api/retro/${boardId}`);
                if (!response.ok) throw new Error('Failed to fetch board');
                const data = await response.json();
                setBoard(data.board);
            } catch (error) {
                console.error('Error fetching board:', error);
                toast.error('Failed to load retrospective');
            } finally {
                setLoading(false);
            }
        }
        fetchBoard();
    }, [boardId]);

    // Trigger AI population
    const handleAIPopulate = async () => {
        setIsPopulating(true);
        try {
            const response = await fetch(`/api/retro/${boardId}/ai-populate`, {
                method: 'POST',
            });
            if (!response.ok) throw new Error('Failed to populate');

            // Refresh board
            const boardResponse = await fetch(`/api/retro/${boardId}`);
            const boardData = await boardResponse.json();
            setBoard(boardData.board);

            toast.success('AI cards generated!');
        } catch (error) {
            console.error('Error populating:', error);
            toast.error('Failed to run AI analysis');
        } finally {
            setIsPopulating(false);
        }
    };

    // Generate summary
    const handleGenerateSummary = async () => {
        setIsGeneratingSummary(true);
        try {
            const response = await fetch(`/api/retro/${boardId}/summary`, {
                method: 'POST',
            });
            if (!response.ok) throw new Error('Failed to generate summary');
            const data = await response.json();

            setBoard(prev => prev ? { ...prev, ai_summary: data.summary } : null);
            toast.success('Summary generated!');
        } catch (error) {
            console.error('Error generating summary:', error);
            toast.error('Failed to generate summary');
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    // Add card
    const handleAddCard = async (columnId: string, content: string) => {
        try {
            const response = await fetch(`/api/retro/${boardId}/cards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ column_id: columnId, content }),
            });
            if (!response.ok) throw new Error('Failed to add card');
            const data = await response.json();

            setBoard(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    columns: prev.columns.map(col =>
                        col.id === columnId
                            ? { ...col, cards: [data.card, ...col.cards] }
                            : col
                    ),
                };
            });
        } catch (error) {
            toast.error('Failed to add card');
        }
    };

    // Vote on card
    const handleVoteCard = async (cardId: string) => {
        try {
            const response = await fetch(`/api/retro/${boardId}/votes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cardId }),
            });
            if (!response.ok) throw new Error('Failed to vote');
            const data = await response.json();

            setBoard(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    columns: prev.columns.map(col => ({
                        ...col,
                        cards: col.cards.map(card =>
                            card.id === cardId
                                ? { ...card, vote_count: data.newCount }
                                : card
                        ),
                    })),
                };
            });
        } catch (error) {
            toast.error('Failed to vote');
        }
    };

    // Add action
    const handleAddAction = async (title: string, cardId?: string) => {
        try {
            const response = await fetch(`/api/retro/${boardId}/actions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    from_card_id: cardId,
                    from_source: cardId ? 'Card' : 'Manual',
                }),
            });
            if (!response.ok) throw new Error('Failed to add action');
            const data = await response.json();

            setBoard(prev => prev ? {
                ...prev,
                actions: [data.action, ...prev.actions],
            } : null);

            toast.success('Action added');
        } catch (error) {
            toast.error('Failed to add action');
        }
    };

    // Update action status
    const handleUpdateActionStatus = async (actionId: string, status: string) => {
        try {
            await fetch(`/api/retro/${boardId}/actions`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actionId, status }),
            });

            setBoard(prev => prev ? {
                ...prev,
                actions: prev.actions.map(a =>
                    a.id === actionId
                        ? { ...a, status: status as 'not_started' | 'in_progress' | 'completed' }
                        : a
                ),
            } : null);
        } catch (error) {
            toast.error('Failed to update action');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
            </div>
        );
    }

    if (!board) {
        return (
            <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center text-white">
                <div className="text-center">
                    <p className="text-gray-400 mb-4">Retrospective not found</p>
                    <Button onClick={() => router.push(`/${projectSlug}/retro`)}>
                        Back to Retrospectives
                    </Button>
                </div>
            </div>
        );
    }

    const periodConfig = PERIOD_CONFIGS[board.period_type];

    return (
        <div className="min-h-screen bg-[#0a0f1a] text-gray-50 font-sans">
            {/* Header */}
            <div className="bg-[#141b2d] border-b border-white/10 px-6 py-3.5">
                <div className="max-w-[1800px] mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push(`/${projectSlug}/retro`)}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-400" />
                        </button>
                        <span className="text-2xl">{periodConfig.icon}</span>
                        <div>
                            <h1 className="text-lg font-bold">{board.title}</h1>
                            <p className="text-xs text-gray-400">
                                {new Date(board.start_date).toLocaleDateString()} - {new Date(board.end_date).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAIPopulate}
                            disabled={isPopulating}
                            className="border-gray-700 bg-teal-500/10 text-teal-400 border-teal-500/50"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            {isPopulating ? 'Analyzing...' : 'AI Populate'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAIContent(!showAIContent)}
                            className={`border-gray-700 ${showAIContent ? 'bg-teal-500/10 text-teal-400' : 'text-gray-400'}`}
                        >
                            🤖 AI {showAIContent ? 'ON' : 'OFF'}
                        </Button>
                        <Button variant="outline" size="sm" className="border-gray-700 text-gray-400">
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-5 max-w-[1800px] mx-auto">
                <div className="grid grid-cols-[1fr_300px] gap-4">
                    {/* Left Side - Kanban */}
                    <div>
                        {/* Metric Strip */}
                        <MetricStrip metrics={board.metrics} />

                        {/* AI Callout */}
                        {showAIContent && (
                            <div
                                className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-3 mb-4 text-xs text-teal-400"
                            >
                                💡 {getPeriodAICallout(board.period_type)}
                            </div>
                        )}

                        {/* Kanban Board */}
                        <RetroKanban
                            columns={board.columns}
                            showAIContent={showAIContent}
                            onAddCard={handleAddCard}
                            onVoteCard={handleVoteCard}
                            onCreateAction={(cardId, content) => handleAddAction(content, cardId)}
                        />
                    </div>

                    {/* Right Side - Actions & Summary */}
                    <div className="space-y-4">
                        <ActionsPanel
                            actions={board.actions}
                            onUpdateStatus={handleUpdateActionStatus}
                            onAddAction={handleAddAction}
                        />

                        <AISummaryPanel
                            summary={board.ai_summary}
                            onGenerate={handleGenerateSummary}
                            isGenerating={isGeneratingSummary}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RetrospectiveDashboard;
