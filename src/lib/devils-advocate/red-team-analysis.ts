/**
 * Red Team Analysis Engine
 *
 * Analyzes PRDs for risks using competitor intelligence and internal data.
 */

import { createServerClient } from '@/lib/supabase-client';
import { analyzePRDWithRedTeam } from './prompts/red-team-prd';
import { searchCompetitorEventsBySimilarity } from './competitor-ingestion';
import { generateRiskAlerts } from './risk-alert-generator';
import type { RedTeamAnalysisInput, RedTeamAnalysisOutput } from '@/types/devils-advocate';

/**
 * Analyzes a PRD for risks
 */
export async function analyzeProductRequirementsDocument(
  specId: string
): Promise<RedTeamAnalysisOutput> {
  const supabase = await createServerClient();

  try {
    // 1. Fetch PRD content and metadata
    const { data: spec, error: specError } = await supabase
      .from('specs')
      .select('id, project_id, title, content, linked_feedback_ids')
      .eq('id', specId)
      .single();

    if (specError || !spec) {
      throw new Error('Spec not found');
    }

    // 2. Extract key topics/features from PRD using first 1000 chars for search
    const searchQuery = `${spec.title}\n\n${spec.content.substring(0, 1000)}`;

    // 3. Search for relevant competitor events
    const competitorEvents = await searchCompetitorEventsBySimilarity(
      searchQuery,
      spec.project_id,
      10 // Top 10 most relevant events
    );

    // 4. Query internal feedback data
    const feedbackData = await getRelevantFeedbackData(
      spec.project_id,
      spec.linked_feedback_ids || []
    );

    // 5. Run Red Team analysis with GPT-4o
    const riskAlerts = await analyzePRDWithRedTeam(
      spec.content,
      competitorEvents,
      feedbackData
    );

    // 6. Add spec_id and project_id to each alert
    const enrichedAlerts = riskAlerts.map((alert) => ({
      ...alert,
      spec_id: specId,
      project_id: spec.project_id,
    }));

    // 7. Generate and store risk alerts
    const createdAlerts = await generateRiskAlerts(enrichedAlerts);

    return {
      alerts: enrichedAlerts,
      analysis_summary: `Generated ${enrichedAlerts.length} risk ${enrichedAlerts.length === 1 ? 'alert' : 'alerts'}`,
      total_risks_found: enrichedAlerts.length,
    };
  } catch (error) {
    console.error('[analyzeProductRequirementsDocument] Error:', error);
    throw error;
  }
}

/**
 * Gets relevant feedback data for context
 */
async function getRelevantFeedbackData(
  projectId: string,
  linkedFeedbackIds: string[]
): Promise<any> {
  const supabase = await createServerClient();

  try {
    // Get linked feedback if available
    let linkedFeedback = [];
    if (linkedFeedbackIds.length > 0) {
      const { data } = await supabase
        .from('discovered_feedback')
        .select('id, source, content, sentiment, themes, created_at')
        .in('id', linkedFeedbackIds)
        .limit(20);

      linkedFeedback = data || [];
    }

    // Get recent sentiment trends
    const { data: recentFeedback } = await supabase
      .from('discovered_feedback')
      .select('sentiment, themes, created_at')
      .eq('project_id', projectId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    // Calculate sentiment statistics
    const sentiments = (recentFeedback || []).map((f) => f.sentiment).filter((s) => s !== null);
    const avgSentiment =
      sentiments.length > 0
        ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
        : 0;

    // Extract top themes
    const themeFrequency: Record<string, number> = {};
    (recentFeedback || []).forEach((f) => {
      (f.themes || []).forEach((theme: string) => {
        themeFrequency[theme] = (themeFrequency[theme] || 0) + 1;
      });
    });

    const topThemes = Object.entries(themeFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([theme, count]) => ({ theme, count }));

    return {
      linked_feedback: linkedFeedback,
      recent_sentiment: avgSentiment.toFixed(2),
      top_themes: topThemes,
      feedback_volume_30d: recentFeedback?.length || 0,
    };
  } catch (error) {
    console.error('[getRelevantFeedbackData] Error:', error);
    return {
      linked_feedback: [],
      recent_sentiment: 0,
      top_themes: [],
      feedback_volume_30d: 0,
    };
  }
}
