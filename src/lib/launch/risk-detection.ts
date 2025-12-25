/**
 * Risk Detection Service
 * AI-powered risk detection for Go/No-Go Dashboard
 */

import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import type { LaunchRisk, LaunchChecklistItem } from '@/types/launch';

// ============================================================================
// AI Risk Detection
// ============================================================================

export async function detectRisks(
    boardId: string,
    projectId: string,
    featureTitle: string
): Promise<LaunchRisk[]> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return [];

    const detectedRisks: Omit<LaunchRisk, 'id' | 'created_at' | 'updated_at'>[] = [];

    // Gather context for risk analysis
    const context = await gatherRiskContext(projectId, featureTitle);

    // Detect various risk types
    const competitiveRisks = detectCompetitiveRisks(context);
    const technicalRisks = detectTechnicalRisks(context);
    const customerRisks = detectCustomerRisks(context);

    detectedRisks.push(...competitiveRisks, ...technicalRisks, ...customerRisks);

    // Insert detected risks
    if (detectedRisks.length > 0) {
        const risksToInsert = detectedRisks.map(r => ({
            ...r,
            board_id: boardId,
        }));

        const { data, error } = await supabase
            .from('launch_risks')
            .insert(risksToInsert)
            .select();

        if (error) {
            console.error('Error inserting risks:', error);
            return [];
        }

        return data || [];
    }

    return [];
}

// ============================================================================
// Context Gathering
// ============================================================================

interface RiskContext {
    negativeFeedback: Array<{
        title: string;
        description: string;
        sentiment_score: number;
        created_at: string;
    }>;
    failedOutcomes: Array<{
        theme_name: string;
        outcome_classification: string;
        sentiment_delta: number;
    }>;
    competitorMentions: number;
    totalFeedback: number;
}

async function gatherRiskContext(
    projectId: string,
    featureTitle: string
): Promise<RiskContext> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
        return {
            negativeFeedback: [],
            failedOutcomes: [],
            competitorMentions: 0,
            totalFeedback: 0,
        };
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get negative feedback
    const { data: negativeFeedback } = await supabase
        .from('posts')
        .select('title, description, sentiment_score, created_at')
        .eq('project_id', projectId)
        .lt('sentiment_score', -0.2)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('sentiment_score', { ascending: true })
        .limit(20);

    // Get total feedback count
    const { count: totalFeedback } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .gte('created_at', thirtyDaysAgo.toISOString());

    // Get failed outcomes
    const { data: outcomes } = await supabase
        .from('feature_outcomes')
        .select(`
      ai_priorities!inner(theme_name),
      outcome_classification,
      sentiment_delta
    `)
        .eq('project_id', projectId)
        .in('outcome_classification', ['no_impact', 'negative_impact'])
        .order('created_at', { ascending: false })
        .limit(10);

    return {
        negativeFeedback: (negativeFeedback || []).map(f => ({
            title: f.title,
            description: f.description || '',
            sentiment_score: f.sentiment_score || 0,
            created_at: f.created_at,
        })),
        failedOutcomes: (outcomes || []).map((o: { ai_priorities: { theme_name: string }; outcome_classification: string; sentiment_delta: number }) => ({
            theme_name: o.ai_priorities?.theme_name || '',
            outcome_classification: o.outcome_classification,
            sentiment_delta: o.sentiment_delta || 0,
        })),
        competitorMentions: 0, // TODO: Add competitor tracking
        totalFeedback: totalFeedback || 0,
    };
}

// ============================================================================
// Risk Detection Functions
// ============================================================================

function detectCompetitiveRisks(
    context: RiskContext
): Omit<LaunchRisk, 'id' | 'created_at' | 'updated_at' | 'board_id'>[] {
    const risks: Omit<LaunchRisk, 'id' | 'created_at' | 'updated_at' | 'board_id'>[] = [];

    if (context.competitorMentions > 10) {
        risks.push({
            title: `Competitor mentioned ${context.competitorMentions} times in recent feedback`,
            description: 'High competitor awareness may indicate market pressure.',
            severity: context.competitorMentions > 20 ? 'high' : 'medium',
            status: 'open',
            is_ai: true,
            source: 'Competitive Intel',
            mitigation: 'Consider accelerating launch timeline or differentiating features.',
            owner: 'Product',
        });
    }

    return risks;
}

function detectTechnicalRisks(
    context: RiskContext
): Omit<LaunchRisk, 'id' | 'created_at' | 'updated_at' | 'board_id'>[] {
    const risks: Omit<LaunchRisk, 'id' | 'created_at' | 'updated_at' | 'board_id'>[] = [];

    // Check for past technical failures
    const technicalFailures = context.failedOutcomes.filter(
        o => o.outcome_classification === 'negative_impact'
    );

    if (technicalFailures.length > 0) {
        risks.push({
            title: `${technicalFailures.length} similar features had negative impact`,
            description: 'Historical data shows risk of negative outcomes for this feature type.',
            severity: technicalFailures.length > 2 ? 'high' : 'medium',
            status: 'open',
            is_ai: true,
            source: 'Outcome Attribution',
            mitigation: 'Review past failures and ensure root causes are addressed.',
            owner: 'Engineering',
        });
    }

    return risks;
}

function detectCustomerRisks(
    context: RiskContext
): Omit<LaunchRisk, 'id' | 'created_at' | 'updated_at' | 'board_id'>[] {
    const risks: Omit<LaunchRisk, 'id' | 'created_at' | 'updated_at' | 'board_id'>[] = [];

    // Check for conflicting customer requirements
    if (context.negativeFeedback.length > 5) {
        const negativePct = Math.round((context.negativeFeedback.length / Math.max(context.totalFeedback, 1)) * 100);

        if (negativePct > 15) {
            risks.push({
                title: `${negativePct}% of recent feedback is negative`,
                description: 'High negative sentiment may indicate unmet expectations.',
                severity: negativePct > 25 ? 'high' : 'medium',
                status: 'open',
                is_ai: true,
                source: 'Feedback Hunter',
                mitigation: 'Address top complaints before launch.',
                owner: 'Product',
            });
        }
    }

    // Check for conflicting requirements
    if (context.negativeFeedback.length >= 3) {
        risks.push({
            title: `${context.negativeFeedback.length} customers have conflicting requirements`,
            description: 'Some customer needs may conflict with the proposed feature design.',
            severity: 'medium',
            status: 'acknowledged',
            is_ai: true,
            source: 'Feedback Hunter',
            mitigation: 'Consider phased rollout or configuration options.',
            owner: 'Product',
        });
    }

    return risks;
}

// ============================================================================
// Default Checklist Generation
// ============================================================================

export async function generateDefaultChecklist(
    boardId: string,
    featureTitle: string
): Promise<LaunchChecklistItem[]> {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) return [];

    const defaultItems = [
        { title: 'Feature complete and QA passed', owner: 'Engineering', auto_verified: true },
        { title: 'Performance benchmarks met (<200ms p95)', owner: 'Engineering', auto_verified: true },
        { title: 'Documentation updated', owner: 'Product', auto_verified: false },
        { title: 'Customer support trained', owner: 'CS', auto_verified: false },
        { title: 'Marketing assets ready', owner: 'Marketing', auto_verified: false },
        { title: 'Rollback plan documented', owner: 'Engineering', auto_verified: false },
    ];

    const itemsToInsert = defaultItems.map((item, index) => ({
        board_id: boardId,
        title: item.title,
        owner: item.owner,
        is_ai: true,
        auto_verified: item.auto_verified,
        completed: false,
        sort_order: index,
    }));

    const { data, error } = await supabase
        .from('launch_checklist_items')
        .insert(itemsToInsert)
        .select();

    if (error) {
        console.error('Error inserting checklist items:', error);
        return [];
    }

    return data || [];
}
