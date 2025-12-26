'use client';

/**
 * useRealtimeRetro Hook
 * Supabase Realtime subscription for retro board updates
 * Syncs cards, votes, comments, and actions across all users
 */

import { useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a supabase client for realtime only
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface RealtimeEvent {
    type: 'card_added' | 'card_updated' | 'card_deleted' | 'vote_updated' | 'comment_added' | 'action_updated';
    payload: Record<string, unknown>;
}

interface UseRealtimeRetroOptions {
    boardId: string;
    onCardAdded?: (card: Record<string, unknown>) => void;
    onCardUpdated?: (card: Record<string, unknown>) => void;
    onCardDeleted?: (cardId: string) => void;
    onVoteUpdated?: (cardId: string, newCount: number) => void;
    onCommentAdded?: (cardId: string, comment: Record<string, unknown>) => void;
    onActionUpdated?: (action: Record<string, unknown>) => void;
    onRefresh?: () => void;
}

export function useRealtimeRetro({
    boardId,
    onCardAdded,
    onCardUpdated,
    onCardDeleted,
    onVoteUpdated,
    onCommentAdded,
    onActionUpdated,
    onRefresh,
}: UseRealtimeRetroOptions) {

    useEffect(() => {
        if (!boardId) return;

        let channel: RealtimeChannel | null = null;

        const setupChannel = async () => {
            // Subscribe to the retro board channel
            channel = supabase
                .channel(`retro:${boardId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'retro_cards',
                    },
                    (payload) => {
                        console.log('Realtime: Card inserted', payload);
                        if (onCardAdded && payload.new) {
                            onCardAdded(payload.new as Record<string, unknown>);
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'retro_cards',
                    },
                    (payload) => {
                        console.log('Realtime: Card updated', payload);
                        if (payload.new) {
                            const newCard = payload.new as Record<string, unknown>;
                            // Check if it's a vote update
                            if (payload.old && (payload.old as Record<string, unknown>).vote_count !== newCard.vote_count) {
                                if (onVoteUpdated) {
                                    onVoteUpdated(newCard.id as string, newCard.vote_count as number);
                                }
                            } else if (onCardUpdated) {
                                onCardUpdated(newCard);
                            }
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'DELETE',
                        schema: 'public',
                        table: 'retro_cards',
                    },
                    (payload) => {
                        console.log('Realtime: Card deleted', payload);
                        if (onCardDeleted && payload.old) {
                            onCardDeleted((payload.old as Record<string, unknown>).id as string);
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'retro_card_comments',
                    },
                    (payload) => {
                        console.log('Realtime: Comment added', payload);
                        if (onCommentAdded && payload.new) {
                            const comment = payload.new as Record<string, unknown>;
                            onCommentAdded(comment.card_id as string, comment);
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'retro_actions',
                    },
                    (payload) => {
                        console.log('Realtime: Action updated', payload);
                        if (onActionUpdated && payload.new) {
                            onActionUpdated(payload.new as Record<string, unknown>);
                        }
                    }
                )
                .on('broadcast', { event: 'refresh' }, () => {
                    console.log('Realtime: Refresh requested');
                    if (onRefresh) {
                        onRefresh();
                    }
                })
                .subscribe((status) => {
                    console.log('Realtime subscription status:', status);
                });
        };

        setupChannel();

        return () => {
            if (channel) {
                console.log('Unsubscribing from realtime channel');
                supabase.removeChannel(channel);
            }
        };
    }, [boardId, onCardAdded, onCardUpdated, onCardDeleted, onVoteUpdated, onCommentAdded, onActionUpdated, onRefresh]);

    // Broadcast a refresh to all clients
    const broadcastRefresh = useCallback(() => {
        const channel = supabase.channel(`retro:${boardId}`);
        channel.send({
            type: 'broadcast',
            event: 'refresh',
            payload: {},
        });
    }, [boardId]);

    return { broadcastRefresh };
}

export default useRealtimeRetro;
