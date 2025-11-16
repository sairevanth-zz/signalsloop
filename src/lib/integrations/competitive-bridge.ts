/**
 * Competitive Intelligence Integration Bridge
 * Connects competitive intelligence with existing features:
 * - AI Feedback Hunter
 * - Sentiment Analysis
 * - Theme Detection
 */

import { extractCompetitorMentions } from '../competitive-intelligence';
import { getSupabaseServiceRoleClient } from '../supabase-client';

/**
 * Hook: Called when new feedback is discovered by the Hunter
 * Automatically extracts competitor mentions from discovered feedback
 */
export async function onFeedbackDiscovered(feedbackId: string): Promise<{
  success: boolean;
  competitorsExtracted: boolean;
  error?: string;
}> {
  try {
    console.log(`[Competitive Bridge] Processing feedback ${feedbackId} for competitor extraction`);

    // Extract competitor mentions
    const result = await extractCompetitorMentions(feedbackId);

    if (!result.success) {
      console.error(`[Competitive Bridge] Failed to extract competitors from ${feedbackId}:`, result.error);
      return {
        success: false,
        competitorsExtracted: false,
        error: result.error,
      };
    }

    if (result.mentionsFound > 0) {
      console.log(
        `[Competitive Bridge] Extracted ${result.mentionsFound} competitive mentions from feedback ${feedbackId}`,
      );

      // Check if this triggers a competitive event (spike detection)
      for (const competitorName of result.competitorsDetected) {
        await checkForCompetitiveEventSpike(competitorName, feedbackId);
      }
    }

    return {
      success: true,
      competitorsExtracted: result.mentionsFound > 0,
    };
  } catch (error) {
    console.error(`[Competitive Bridge] Error processing feedback ${feedbackId}:`, error);
    return {
      success: false,
      competitorsExtracted: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if a competitor mention spike should trigger an event
 * If >20 mentions in last 24 hours, create a competitive event
 */
async function checkForCompetitiveEventSpike(competitorName: string, feedbackId: string): Promise<void> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return;

  try {
    // Get competitor
    const { data: competitor } = await supabase
      .from('competitors')
      .select('id, project_id')
      .ilike('name', competitorName)
      .single();

    if (!competitor) return;

    // Check for mention spike using database function
    const { data: hasSpike } = await supabase.rpc('detect_competitive_event_spike', {
      p_competitor_id: competitor.id,
      p_days_back: 1,
    });

    if (hasSpike) {
      console.log(`[Competitive Bridge] Spike detected for ${competitorName}! Creating competitive event.`);

      // Get recent mentions for this competitor
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data: recentMentions } = await supabase
        .from('competitive_mentions')
        .select('id, feedback_id, sentiment_vs_you')
        .eq('competitor_id', competitor.id)
        .gte('created_at', twentyFourHoursAgo.toISOString());

      if (!recentMentions || recentMentions.length < 20) return;

      // Calculate average sentiment
      const avgSentiment =
        recentMentions.reduce((sum, m) => sum + (m.sentiment_vs_you || 0), 0) / recentMentions.length;

      // Determine impact level
      let impactLevel: 'high' | 'medium' | 'low' = 'medium';
      if (recentMentions.length > 50 || avgSentiment < -0.5) impactLevel = 'high';
      else if (recentMentions.length < 30 && avgSentiment > -0.2) impactLevel = 'low';

      // Create competitive event
      await supabase.from('competitive_events').insert({
        competitor_id: competitor.id,
        event_type: 'other',
        title: `Mention Spike: ${competitorName}`,
        description: `Detected ${recentMentions.length} mentions of ${competitorName} in the last 24 hours (avg sentiment: ${avgSentiment.toFixed(2)})`,
        event_date: new Date().toISOString().split('T')[0],
        mention_count: recentMentions.length,
        avg_sentiment: avgSentiment,
        impact_level: impactLevel,
        feedback_ids: recentMentions.map((m) => m.feedback_id),
      });

      console.log(`[Competitive Bridge] Created competitive event for ${competitorName} spike`);
    }
  } catch (error) {
    console.error(`[Competitive Bridge] Error checking spike for ${competitorName}:`, error);
  }
}

/**
 * Check if accumulated competitive mentions trigger feature gap or strategic analysis
 * Called periodically or when mention count crosses thresholds
 */
export async function onCompetitiveMentionsAccumulated(projectId: string): Promise<{
  success: boolean;
  triggeredAnalysis: boolean;
  error?: string;
}> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return { success: false, triggeredAnalysis: false, error: 'Supabase client not available' };
  }

  try {
    // Count unanalyzed competitive mentions (mentions since last feature gap analysis)
    const { data: lastAnalysis } = await supabase
      .from('feature_gaps')
      .select('last_updated_at')
      .eq('project_id', projectId)
      .order('last_updated_at', { ascending: false })
      .limit(1)
      .single();

    const lastAnalysisDate = lastAnalysis?.last_updated_at || new Date(0).toISOString();

    const { data: newMentions, count: mentionCount } = await supabase
      .from('competitive_mentions')
      .select('id', { count: 'exact' })
      .eq('mention_type', 'feature_comparison')
      .gte('created_at', lastAnalysisDate);

    console.log(`[Competitive Bridge] Found ${mentionCount} new feature comparison mentions for project ${projectId}`);

    // If 50+ new mentions, trigger feature gap detection
    if (mentionCount && mentionCount >= 50) {
      console.log(`[Competitive Bridge] Threshold met (${mentionCount} mentions). Triggering feature gap analysis.`);

      // Note: In production, this would trigger a background job
      // For now, we just log it - the cron job will pick it up
      return {
        success: true,
        triggeredAnalysis: true,
      };
    }

    return {
      success: true,
      triggeredAnalysis: false,
    };
  } catch (error) {
    console.error(`[Competitive Bridge] Error checking mention accumulation:`, error);
    return {
      success: false,
      triggeredAnalysis: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Enrich sentiment analysis with competitive context
 * When sentiment is analyzed, check if it mentions competitors
 */
export async function enrichSentimentWithCompetitiveContext(feedbackId: string): Promise<{
  hasCompetitors: boolean;
  competitorNames: string[];
  avgCompetitiveSentiment: number | null;
}> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return { hasCompetitors: false, competitorNames: [], avgCompetitiveSentiment: null };
  }

  try {
    // Get competitive mentions for this feedback
    const { data: mentions } = await supabase
      .from('competitive_mentions')
      .select('competitor:competitors(name), sentiment_vs_you')
      .eq('feedback_id', feedbackId);

    if (!mentions || mentions.length === 0) {
      return { hasCompetitors: false, competitorNames: [], avgCompetitiveSentiment: null };
    }

    const competitorNames = mentions
      .map((m) => (m.competitor as { name?: string })?.name)
      .filter(Boolean) as string[];

    const avgSentiment = mentions.reduce((sum, m) => sum + (m.sentiment_vs_you || 0), 0) / mentions.length;

    return {
      hasCompetitors: true,
      competitorNames,
      avgCompetitiveSentiment: avgSentiment,
    };
  } catch (error) {
    console.error(`[Competitive Bridge] Error enriching sentiment:`, error);
    return { hasCompetitors: false, competitorNames: [], avgCompetitiveSentiment: null };
  }
}

/**
 * Tag themes with competitor associations
 * When themes are detected, link them to competitive mentions
 */
export async function associateThemesWithCompetitors(projectId: string, themeId: string): Promise<{
  success: boolean;
  competitorsLinked: string[];
  error?: string;
}> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return { success: false, competitorsLinked: [], error: 'Supabase client not available' };
  }

  try {
    // Get feedback items associated with this theme
    const { data: themeFeedback } = await supabase
      .from('feedback_themes')
      .select('feedback_id')
      .eq('theme_id', themeId);

    if (!themeFeedback || themeFeedback.length === 0) {
      return { success: true, competitorsLinked: [] };
    }

    const feedbackIds = themeFeedback.map((tf) => tf.feedback_id);

    // Get competitive mentions for these feedback items
    const { data: mentions } = await supabase
      .from('competitive_mentions')
      .select('competitor:competitors(id, name)')
      .in('feedback_id', feedbackIds);

    if (!mentions || mentions.length === 0) {
      return { success: true, competitorsLinked: [] };
    }

    // Count mentions per competitor
    const competitorCounts = mentions.reduce(
      (acc, m) => {
        const competitorId = (m.competitor as { id?: string })?.id;
        const competitorName = (m.competitor as { name?: string })?.name;
        if (competitorId && competitorName) {
          acc[competitorId] = competitorName;
        }
        return acc;
      },
      {} as { [id: string]: string },
    );

    const competitorsLinked = Object.values(competitorCounts);

    console.log(`[Competitive Bridge] Theme ${themeId} linked to ${competitorsLinked.length} competitors`);

    return {
      success: true,
      competitorsLinked,
    };
  } catch (error) {
    console.error(`[Competitive Bridge] Error associating themes:`, error);
    return {
      success: false,
      competitorsLinked: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get competitive context for a feedback item
 * Useful for enriching feedback displays
 */
export async function getCompetitiveContextForFeedback(feedbackId: string): Promise<{
  hasCompetitors: boolean;
  competitors: Array<{
    id: string;
    name: string;
    mention_type: string;
    sentiment_vs_you: number;
  }>;
}> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return { hasCompetitors: false, competitors: [] };
  }

  try {
    const { data: mentions } = await supabase
      .from('competitive_mentions')
      .select(
        `
        competitor:competitors(id, name),
        mention_type,
        sentiment_vs_you
      `,
      )
      .eq('feedback_id', feedbackId);

    if (!mentions || mentions.length === 0) {
      return { hasCompetitors: false, competitors: [] };
    }

    const competitors = mentions.map((m) => ({
      id: (m.competitor as { id?: string })?.id || '',
      name: (m.competitor as { name?: string })?.name || 'Unknown',
      mention_type: m.mention_type,
      sentiment_vs_you: m.sentiment_vs_you || 0,
    }));

    return {
      hasCompetitors: true,
      competitors,
    };
  } catch (error) {
    console.error(`[Competitive Bridge] Error getting competitive context:`, error);
    return { hasCompetitors: false, competitors: [] };
  }
}
