/**
 * Public Launch Board View
 * Allows public access to shared launch boards without login
 */

import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { notFound } from 'next/navigation';
import { PublicLaunchView } from '@/components/launch/PublicLaunchView';

interface PageProps {
    params: Promise<{ token: string }>;
}

export default async function PublicLaunchPage({ params }: PageProps) {
    const { token } = await params;
    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
        notFound();
    }

    // Fetch board by share token
    const { data: board, error } = await supabase
        .from('launch_boards')
        .select(`
            *,
            dimensions:launch_dimensions(*),
            risks:launch_risks(*),
            votes:launch_votes(*),
            checklist_items:launch_checklist_items(*)
        `)
        .eq('share_token', token)
        .eq('is_public', true)
        .single();

    if (error || !board) {
        notFound();
    }

    return <PublicLaunchView board={board} />;
}
