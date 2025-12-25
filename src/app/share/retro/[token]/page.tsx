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

    return <PublicRetroView board={board} token={token} />;
}
