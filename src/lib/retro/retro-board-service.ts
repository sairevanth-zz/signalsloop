/**
 * Retro Board Service
 * CRUD operations and utility functions for Retrospective Tool
 */

import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import type {
    RetroBoard,
    RetroBoardWithDetails,
    RetroColumn,
    RetroCard,
    RetroAction,
    RetroPeriod,
    CreateRetroBoardRequest,
    UpdateRetroBoardRequest,
    CreateRetroCardRequest,
    CreateRetroActionRequest,
    UpdateRetroActionRequest,
    ActionStatus,
} from '@/types/retro';
import { PERIOD_CONFIGS, getDefaultColumnsForPeriod } from '@/types/retro';

// ============================================================================
// Board Operations
// ============================================================================

export async function createRetroBoard(
    request: CreateRetroBoardRequest,
    userId?: string
): Promise<RetroBoard | null> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return null;

    // Create board
    const { data: board, error } = await supabase
        .from('retro_boards')
        .insert({
            project_id: request.project_id,
            title: request.title,
            period_type: request.period_type,
            template: request.template,
            start_date: request.start_date,
            end_date: request.end_date,
            metrics: [],
            created_by: userId,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating retro board:', error);
        return null;
    }

    // Initialize default columns
    if (board) {
        await initializeDefaultColumns(board.id, request.period_type);
    }

    return board;
}

async function initializeDefaultColumns(
    boardId: string,
    periodType: RetroPeriod
): Promise<void> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return;

    const defaultColumns = getDefaultColumnsForPeriod(periodType);
    const columns = defaultColumns.map((col, index) => ({
        board_id: boardId,
        column_key: col.key,
        title: col.title,
        emoji: col.emoji,
        color: col.color,
        sort_order: index,
    }));

    await supabase.from('retro_columns').insert(columns);
}

export async function getRetroBoard(
    boardId: string
): Promise<RetroBoardWithDetails | null> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return null;

    // Fetch board
    const { data: board, error: boardError } = await supabase
        .from('retro_boards')
        .select('*')
        .eq('id', boardId)
        .single();

    if (boardError || !board) {
        console.error('Error fetching retro board:', boardError);
        return null;
    }

    // Fetch columns with cards
    const { data: columns } = await supabase
        .from('retro_columns')
        .select('*')
        .eq('board_id', boardId)
        .order('sort_order');

    // Fetch cards for all columns
    const columnIds = (columns || []).map(c => c.id);
    const { data: cards } = await supabase
        .from('retro_cards')
        .select('*')
        .in('column_id', columnIds)
        .order('created_at', { ascending: false });

    // Fetch actions
    const { data: actions } = await supabase
        .from('retro_actions')
        .select('*')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false });

    // Build columns with cards
    const columnsWithCards = (columns || []).map(column => ({
        ...column,
        cards: (cards || []).filter(card => card.column_id === column.id),
    }));

    return {
        ...board,
        columns: columnsWithCards,
        actions: actions || [],
    };
}

export async function getRetroBoardsForProject(
    projectId: string
): Promise<RetroBoard[]> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('retro_boards')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching retro boards:', error);
        return [];
    }

    return data || [];
}

export async function updateRetroBoard(
    boardId: string,
    updates: UpdateRetroBoardRequest
): Promise<RetroBoard | null> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('retro_boards')
        .update(updates)
        .eq('id', boardId)
        .select()
        .single();

    if (error) {
        console.error('Error updating retro board:', error);
        return null;
    }

    return data;
}

export async function deleteRetroBoard(boardId: string): Promise<boolean> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return false;

    const { error } = await supabase
        .from('retro_boards')
        .delete()
        .eq('id', boardId);

    return !error;
}

// ============================================================================
// Card Operations
// ============================================================================

export async function addCard(
    request: CreateRetroCardRequest,
    userId?: string
): Promise<RetroCard | null> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('retro_cards')
        .insert({
            column_id: request.column_id,
            content: request.content,
            is_ai: request.is_ai || false,
            source: request.source,
            data_badge: request.data_badge,
            is_success: request.is_success || false,
            is_alert: request.is_alert || false,
            vote_count: 0,
            created_by: userId,
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding card:', error);
        return null;
    }

    return data;
}

export async function updateCard(
    cardId: string,
    updates: Partial<RetroCard>
): Promise<RetroCard | null> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('retro_cards')
        .update(updates)
        .eq('id', cardId)
        .select()
        .single();

    if (error) {
        console.error('Error updating card:', error);
        return null;
    }

    return data;
}

export async function deleteCard(cardId: string): Promise<boolean> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return false;

    const { error } = await supabase
        .from('retro_cards')
        .delete()
        .eq('id', cardId);

    return !error;
}

// ============================================================================
// Vote Operations
// ============================================================================

export async function toggleCardVote(
    cardId: string,
    userId: string
): Promise<{ voted: boolean; newCount: number }> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return { voted: false, newCount: 0 };

    // Check if vote exists
    const { data: existingVote } = await supabase
        .from('retro_card_votes')
        .select('id')
        .eq('card_id', cardId)
        .eq('user_id', userId)
        .single();

    if (existingVote) {
        // Remove vote
        await supabase
            .from('retro_card_votes')
            .delete()
            .eq('id', existingVote.id);
    } else {
        // Add vote
        await supabase
            .from('retro_card_votes')
            .insert({ card_id: cardId, user_id: userId });
    }

    // Get updated count
    const { data: card } = await supabase
        .from('retro_cards')
        .select('vote_count')
        .eq('id', cardId)
        .single();

    return {
        voted: !existingVote,
        newCount: card?.vote_count || 0,
    };
}

// ============================================================================
// Action Operations
// ============================================================================

export async function addAction(
    boardId: string,
    request: CreateRetroActionRequest
): Promise<RetroAction | null> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('retro_actions')
        .insert({
            board_id: boardId,
            title: request.title,
            description: request.description,
            owner: request.owner,
            due_date: request.due_date,
            from_card_id: request.from_card_id,
            from_source: request.from_source,
            status: 'not_started',
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding action:', error);
        return null;
    }

    return data;
}

export async function updateAction(
    actionId: string,
    updates: UpdateRetroActionRequest
): Promise<RetroAction | null> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return null;

    const updateData: Record<string, unknown> = { ...updates };

    // Set completed timestamp
    if (updates.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
    } else if (updates.status) {
        updateData.completed_at = null;
    }

    const { data, error } = await supabase
        .from('retro_actions')
        .update(updateData)
        .eq('id', actionId)
        .select()
        .single();

    if (error) {
        console.error('Error updating action:', error);
        return null;
    }

    return data;
}

export async function deleteAction(actionId: string): Promise<boolean> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return false;

    const { error } = await supabase
        .from('retro_actions')
        .delete()
        .eq('id', actionId);

    return !error;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getOpenActionsCount(actions: RetroAction[]): number {
    return actions.filter(a => a.status !== 'completed').length;
}
