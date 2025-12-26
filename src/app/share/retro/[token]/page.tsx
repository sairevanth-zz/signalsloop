/**
 * Public Retrospective View
 * Allows public access to shared retro boards without login
 * Includes collaborative features: add, edit, vote, comment
 */

import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { notFound } from 'next/navigation';
import { PublicRetroView } from '@/components/retro/PublicRetroView';

interface PageProps {
    params: Promise<{ token: string }>;
}

export default async function PublicRetroPage({ params }: PageProps) {
    const { token } = await params;
    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
        notFound();
    }

    // Fetch board by share token
    const { data: board, error } = await supabase
        .from('retro_boards')
        .select(`
            *,
            columns:retro_columns(
                *,
                cards:retro_cards(*)
            ),
            actions:retro_actions(*)
        `)
        .eq('share_token', token)
        .eq('is_public', true)
        .single();

    if (error || !board) {
        notFound();
    }

    // Fetch comments for all cards
    const allCardIds: string[] = [];
    board.columns?.forEach((col: { cards?: { id: string }[] }) => {
        col.cards?.forEach((card: { id: string }) => {
            allCardIds.push(card.id);
        });
    });

    let comments: { id: string; card_id: string; text: string; author: string }[] = [];
    if (allCardIds.length > 0) {
        const { data: fetchedComments } = await supabase
            .from('retro_card_comments')
            .select('*')
            .in('card_id', allCardIds)
            .order('created_at', { ascending: true });
        comments = fetchedComments || [];
    }

    // Attach comments to cards
    const boardWithComments = {
        ...board,
        columns: board.columns?.map((col: { cards?: { id: string }[] }) => ({
            ...col,
            cards: col.cards?.map((card: { id: string }) => ({
                ...card,
                comments: comments
                    .filter((c) => c.card_id === card.id)
                    .map((c) => ({ id: c.id, text: c.text, author: c.author })),
            })),
        })),
    };

    return <PublicRetroView board={boardWithComments} token={token} />;
}

