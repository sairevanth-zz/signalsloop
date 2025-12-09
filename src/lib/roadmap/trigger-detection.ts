/**
 * Trigger Detection for Self-Correcting Roadmaps
 * 
 * Analyzes project data to detect when roadmap priorities should change:
 * - Sentiment shifts on themes
 * - Competitor moves
 * - Theme mention velocity spikes
 * - Churn signals correlated with themes
 */

import { getOpenAI } from '@/lib/openai-client';
import { getServiceRoleClient } from '@/lib/supabase-singleton';
import type {
    AdjustmentTrigger,
    TriggerDetectionInput,
    TriggerType,
    TriggerSeverity
} from '@/types/roadmap-adjustments';
import {
    TRIGGER_DETECTION_SYSTEM_PROMPT,
    buildTriggerDetectionUserPrompt
} from './prompts/adjustment-prompts';

const MODEL = 'gpt-4o-mini'; // Use mini for cost-effective detection

// Thresholds for trigger detection
const SENTIMENT_CHANGE_THRESHOLD = 0.15; // 15% change
const VELOCITY_CHANGE_THRESHOLD = 0.50;   // 50% increase
const CHURN_RISK_THRESHOLD = 0.60;        // 60% risk score

/**
 * Main entry point: Detect all adjustment triggers for a project
 */
export async function detectRoadmapAdjustmentTriggers(
    projectId: string
): Promise<AdjustmentTrigger[]> {
    console.log(`[AutoAdjust] Detecting triggers for project ${projectId}`);

    // Gather all data needed for detection
    const data = await gatherTriggerDetectionData(projectId);

    // Quick pre-filter: if no significant changes, skip AI call
    const hasSignificantChanges =
        data.sentimentChanges.some(s => Math.abs(s.changePercent) > SENTIMENT_CHANGE_THRESHOLD * 100) ||
        data.themeVelocity.some(v => v.changePercent > VELOCITY_CHANGE_THRESHOLD * 100) ||
        data.competitorMoves.length > 0 ||
        data.churnSignals.some(c => c.churnRiskScore > CHURN_RISK_THRESHOLD);

    if (!hasSignificantChanges) {
        console.log('[AutoAdjust] No significant changes detected, skipping AI analysis');
        return [];
    }

    // Use AI to analyze and identify triggers
    const triggers = await analyzeTriggersWithAI(data);

    console.log(`[AutoAdjust] Detected ${triggers.length} triggers`);
    return triggers;
}

/**
 * Gather all data needed for trigger detection
 */
async function gatherTriggerDetectionData(projectId: string): Promise<TriggerDetectionInput> {
    const supabase = getServiceRoleClient();

    // Get project name
    const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();

    // Get sentiment changes (compare last 7 days vs previous 7 days)
    const sentimentChanges = await getSentimentChanges(projectId);

    // Get theme velocity changes
    const themeVelocity = await getThemeVelocityChanges(projectId);

    // Get recent competitor moves
    const competitorMoves = await getRecentCompetitorMoves(projectId);

    // Get churn signals
    const churnSignals = await getChurnSignals(projectId);

    // Get current roadmap priorities
    const currentPriorities = await getCurrentPriorities(projectId);

    return {
        projectId,
        projectName: project?.name || 'Unknown Project',
        sentimentChanges,
        themeVelocity,
        competitorMoves,
        churnSignals,
        currentPriorities
    };
}

/**
 * Get sentiment changes for themes
 */
async function getSentimentChanges(projectId: string) {
    const supabase = getServiceRoleClient();

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get themes with their sentiment data
    const { data: themes } = await supabase
        .from('themes')
        .select(`
      id,
      theme_name,
      avg_sentiment
    `)
        .eq('project_id', projectId);

    if (!themes) return [];

    // For each theme, calculate sentiment change
    const changes = [];

    for (const theme of themes) {
        // Get recent posts sentiment for this theme
        const { data: recentPosts } = await supabase
            .from('posts')
            .select('id')
            .eq('project_id', projectId)
            .contains('themes', [theme.id])
            .gte('created_at', sevenDaysAgo.toISOString());

        const { data: olderPosts } = await supabase
            .from('posts')
            .select('id')
            .eq('project_id', projectId)
            .contains('themes', [theme.id])
            .gte('created_at', fourteenDaysAgo.toISOString())
            .lt('created_at', sevenDaysAgo.toISOString());

        if (!recentPosts?.length || !olderPosts?.length) continue;

        // Get sentiment for these posts
        const { data: recentSentiment } = await supabase
            .from('sentiment_analysis')
            .select('sentiment_score')
            .in('post_id', recentPosts.map(p => p.id));

        const { data: olderSentiment } = await supabase
            .from('sentiment_analysis')
            .select('sentiment_score')
            .in('post_id', olderPosts.map(p => p.id));

        if (!recentSentiment?.length || !olderSentiment?.length) continue;

        const recentAvg = recentSentiment.reduce((sum, s) => sum + s.sentiment_score, 0) / recentSentiment.length;
        const olderAvg = olderSentiment.reduce((sum, s) => sum + s.sentiment_score, 0) / olderSentiment.length;

        const changePercent = olderAvg !== 0
            ? ((recentAvg - olderAvg) / Math.abs(olderAvg)) * 100
            : 0;

        if (Math.abs(changePercent) >= 5) { // Only include 5%+ changes
            changes.push({
                themeId: theme.id,
                themeName: theme.theme_name,
                previousSentiment: olderAvg,
                currentSentiment: recentAvg,
                changePercent
            });
        }
    }

    return changes.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
}

/**
 * Get theme velocity changes (mention count)
 */
async function getThemeVelocityChanges(projectId: string) {
    const supabase = getServiceRoleClient();

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const { data: themes } = await supabase
        .from('themes')
        .select('id, theme_name, frequency')
        .eq('project_id', projectId);

    if (!themes) return [];

    const changes = [];

    for (const theme of themes) {
        // Count recent mentions
        const { count: recentCount } = await supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', projectId)
            .contains('themes', [theme.id])
            .gte('created_at', sevenDaysAgo.toISOString());

        // Count older mentions
        const { count: olderCount } = await supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', projectId)
            .contains('themes', [theme.id])
            .gte('created_at', fourteenDaysAgo.toISOString())
            .lt('created_at', sevenDaysAgo.toISOString());

        const recent = recentCount || 0;
        const older = olderCount || 0;

        if (older === 0 && recent > 5) {
            // New spike from nothing
            changes.push({
                themeId: theme.id,
                themeName: theme.theme_name,
                previousMentions: older,
                currentMentions: recent,
                changePercent: 100 // Treat as 100% increase
            });
        } else if (older > 0) {
            const changePercent = ((recent - older) / older) * 100;
            if (changePercent >= 25) { // Only include 25%+ increases
                changes.push({
                    themeId: theme.id,
                    themeName: theme.theme_name,
                    previousMentions: older,
                    currentMentions: recent,
                    changePercent
                });
            }
        }
    }

    return changes.sort((a, b) => b.changePercent - a.changePercent);
}

/**
 * Get recent competitor moves
 */
async function getRecentCompetitorMoves(projectId: string) {
    const supabase = getServiceRoleClient();

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const { data: moves } = await supabase
        .from('competitor_analysis')
        .select(`
      id,
      competitor_name,
      analysis_summary,
      created_at,
      competitor_insights (
        insight_type,
        insight_content,
        related_themes
      )
    `)
        .eq('project_id', projectId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

    if (!moves) return [];

    return moves.map(m => ({
        competitorName: m.competitor_name,
        activity: m.analysis_summary || 'Competitor activity detected',
        detectedAt: new Date(m.created_at).toLocaleDateString(),
        relatedThemes: (m.competitor_insights as any[])?.flatMap(i => i.related_themes || []) || []
    }));
}

/**
 * Get churn signals correlated with themes
 */
async function getChurnSignals(projectId: string) {
    const supabase = getServiceRoleClient();

    // Check if churn_signals table exists (from churn-radar feature)
    const { data: signals } = await supabase
        .from('user_health_scores')
        .select(`
      user_id,
      health_score,
      churn_risk
    `)
        .eq('project_id', projectId)
        .gt('churn_risk', 0.5) // High risk users
        .order('churn_risk', { ascending: false })
        .limit(100);

    if (!signals?.length) return [];

    // Get themes mentioned by at-risk users
    const { data: atRiskPosts } = await supabase
        .from('posts')
        .select('themes')
        .eq('project_id', projectId)
        .in('user_id', signals.map(s => s.user_id));

    // Aggregate theme mentions from at-risk users
    const themeChurnMap = new Map<string, { count: number; totalRisk: number }>();

    for (const post of atRiskPosts || []) {
        const themes = post.themes as string[] || [];
        for (const themeId of themes) {
            const existing = themeChurnMap.get(themeId) || { count: 0, totalRisk: 0 };
            existing.count++;
            themeChurnMap.set(themeId, existing);
        }
    }

    // Get theme names
    const themeIds = Array.from(themeChurnMap.keys());
    if (themeIds.length === 0) return [];

    const { data: themes } = await supabase
        .from('themes')
        .select('id, theme_name')
        .in('id', themeIds);

    return (themes || [])
        .map(t => {
            const stats = themeChurnMap.get(t.id);
            return {
                themeId: t.id,
                themeName: t.theme_name,
                atRiskUsers: stats?.count || 0,
                churnRiskScore: Math.min(1, (stats?.count || 0) / 10) // Normalize
            };
        })
        .filter(c => c.churnRiskScore > 0.3)
        .sort((a, b) => b.churnRiskScore - a.churnRiskScore);
}

/**
 * Get current roadmap priorities
 */
async function getCurrentPriorities(projectId: string) {
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
        theme_name
      )
    `)
        .eq('project_id', projectId)
        .order('priority_score', { ascending: false })
        .limit(20);

    return (suggestions || []).map(s => ({
        suggestionId: s.id,
        themeId: s.theme_id,
        themeName: (s.themes as any)?.theme_name || 'Unknown',
        priority: s.priority_level,
        score: s.priority_score
    }));
}

/**
 * Use AI to analyze triggers
 */
async function analyzeTriggersWithAI(
    data: TriggerDetectionInput
): Promise<AdjustmentTrigger[]> {
    const userPrompt = buildTriggerDetectionUserPrompt(data);

    try {
        const response = await getOpenAI().chat.completions.create({
            model: MODEL,
            messages: [
                { role: 'system', content: TRIGGER_DETECTION_SYSTEM_PROMPT },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.3,
            max_tokens: 1500,
            response_format: { type: 'json_object' }
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            console.error('[AutoAdjust] No response from AI');
            return [];
        }

        const parsed = JSON.parse(content);

        if (!parsed.triggers || !Array.isArray(parsed.triggers)) {
            return [];
        }

        // Map to our type
        return parsed.triggers.map((t: any) => ({
            type: t.type as TriggerType,
            severity: t.severity as TriggerSeverity,
            themeId: t.theme_id,
            themeName: t.theme_name,
            description: t.description,
            dataPoints: t.data_points || [],
            recommendedAction: t.recommended_action,
            detectedAt: new Date()
        }));
    } catch (error) {
        console.error('[AutoAdjust] Error analyzing triggers:', error);
        return [];
    }
}

/**
 * Export for testing
 */
export const __test__ = {
    gatherTriggerDetectionData,
    getSentimentChanges,
    getThemeVelocityChanges,
    getRecentCompetitorMoves,
    getChurnSignals,
    getCurrentPriorities
};
