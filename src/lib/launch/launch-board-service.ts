/**
 * Launch Board Service
 * CRUD operations and utility functions for Go/No-Go Dashboard
 */

import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import type {
    LaunchBoard,
    LaunchBoardWithDetails,
    LaunchDimension,
    LaunchRisk,
    LaunchVote,
    LaunchChecklistItem,
    DimensionType,
    CreateLaunchBoardRequest,
    UpdateLaunchBoardRequest,
    CreateRiskRequest,
    CastVoteRequest,
    AddStakeholderRequest,
    CreateChecklistItemRequest,
    calculateOverallScore,
} from '@/types/launch';
import { DIMENSION_CONFIG } from '@/types/launch';

// ============================================================================
// Board Operations
// ============================================================================

export async function createLaunchBoard(
    request: CreateLaunchBoardRequest,
    userId?: string
): Promise<LaunchBoard | null> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('launch_boards')
        .insert({
            project_id: request.project_id,
            title: request.title,
            description: request.description,
            target_date: request.target_date,
            feature_id: request.feature_id,
            created_by: userId,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating launch board:', error);
        return null;
    }

    // Initialize default dimensions
    if (data) {
        await initializeDefaultDimensions(data.id);
    }

    return data;
}

export async function getLaunchBoard(
    boardId: string
): Promise<LaunchBoardWithDetails | null> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return null;

    // Fetch board
    const { data: board, error: boardError } = await supabase
        .from('launch_boards')
        .select('*')
        .eq('id', boardId)
        .single();

    if (boardError || !board) {
        console.error('Error fetching launch board:', boardError);
        return null;
    }

    // Fetch related data in parallel
    const [dimensionsResult, risksResult, votesResult, checklistResult] = await Promise.all([
        supabase.from('launch_dimensions').select('*').eq('board_id', boardId),
        supabase.from('launch_risks').select('*').eq('board_id', boardId).order('created_at', { ascending: false }),
        supabase.from('launch_votes').select('*').eq('board_id', boardId),
        supabase.from('launch_checklist_items').select('*').eq('board_id', boardId).order('sort_order'),
    ]);

    return {
        ...board,
        dimensions: dimensionsResult.data || [],
        risks: risksResult.data || [],
        votes: votesResult.data || [],
        checklist_items: checklistResult.data || [],
    };
}

export async function getLaunchBoardsForProject(
    projectId: string
): Promise<LaunchBoard[]> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('launch_boards')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching launch boards:', error);
        return [];
    }

    return data || [];
}

export async function updateLaunchBoard(
    boardId: string,
    updates: UpdateLaunchBoardRequest
): Promise<LaunchBoard | null> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return null;

    const updateData: Record<string, unknown> = { ...updates };

    // Set decision timestamp if making a decision
    if (updates.decision && !updates.decision_at) {
        updateData.decision_at = new Date().toISOString();
    }

    const { data, error } = await supabase
        .from('launch_boards')
        .update(updateData)
        .eq('id', boardId)
        .select()
        .single();

    if (error) {
        console.error('Error updating launch board:', error);
        return null;
    }

    return data;
}

export async function deleteLaunchBoard(boardId: string): Promise<boolean> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return false;

    const { error } = await supabase
        .from('launch_boards')
        .delete()
        .eq('id', boardId);

    if (error) {
        console.error('Error deleting launch board:', error);
        return false;
    }

    return true;
}

// ============================================================================
// Dimension Operations
// ============================================================================

async function initializeDefaultDimensions(boardId: string): Promise<void> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return;

    const dimensionTypes: DimensionType[] = [
        'customer_readiness',
        'risk_assessment',
        'competitive_timing',
        'success_prediction',
    ];

    const dimensions = dimensionTypes.map(type => ({
        board_id: boardId,
        dimension_type: type,
        ai_insights: [],
        customer_quotes: [],
    }));

    await supabase.from('launch_dimensions').insert(dimensions);
}

export async function updateDimension(
    dimensionId: string,
    updates: Partial<LaunchDimension>
): Promise<LaunchDimension | null> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('launch_dimensions')
        .update(updates)
        .eq('id', dimensionId)
        .select()
        .single();

    if (error) {
        console.error('Error updating dimension:', error);
        return null;
    }

    // Recalculate overall score
    if (data && updates.ai_score !== undefined) {
        await recalculateOverallScore(data.board_id);
    }

    return data;
}

async function recalculateOverallScore(boardId: string): Promise<void> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return;

    const { data: dimensions } = await supabase
        .from('launch_dimensions')
        .select('ai_score')
        .eq('board_id', boardId);

    if (dimensions && dimensions.length > 0) {
        const overallScore = Math.round(
            dimensions.reduce((sum, d) => sum + (d.ai_score || 0), 0) / dimensions.length
        );

        await supabase
            .from('launch_boards')
            .update({ overall_score: overallScore })
            .eq('id', boardId);
    }
}

// ============================================================================
// Risk Operations
// ============================================================================

export async function addRisk(
    boardId: string,
    request: CreateRiskRequest
): Promise<LaunchRisk | null> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('launch_risks')
        .insert({
            board_id: boardId,
            ...request,
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding risk:', error);
        return null;
    }

    return data;
}

export async function updateRisk(
    riskId: string,
    updates: Partial<LaunchRisk>
): Promise<LaunchRisk | null> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('launch_risks')
        .update(updates)
        .eq('id', riskId)
        .select()
        .single();

    if (error) {
        console.error('Error updating risk:', error);
        return null;
    }

    return data;
}

export async function deleteRisk(riskId: string): Promise<boolean> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return false;

    const { error } = await supabase
        .from('launch_risks')
        .delete()
        .eq('id', riskId);

    return !error;
}

// ============================================================================
// Vote Operations
// ============================================================================

export async function addStakeholder(
    boardId: string,
    request: AddStakeholderRequest
): Promise<LaunchVote | null> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('launch_votes')
        .insert({
            board_id: boardId,
            ...request,
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding stakeholder:', error);
        return null;
    }

    return data;
}

export async function castVote(
    voteId: string,
    request: CastVoteRequest,
    userId?: string
): Promise<LaunchVote | null> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('launch_votes')
        .update({
            vote: request.vote,
            comment: request.comment,
            voted_at: new Date().toISOString(),
            user_id: userId,
        })
        .eq('id', voteId)
        .select()
        .single();

    if (error) {
        console.error('Error casting vote:', error);
        return null;
    }

    return data;
}

export async function removeStakeholder(voteId: string): Promise<boolean> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return false;

    const { error } = await supabase
        .from('launch_votes')
        .delete()
        .eq('id', voteId);

    return !error;
}

// ============================================================================
// Checklist Operations
// ============================================================================

export async function addChecklistItem(
    boardId: string,
    request: CreateChecklistItemRequest
): Promise<LaunchChecklistItem | null> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return null;

    // Get max sort order
    const { data: existing } = await supabase
        .from('launch_checklist_items')
        .select('sort_order')
        .eq('board_id', boardId)
        .order('sort_order', { ascending: false })
        .limit(1);

    const sortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

    const { data, error } = await supabase
        .from('launch_checklist_items')
        .insert({
            board_id: boardId,
            title: request.title,
            description: request.description,
            owner: request.owner,
            is_ai: false,
            sort_order: sortOrder,
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding checklist item:', error);
        return null;
    }

    return data;
}

export async function toggleChecklistItem(
    itemId: string,
    completed: boolean
): Promise<LaunchChecklistItem | null> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('launch_checklist_items')
        .update({
            completed,
            completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', itemId)
        .select()
        .single();

    if (error) {
        console.error('Error toggling checklist item:', error);
        return null;
    }

    return data;
}

export async function deleteChecklistItem(itemId: string): Promise<boolean> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return false;

    const { error } = await supabase
        .from('launch_checklist_items')
        .delete()
        .eq('id', itemId);

    return !error;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getChecklistProgress(items: LaunchChecklistItem[]): {
    completed: number;
    total: number;
    percentage: number;
} {
    const completed = items.filter(i => i.completed).length;
    const total = items.length;
    return {
        completed,
        total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
}

export function getOpenRisksCount(risks: LaunchRisk[]): number {
    return risks.filter(r => r.status === 'open').length;
}
