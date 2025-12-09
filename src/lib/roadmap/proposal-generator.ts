/**
 * Proposal Generator for Self-Correcting Roadmaps
 * 
 * Generates specific priority change proposals based on detected triggers.
 * Uses GPT-4o for strategic analysis.
 */

import { getOpenAI } from '@/lib/openai-client';
import { getServiceRoleClient } from '@/lib/supabase-singleton';
import type {
    AdjustmentTrigger,
    AdjustmentProposal,
    PriorityChange,
    ProposalGenerationInput,
    ProposalGenerationResult,
    RoadmapAdjustmentProposalRow
} from '@/types/roadmap-adjustments';
import {
    PROPOSAL_GENERATION_SYSTEM_PROMPT,
    buildProposalGenerationUserPrompt
} from './prompts/adjustment-prompts';

const MODEL = 'gpt-4o'; // Use full model for strategic decisions

/**
 * Generate a proposal for a detected trigger
 */
export async function generateAdjustmentProposal(
    projectId: string,
    trigger: AdjustmentTrigger
): Promise<Omit<RoadmapAdjustmentProposalRow, 'id' | 'created_at' | 'updated_at'>> {
    console.log(`[ProposalGen] Generating proposal for ${trigger.type} trigger: ${trigger.themeName}`);

    // Get current roadmap for context
    const currentRoadmap = await getCurrentRoadmapContext(projectId);

    const input: ProposalGenerationInput = {
        projectId,
        trigger,
        currentRoadmap
    };

    // Generate proposal with AI
    const result = await generateProposalWithAI(input);

    // Map proposal changes to priority changes with IDs
    const proposedChanges: PriorityChange[] = result.changes.map(c => {
        const roadmapItem = currentRoadmap.find(r =>
            r.themeName.toLowerCase() === c.theme_name.toLowerCase() ||
            r.suggestionId === c.suggestion_id
        );

        return {
            suggestionId: roadmapItem?.suggestionId || c.suggestion_id,
            themeId: roadmapItem?.themeId || '',
            themeName: c.theme_name,
            oldPriority: c.old_priority,
            newPriority: c.new_priority,
            oldScore: roadmapItem?.priorityScore || 0,
            newScore: calculateNewScore(c.old_priority, c.new_priority, roadmapItem?.priorityScore || 50),
            reasoning: c.reasoning,
            impactIfIgnored: c.impact_if_ignored
        };
    });

    return {
        project_id: projectId,
        trigger_type: trigger.type,
        trigger_severity: trigger.severity,
        trigger_description: trigger.description,
        trigger_data: {
            themeId: trigger.themeId,
            themeName: trigger.themeName,
            dataPoints: trigger.dataPoints,
            detectedAt: trigger.detectedAt.toISOString()
        },
        status: 'pending',
        proposed_changes: proposedChanges,
        ai_reasoning: result.summary,
        confidence_score: result.confidence,
        reviewed_by: null,
        reviewed_at: null,
        review_notes: null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };
}

/**
 * Get current roadmap context for proposal generation
 */
async function getCurrentRoadmapContext(projectId: string) {
    const supabase = getServiceRoleClient();

    const { data: suggestions } = await supabase
        .from('roadmap_suggestions')
        .select(`
      id,
      theme_id,
      priority_level,
      priority_score,
      themes (
        id,
        theme_name,
        frequency,
        avg_sentiment
      )
    `)
        .eq('project_id', projectId)
        .order('priority_score', { ascending: false });

    return (suggestions || []).map(s => {
        const theme = s.themes as any;
        return {
            suggestionId: s.id,
            themeId: s.theme_id,
            themeName: theme?.theme_name || 'Unknown',
            priorityLevel: s.priority_level,
            priorityScore: s.priority_score,
            frequency: theme?.frequency || 0,
            avgSentiment: theme?.avg_sentiment || 0
        };
    });
}

/**
 * Generate proposal using AI
 */
async function generateProposalWithAI(
    input: ProposalGenerationInput
): Promise<ProposalGenerationResult> {
    const userPrompt = buildProposalGenerationUserPrompt(input);

    try {
        const response = await getOpenAI().chat.completions.create({
            model: MODEL,
            messages: [
                { role: 'system', content: PROPOSAL_GENERATION_SYSTEM_PROMPT },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.3,
            max_tokens: 2000,
            response_format: { type: 'json_object' }
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from AI');
        }

        const parsed = JSON.parse(content);

        return {
            title: parsed.title || 'Roadmap Adjustment Proposal',
            summary: parsed.summary || '',
            changes: parsed.changes || [],
            confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
            urgency: parsed.urgency || 'within_week'
        };
    } catch (error) {
        console.error('[ProposalGen] Error generating proposal:', error);

        // Fallback: create a basic proposal
        return {
            title: `Adjust priority for ${input.trigger.themeName}`,
            summary: `Based on ${input.trigger.type}: ${input.trigger.description}`,
            changes: [{
                suggestion_id: input.currentRoadmap.find(r => r.themeId === input.trigger.themeId)?.suggestionId || '',
                theme_name: input.trigger.themeName,
                old_priority: input.currentRoadmap.find(r => r.themeId === input.trigger.themeId)?.priorityLevel || 'P2',
                new_priority: input.trigger.severity === 'critical' ? 'P0' : input.trigger.severity === 'high' ? 'P1' : 'P2',
                reasoning: input.trigger.recommendedAction,
                impact_if_ignored: 'Potential negative impact on user satisfaction'
            }],
            confidence: 0.5,
            urgency: input.trigger.severity === 'critical' ? 'immediate' : 'within_week'
        };
    }
}

/**
 * Calculate new score based on priority change
 */
function calculateNewScore(oldPriority: string, newPriority: string, currentScore: number): number {
    const priorityScores: Record<string, number> = {
        'P0': 85,
        'P1': 70,
        'P2': 50,
        'P3': 30
    };

    const oldBase = priorityScores[oldPriority] || 50;
    const newBase = priorityScores[newPriority] || 50;

    // Adjust current score proportionally
    const adjustment = newBase - oldBase;
    return Math.min(100, Math.max(0, currentScore + adjustment));
}

/**
 * Apply approved proposal changes to the roadmap
 */
export async function applyProposalChanges(
    proposalId: string,
    userId: string,
    notes?: string
): Promise<{ success: boolean; appliedChanges: PriorityChange[]; historyIds: string[] }> {
    const supabase = getServiceRoleClient();

    // 1. Get the proposal
    const { data: proposal, error: fetchError } = await supabase
        .from('roadmap_adjustment_proposals')
        .select('*')
        .eq('id', proposalId)
        .single();

    if (fetchError || !proposal) {
        throw new Error(`Proposal not found: ${proposalId}`);
    }

    if (proposal.status !== 'pending') {
        throw new Error(`Proposal is not pending: ${proposal.status}`);
    }

    const changes = proposal.proposed_changes as PriorityChange[];
    const historyIds: string[] = [];

    // 2. Apply each change
    for (const change of changes) {
        // Update roadmap_suggestions
        const { error: updateError } = await supabase
            .from('roadmap_suggestions')
            .update({
                priority_level: change.newPriority,
                priority_score: change.newScore,
                updated_at: new Date().toISOString()
            })
            .eq('id', change.suggestionId);

        if (updateError) {
            console.error(`Failed to update suggestion ${change.suggestionId}:`, updateError);
            continue;
        }

        // 3. Record in history
        const { data: historyRecord, error: historyError } = await supabase
            .from('roadmap_adjustment_history')
            .insert({
                proposal_id: proposalId,
                project_id: proposal.project_id,
                suggestion_id: change.suggestionId,
                theme_name: change.themeName,
                old_priority: change.oldPriority,
                new_priority: change.newPriority,
                old_score: change.oldScore,
                new_score: change.newScore
            })
            .select('id')
            .single();

        if (!historyError && historyRecord) {
            historyIds.push(historyRecord.id);
        }
    }

    // 4. Mark proposal as approved
    await supabase
        .from('roadmap_adjustment_proposals')
        .update({
            status: 'approved',
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
            review_notes: notes || null
        })
        .eq('id', proposalId);

    console.log(`[ProposalGen] Applied ${changes.length} changes from proposal ${proposalId}`);

    return {
        success: true,
        appliedChanges: changes,
        historyIds
    };
}

/**
 * Reject a proposal
 */
export async function rejectProposal(
    proposalId: string,
    userId: string,
    notes?: string
): Promise<void> {
    const supabase = getServiceRoleClient();

    await supabase
        .from('roadmap_adjustment_proposals')
        .update({
            status: 'rejected',
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
            review_notes: notes || null
        })
        .eq('id', proposalId);

    console.log(`[ProposalGen] Rejected proposal ${proposalId}`);
}

/**
 * Get pending proposals for a project
 */
export async function getPendingProposals(projectId: string): Promise<AdjustmentProposal[]> {
    const supabase = getServiceRoleClient();

    const { data, error } = await supabase
        .from('roadmap_adjustment_proposals')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

    if (error || !data) {
        return [];
    }

    return data.map(mapRowToProposal);
}

/**
 * Map database row to proposal type
 */
function mapRowToProposal(row: RoadmapAdjustmentProposalRow): AdjustmentProposal {
    return {
        id: row.id,
        projectId: row.project_id,
        triggerType: row.trigger_type,
        triggerSeverity: row.trigger_severity,
        triggerDescription: row.trigger_description,
        triggerData: row.trigger_data,
        status: row.status,
        proposedChanges: row.proposed_changes,
        aiReasoning: row.ai_reasoning,
        confidenceScore: row.confidence_score,
        reviewedBy: row.reviewed_by,
        reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
        reviewNotes: row.review_notes,
        expiresAt: new Date(row.expires_at),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    };
}
