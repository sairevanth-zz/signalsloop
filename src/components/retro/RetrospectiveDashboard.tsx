'use client';

/**
 * Retrospective Dashboard
 * Period-aware retrospective tool with dynamic columns and AI insights
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Share2, FileDown, Target } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { MetricStrip } from './MetricStrip';
import { RetroKanban } from './RetroKanban';
import { ActionsPanel } from './ActionsPanel';
import { AISummaryPanel } from './AISummaryPanel';
import { OutcomesTimeline } from './OutcomesTimeline';
import { TemplateSelector } from './TemplateSelector';
import type { RetroBoardWithDetails } from '@/types/retro';
import { PERIOD_CONFIGS, getPeriodAICallout, getTemplateConfig } from '@/types/retro';

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
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [outcomeItems, setOutcomeItems] = useState<Array<{
        feature: string;
        shipped?: string;
        status: 'success' | 'partial' | 'failed';
        adoption?: string;
        predicted?: string;
        sentiment?: string;
    }>>([]);

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

    // Share board
    const handleShare = async () => {
        try {
            const response = await fetch(`/api/retro/${boardId}/share`, {
                method: 'POST',
            });
            if (!response.ok) throw new Error('Failed to share');
            const data = await response.json();

            // Copy to clipboard
            await navigator.clipboard.writeText(data.shareUrl);
            toast.success('Share link copied to clipboard!');
        } catch (error) {
            toast.error('Failed to generate share link');
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

    // Delete card
    const handleDeleteCard = async (cardId: string, columnId: string) => {
        try {
            await fetch(`/api/retro/${boardId}/cards?cardId=${cardId}`, {
                method: 'DELETE',
            });

            setBoard(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    columns: prev.columns.map(col =>
                        col.id === columnId
                            ? { ...col, cards: col.cards.filter(c => c.id !== cardId) }
                            : col
                    ),
                };
            });
        } catch (error) {
            toast.error('Failed to delete card');
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

    // Delete action
    const handleDeleteAction = async (actionId: string) => {
        try {
            await fetch(`/api/retro/${boardId}/actions?actionId=${actionId}`, {
                method: 'DELETE',
            });

            setBoard(prev => prev ? {
                ...prev,
                actions: prev.actions.filter(a => a.id !== actionId),
            } : null);
        } catch (error) {
            toast.error('Failed to delete action');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
            </div>
        );
    }

    if (!board) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center text-gray-900 dark:text-white">
                <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">Retrospective not found</p>
                    <Button onClick={() => router.push(`/${projectSlug}/retro`)}>
                        Back to Retrospectives
                    </Button>
                </div>
            </div>
        );
    }

    const periodConfig = PERIOD_CONFIGS[board.period_type];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-50 font-sans">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-white/10 px-6 py-3.5">
                <div className="max-w-[1800px] mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push(`/${projectSlug}/retro`)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </button>
                        <span className="text-2xl">{periodConfig.icon}</span>
                        <div>
                            <h1 className="text-lg font-bold">{board.title}</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
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
                            className="border-gray-300 dark:border-gray-700 bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/50"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            {isPopulating ? 'Analyzing...' : 'AI Populate'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAIContent(!showAIContent)}
                            className={`border-gray-300 dark:border-gray-700 ${showAIContent ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'text-gray-600 dark:text-gray-400'}`}
                        >
                            🤖 AI {showAIContent ? 'ON' : 'OFF'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleGenerateSummary}
                            disabled={isGeneratingSummary}
                            className="border-gray-300 dark:border-gray-700 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/50"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            {isGeneratingSummary ? 'Generating...' : 'Generate Summary'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleShare}
                            className="border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                        >
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                        </Button>
                    </div>
                </div>

                {/* Team Happiness & Customer Sentiment - New Section */}
                <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-200 dark:border-white/10">
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">TEAM HAPPINESS</span>
                        <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                            {board.team_happiness?.toFixed(1) || 'N/A'}
                            <span className="text-[10px] text-gray-400 ml-0.5">/10</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">CUSTOMER SENTIMENT</span>
                        <span className="text-lg font-bold text-teal-600 dark:text-teal-400">
                            {board.customer_sentiment?.toFixed(2) || 'N/A'}
                            <span className="text-[10px] text-gray-400 ml-0.5">correlation</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-5 max-w-[1800px] mx-auto">
                {/* Template Selector - New Section */}
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold tracking-wide">TEMPLATE</span>
                        <TemplateSelector
                            templates={periodConfig.templates}
                            selected={selectedTemplate}
                            onSelect={setSelectedTemplate}
                        />
                    </div>
                    {selectedTemplate && getTemplateConfig(selectedTemplate) && (
                        <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
                            <Target className="w-3.5 h-3.5" />
                            <span className="font-medium">Focus:</span>
                            <span className="text-gray-600 dark:text-gray-400">
                                {getTemplateConfig(selectedTemplate)?.focusAreas.slice(0, 3).join(' • ')}
                            </span>
                        </div>
                    )}
                </div>

                {/* Template Info Banner */}
                {selectedTemplate && getTemplateConfig(selectedTemplate) && (
                    <div className="mb-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-500/30 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                            <Target className="w-4 h-4 text-purple-500 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-400">
                                    {getTemplateConfig(selectedTemplate)?.name} Template
                                </h4>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                    {getTemplateConfig(selectedTemplate)?.description}
                                </p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {getTemplateConfig(selectedTemplate)?.focusAreas.map((area, idx) => (
                                        <span
                                            key={idx}
                                            className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400"
                                        >
                                            {area}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-[1fr_320px] gap-4">
                    {/* Left Side - Kanban */}
                    <div>
                        {/* Metric Strip */}
                        <MetricStrip metrics={board.metrics} />

                        {/* AI Callout */}
                        {showAIContent && (
                            <div
                                className="bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/30 rounded-lg p-3 mb-4 text-xs text-teal-700 dark:text-teal-400"
                            >
                                💡 {getPeriodAICallout(board.period_type)}
                            </div>
                        )}

                        {/* Kanban Board */}
                        <RetroKanban
                            columns={board.columns}
                            showAIContent={showAIContent}
                            onAddCard={handleAddCard}
                            onDeleteCard={handleDeleteCard}
                            onVoteCard={handleVoteCard}
                            onCreateAction={(cardId: string, content: string) => handleAddAction(content, cardId)}
                            highlightedColumnKeys={selectedTemplate ? getTemplateConfig(selectedTemplate)?.columnHighlights : undefined}
                        />
                    </div>

                    {/* Right Side - Actions, Outcomes & Summary */}
                    <div className="space-y-4">
                        <ActionsPanel
                            actions={board.actions}
                            onUpdateStatus={handleUpdateActionStatus}
                            onAddAction={handleAddAction}
                            onDeleteAction={handleDeleteAction}
                        />

                        {/* Outcomes Timeline - New Component */}
                        {showAIContent && (
                            <OutcomesTimeline items={outcomeItems} showAI={showAIContent} />
                        )}

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
