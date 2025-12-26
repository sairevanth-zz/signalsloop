'use client';

/**
 * Public Retrospective View Component
 * Collaborative public view for shared retrospectives
 * Allows: add cards, vote, comment without login
 * Real-time sync via Supabase Realtime
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Plus, ThumbsUp, MessageSquare, Send, Calendar, Users, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { PERIOD_CONFIGS } from '@/types/retro';
import { useRealtimeRetro } from '@/hooks/useRealtimeRetro';
import type { RetroBoardWithDetails, RetroCard } from '@/types/retro';

interface PublicRetroViewProps {
    board: RetroBoardWithDetails;
    token: string;
}

export function PublicRetroView({ board: initialBoard, token }: PublicRetroViewProps) {
    const [board, setBoard] = useState(initialBoard);
    const [newCardContent, setNewCardContent] = useState<Record<string, string>>({});
    const [showComments, setShowComments] = useState<Record<string, boolean>>({});
    const [newComment, setNewComment] = useState<Record<string, string>>({});
    const [participantName, setParticipantName] = useState('');
    const [showNamePrompt, setShowNamePrompt] = useState(true);
    const [isConnected, setIsConnected] = useState(false);

    const periodConfig = PERIOD_CONFIGS[board.period_type];

    // Real-time handlers
    const handleRealtimeCardAdded = useCallback((card: Record<string, unknown>) => {
        setBoard(prev => {
            const columnId = card.column_id as string;
            // Avoid duplicates
            const columnCards = prev.columns.find(c => c.id === columnId)?.cards || [];
            if (columnCards.some(c => c.id === card.id)) return prev;

            return {
                ...prev,
                columns: prev.columns.map(col =>
                    col.id === columnId
                        ? { ...col, cards: [card as unknown as RetroCard, ...col.cards] }
                        : col
                ),
            };
        });
        toast.success('New card added by collaborator', { duration: 2000 });
    }, []);

    const handleRealtimeVoteUpdated = useCallback((cardId: string, newCount: number) => {
        setBoard(prev => ({
            ...prev,
            columns: prev.columns.map(col => ({
                ...col,
                cards: col.cards.map(card =>
                    card.id === cardId
                        ? { ...card, vote_count: newCount }
                        : card
                ),
            })),
        }));
    }, []);

    const handleRealtimeCommentAdded = useCallback((cardId: string, comment: Record<string, unknown>) => {
        setBoard(prev => ({
            ...prev,
            columns: prev.columns.map(col => ({
                ...col,
                cards: col.cards.map(card =>
                    card.id === cardId
                        ? {
                            ...card,
                            comments: [...(card.comments || []), {
                                id: comment.id as string,
                                text: comment.text as string,
                                author: comment.author as string,
                            }],
                        }
                        : card
                ),
            })),
        }));
        toast.info('New comment added', { duration: 2000 });
    }, []);

    const handleRealtimeCardDeleted = useCallback((cardId: string) => {
        setBoard(prev => ({
            ...prev,
            columns: prev.columns.map(col => ({
                ...col,
                cards: col.cards.filter(card => card.id !== cardId),
            })),
        }));
    }, []);

    // Connect to realtime
    useRealtimeRetro({
        boardId: board.id,
        onCardAdded: handleRealtimeCardAdded,
        onVoteUpdated: handleRealtimeVoteUpdated,
        onCommentAdded: handleRealtimeCommentAdded,
        onCardDeleted: handleRealtimeCardDeleted,
    });

    // Show connected status
    useEffect(() => {
        setIsConnected(true);
    }, []);

    // Add a card
    const handleAddCard = async (columnId: string) => {
        const content = newCardContent[columnId];
        if (!content?.trim()) return;

        try {
            const response = await fetch(`/api/share/retro/${token}/cards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    column_id: columnId,
                    content: content.trim(),
                    participant_name: participantName || 'Anonymous',
                }),
            });

            if (!response.ok) throw new Error('Failed to add card');
            const data = await response.json();

            setBoard(prev => ({
                ...prev,
                columns: prev.columns.map(col =>
                    col.id === columnId
                        ? { ...col, cards: [data.card, ...col.cards] }
                        : col
                ),
            }));

            setNewCardContent(prev => ({ ...prev, [columnId]: '' }));
        } catch (error) {
            console.error('Failed to add card:', error);
        }
    };

    // Vote on a card
    const handleVote = async (cardId: string, columnId: string) => {
        try {
            const response = await fetch(`/api/share/retro/${token}/votes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cardId }),
            });

            if (!response.ok) throw new Error('Failed to vote');
            const data = await response.json();

            setBoard(prev => ({
                ...prev,
                columns: prev.columns.map(col =>
                    col.id === columnId
                        ? {
                            ...col,
                            cards: col.cards.map(card =>
                                card.id === cardId
                                    ? { ...card, vote_count: data.newCount }
                                    : card
                            ),
                        }
                        : col
                ),
            }));
        } catch (error) {
            console.error('Failed to vote:', error);
        }
    };

    // Add a comment
    const handleAddComment = async (cardId: string, columnId: string) => {
        const comment = newComment[cardId];
        if (!comment?.trim()) return;

        try {
            const response = await fetch(`/api/share/retro/${token}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cardId,
                    comment: comment.trim(),
                    participant_name: participantName || 'Anonymous',
                }),
            });

            if (!response.ok) throw new Error('Failed to add comment');
            const data = await response.json();

            setBoard(prev => ({
                ...prev,
                columns: prev.columns.map(col =>
                    col.id === columnId
                        ? {
                            ...col,
                            cards: col.cards.map(card =>
                                card.id === cardId
                                    ? { ...card, comments: [...(card.comments || []), data.comment] }
                                    : card
                            ),
                        }
                        : col
                ),
            }));

            setNewComment(prev => ({ ...prev, [cardId]: '' }));
        } catch (error) {
            console.error('Failed to add comment:', error);
        }
    };

    // Participant name prompt
    if (showNamePrompt) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-8 max-w-md w-full border border-gray-200 dark:border-white/10 shadow-lg">
                    <div className="text-center mb-6">
                        <span className="text-4xl mb-4 block">{periodConfig.icon}</span>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{board.title}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Join the retrospective collaboration
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Your Name (optional)
                            </label>
                            <Input
                                value={participantName}
                                onChange={(e) => setParticipantName(e.target.value)}
                                placeholder="Enter your name"
                                className="bg-gray-50 dark:bg-slate-900"
                            />
                        </div>
                        <Button
                            onClick={() => setShowNamePrompt(false)}
                            className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                            <Users className="w-4 h-4 mr-2" />
                            Join Retrospective
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-white/10 px-6 py-4">
                <div className="max-w-[1600px] mx-auto">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{periodConfig.icon}</span>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 dark:text-white">{board.title}</h1>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <Calendar className="w-3 h-3" />
                                {new Date(board.start_date).toLocaleDateString()} - {new Date(board.end_date).toLocaleDateString()}
                                <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400">
                                    {periodConfig.label}
                                </span>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Collaborating as: <span className="font-medium text-purple-600 dark:text-purple-400">{participantName || 'Anonymous'}</span>
                    </p>
                </div>
            </div>

            {/* Main Content - Kanban */}
            <div className="p-6 max-w-[1600px] mx-auto">
                <div className="grid grid-cols-4 gap-4">
                    {board.columns.map((column) => (
                        <div key={column.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-white/10">
                            {/* Column Header */}
                            <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span>{column.emoji}</span>
                                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{column.title}</h3>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                            {column.cards.length}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Add Card Form */}
                            <div className="p-3 border-b border-gray-100 dark:border-white/5">
                                <div className="flex gap-2">
                                    <Input
                                        value={newCardContent[column.id] || ''}
                                        onChange={(e) => setNewCardContent(prev => ({
                                            ...prev,
                                            [column.id]: e.target.value,
                                        }))}
                                        placeholder="Add a card..."
                                        className="text-xs bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-gray-700"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddCard(column.id)}
                                    />
                                    <Button
                                        size="sm"
                                        onClick={() => handleAddCard(column.id)}
                                        className="bg-purple-600 hover:bg-purple-700"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Cards */}
                            <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
                                {column.cards.length === 0 ? (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">
                                        No cards yet
                                    </p>
                                ) : (
                                    column.cards.map((card: RetroCard & { comments?: Array<{ id: string; text: string; author: string }> }) => (
                                        <div
                                            key={card.id}
                                            className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3 border border-gray-200 dark:border-white/5"
                                        >
                                            {card.is_ai && (
                                                <span className="text-[9px] text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/30 px-1.5 py-0.5 rounded mb-1 inline-block">
                                                    🤖 AI Generated
                                                </span>
                                            )}
                                            <p className="text-sm text-gray-900 dark:text-white mb-2">
                                                {card.content}
                                            </p>
                                            {card.data_badge && (
                                                <span className="text-[9px] text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded mb-2 inline-block">
                                                    {card.data_badge}
                                                </span>
                                            )}

                                            {/* Card Actions */}
                                            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-200 dark:border-white/5">
                                                <button
                                                    onClick={() => handleVote(card.id, column.id)}
                                                    className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                                >
                                                    <ThumbsUp className="w-3.5 h-3.5" />
                                                    <span>{card.vote_count || 0}</span>
                                                </button>
                                                <button
                                                    onClick={() => setShowComments(prev => ({
                                                        ...prev,
                                                        [card.id]: !prev[card.id],
                                                    }))}
                                                    className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                                >
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                    <span>{card.comments?.length || 0}</span>
                                                </button>
                                            </div>

                                            {/* Comments Section */}
                                            {showComments[card.id] && (
                                                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-white/5">
                                                    {/* Existing Comments */}
                                                    {card.comments && card.comments.length > 0 && (
                                                        <div className="space-y-2 mb-2">
                                                            {card.comments.map((comment) => (
                                                                <div key={comment.id} className="text-xs bg-white dark:bg-slate-800 rounded p-2">
                                                                    <span className="font-medium text-purple-600 dark:text-purple-400">{comment.author}:</span>
                                                                    <span className="text-gray-700 dark:text-gray-300 ml-1">{comment.text}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* Add Comment */}
                                                    <div className="flex gap-1">
                                                        <Input
                                                            value={newComment[card.id] || ''}
                                                            onChange={(e) => setNewComment(prev => ({
                                                                ...prev,
                                                                [card.id]: e.target.value,
                                                            }))}
                                                            placeholder="Add a comment..."
                                                            className="text-xs h-7 bg-white dark:bg-slate-800"
                                                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment(card.id, column.id)}
                                                        />
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleAddComment(card.id, column.id)}
                                                            className="h-7 px-2 bg-purple-600 hover:bg-purple-700"
                                                        >
                                                            <Send className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-white/10 py-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Powered by <span className="font-semibold text-purple-600 dark:text-purple-400">SignalsLoop</span> • Collaborative Retrospective
                </p>
            </div>
        </div>
    );
}

export default PublicRetroView;
