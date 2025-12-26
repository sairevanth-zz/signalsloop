'use client';

/**
 * Retro Kanban Component
 * Dynamic columns with cards, voting, and actions
 */

import React, { useState } from 'react';
import { Plus, ThumbsUp, ArrowRight, Zap, Trash2, Sparkles, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { RetroColumnWithCards, RetroCard } from '@/types/retro';

interface RetroKanbanProps {
    columns: RetroColumnWithCards[];
    showAIContent: boolean;
    onAddCard: (columnId: string, content: string) => void;
    onDeleteCard?: (cardId: string, columnId: string) => void;
    onVoteCard: (cardId: string) => void;
    onCreateAction: (cardId: string, content: string) => void;
    highlightedColumnKeys?: string[]; // Column keys to highlight based on selected template
}

export function RetroKanban({ columns, showAIContent, onAddCard, onDeleteCard, onVoteCard, onCreateAction, highlightedColumnKeys }: RetroKanbanProps) {
    const [addingTo, setAddingTo] = useState<string | null>(null);
    const [newContent, setNewContent] = useState('');

    const handleAdd = (columnId: string) => {
        if (newContent.trim()) {
            onAddCard(columnId, newContent.trim());
            setNewContent('');
            setAddingTo(null);
        }
    };

    const getColumnColor = (color?: string): string => {
        switch (color) {
            case 'green': return 'border-green-500/50';
            case 'red': return 'border-red-500/50';
            case 'blue': return 'border-blue-500/50';
            case 'purple': return 'border-purple-500/50';
            case 'amber': return 'border-amber-500/50';
            default: return 'border-gray-500/50';
        }
    };

    const getHeaderColor = (color?: string): string => {
        switch (color) {
            case 'green': return 'text-green-600 dark:text-green-400';
            case 'red': return 'text-red-600 dark:text-red-400';
            case 'blue': return 'text-blue-600 dark:text-blue-400';
            case 'purple': return 'text-purple-600 dark:text-purple-400';
            case 'amber': return 'text-amber-600 dark:text-amber-400';
            default: return 'text-gray-600 dark:text-gray-400';
        }
    };

    const isHighlighted = (columnKey: string): boolean => {
        if (!highlightedColumnKeys || highlightedColumnKeys.length === 0) return false;
        return highlightedColumnKeys.includes(columnKey);
    };

    return (
        <div className="grid grid-cols-4 gap-3">
            {columns.map((column) => (
                <div
                    key={column.id}
                    className={cn(
                        'bg-white dark:bg-slate-800 rounded-xl border-t-2 min-h-[300px] transition-all',
                        getColumnColor(column.color),
                        isHighlighted(column.column_key) && 'ring-2 ring-purple-400 dark:ring-purple-500 ring-offset-2 dark:ring-offset-slate-900 shadow-lg shadow-purple-500/10'
                    )}
                >
                    {/* Column Header */}
                    <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-1.5">
                            <span>{column.emoji}</span>
                            <h3 className={cn('text-sm font-semibold', getHeaderColor(column.color))}>
                                {column.title}
                            </h3>
                            <span className="text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">
                                {column.cards.length}
                            </span>
                            {isHighlighted(column.column_key) && (
                                <span className="flex items-center gap-0.5 text-[9px] text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded-full">
                                    <Sparkles className="w-2.5 h-2.5" /> Focus
                                </span>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAddingTo(addingTo === column.id ? null : column.id)}
                            className="h-6 w-6 p-0 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Add Card Form */}
                    {addingTo === column.id && (
                        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                            <Input
                                value={newContent}
                                onChange={(e) => setNewContent(e.target.value)}
                                placeholder="Add a card..."
                                className="text-xs bg-gray-50 dark:bg-slate-900 border-gray-300 dark:border-gray-700 mb-2"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleAdd(column.id)}
                            />
                            <div className="flex gap-1">
                                <Button size="sm" className="h-6 text-xs" onClick={() => handleAdd(column.id)}>
                                    Add
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-xs"
                                    onClick={() => {
                                        setAddingTo(null);
                                        setNewContent('');
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Cards */}
                    <div className="p-2 space-y-2">
                        {column.cards.length === 0 ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">No cards yet</p>
                        ) : (
                            column.cards.map((card) => (
                                <CardItem
                                    key={card.id}
                                    card={card}
                                    columnId={column.id}
                                    showAIContent={showAIContent}
                                    onVote={() => onVoteCard(card.id)}
                                    onDelete={onDeleteCard ? () => onDeleteCard(card.id, column.id) : undefined}
                                    onCreateAction={(content) => onCreateAction(card.id, content)}
                                />
                            ))
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

interface CardItemProps {
    card: RetroCard;
    columnId: string;
    showAIContent: boolean;
    onVote: () => void;
    onDelete?: () => void;
    onCreateAction: (content: string) => void;
}

function CardItem({ card, columnId, showAIContent, onVote, onDelete, onCreateAction }: CardItemProps) {
    const [showActions, setShowActions] = useState(false);

    if (card.is_ai && !showAIContent) {
        return null;
    }

    return (
        <div
            className={cn(
                'p-2 rounded-lg border transition-colors group',
                'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-gray-700',
                'hover:border-gray-300 dark:hover:border-gray-600',
                card.is_success && 'border-l-2 border-l-green-500',
                card.is_alert && 'border-l-2 border-l-red-500'
            )}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <p className="text-xs text-gray-800 dark:text-gray-200 mb-1.5">{card.content}</p>

            {/* Data Badge */}
            {card.data_badge && (
                <span className={cn(
                    'inline-block text-[10px] px-1.5 py-0.5 rounded mb-1.5 font-medium',
                    card.is_success && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
                    card.is_alert && 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
                    !card.is_success && !card.is_alert && 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                )}>
                    {card.data_badge}
                </span>
            )}

            {/* Footer */}
            <div className="flex justify-between items-center mt-1">
                <div className="flex items-center gap-2">
                    {card.is_ai && (
                        <span className="text-[9px] text-teal-600 dark:text-teal-400 flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5" /> {card.source || 'AI'}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {/* Vote button */}
                    <button
                        onClick={onVote}
                        className="flex items-center gap-0.5 text-[10px] text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                    >
                        <ThumbsUp className="w-3 h-3" />
                        <span>{card.vote_count}</span>
                    </button>

                    {/* Comment count */}
                    {card.comments && card.comments.length > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-purple-500 dark:text-purple-400">
                            <MessageSquare className="w-3 h-3" />
                            <span>{card.comments.length}</span>
                        </span>
                    )}

                    {/* Action buttons (shown on hover) */}
                    {showActions && (
                        <>
                            <button
                                onClick={() => onCreateAction(card.content)}
                                className="p-1 text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors"
                                title="Create action"
                            >
                                <ArrowRight className="w-3 h-3" />
                            </button>
                            {onDelete && (
                                <button
                                    onClick={onDelete}
                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Delete card"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Comments Section */}
            {card.comments && card.comments.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
                    {card.comments.map((comment: { id: string; text: string; author: string }) => (
                        <div key={comment.id} className="text-[10px] bg-white dark:bg-slate-800 rounded px-2 py-1">
                            <span className="font-medium text-purple-600 dark:text-purple-400">{comment.author}:</span>
                            <span className="text-gray-600 dark:text-gray-300 ml-1">{comment.text}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default RetroKanban;

