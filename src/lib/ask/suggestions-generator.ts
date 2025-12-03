/**
 * Proactive Suggestions Generator
 * Analyzes feedback data and generates AI-powered suggestions
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type { SuggestionType, SuggestionPriority } from '@/types/ask';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// Main Suggestion Generation Function
// ============================================================================

/**
 * Generates proactive suggestions for a project based on recent feedback data
 *
 * @param projectId - Project ID to generate suggestions for
 * @returns Array of generated suggestions
 */
export async function generateProactiveSuggestions(projectId: string) {
  console.log(`[Suggestions Generator] Generating suggestions for project: ${projectId}`);

  const suggestions: Array<{
    suggestion_type: SuggestionType;
    title: string;
    description: string;
    query_suggestion: string;
    priority: SuggestionPriority;
    context_data: any;
  }> = [];

  try {
    // 1. Check for sentiment drops
    const sentimentDropSuggestion = await detectSentimentDrop(projectId);
    if (sentimentDropSuggestion) suggestions.push(sentimentDropSuggestion);

    // 2. Check for theme spikes
    const themeSpikeSuggestion = await detectThemeSpike(projectId);
    if (themeSpikeSuggestion) suggestions.push(themeSpikeSuggestion);

    // 3. Check for churn risks
    const churnRiskSuggestion = await detectChurnRisk(projectId);
    if (churnRiskSuggestion) suggestions.push(churnRiskSuggestion);

    // 4. Check for opportunities
    const opportunitySuggestion = await detectOpportunity(projectId);
    if (opportunitySuggestion) suggestions.push(opportunitySuggestion);

    // 5. Check for competitor moves (requires competitor_events table)
    const competitorSuggestion = await detectCompetitorMove(projectId);
    if (competitorSuggestion) suggestions.push(competitorSuggestion);

    // Insert suggestions into database
    if (suggestions.length > 0) {
      const { data, error } = await supabase
        .from('ask_proactive_suggestions')
        .insert(
          suggestions.map((s) => ({
            project_id: projectId,
            ...s,
            status: 'active',
            viewed_by_users: [],
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          }))
        )
        .select();

      if (error) {
        console.error('[Suggestions Generator] Error inserting suggestions:', error);
      } else {
        console.log(`[Suggestions Generator] Created ${data?.length} suggestions`);
      }
    }

    return suggestions;
  } catch (error) {
    console.error('[Suggestions Generator] Error generating suggestions:', error);
    return [];
  }
}

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Detect sentiment drops (negative sentiment increase)
 */
async function detectSentimentDrop(projectId: string) {
  try {
    // Get sentiment from last 7 days vs previous 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Recent sentiment
    const { data: recentFeedback } = await supabase
      .from('posts')
      .select('sentiment')
      .eq('project_id', projectId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .not('sentiment', 'is', null);

    // Previous sentiment
    const { data: previousFeedback } = await supabase
      .from('posts')
      .select('sentiment')
      .eq('project_id', projectId)
      .gte('created_at', fourteenDaysAgo.toISOString())
      .lt('created_at', sevenDaysAgo.toISOString())
      .not('sentiment', 'is', null);

    if (!recentFeedback || recentFeedback.length < 5) return null;
    if (!previousFeedback || previousFeedback.length < 5) return null;

    const recentAvg =
      recentFeedback.reduce((sum, f) => sum + (f.sentiment || 0), 0) / recentFeedback.length;
    const previousAvg =
      previousFeedback.reduce((sum, f) => sum + (f.sentiment || 0), 0) / previousFeedback.length;

    const drop = previousAvg - recentAvg;

    // Significant drop (more than 0.2 on -1 to 1 scale)
    if (drop > 0.2) {
      const priority: SuggestionPriority = drop > 0.4 ? 'critical' : drop > 0.3 ? 'high' : 'medium';

      return {
        suggestion_type: 'sentiment_drop' as SuggestionType,
        title: 'Sentiment Drop Detected',
        description: `Customer sentiment has dropped by ${(drop * 100).toFixed(0)}% in the last week. Recent feedback shows increased negative sentiment.`,
        query_suggestion: 'What are customers complaining about most this week?',
        priority,
        context_data: {
          recent_avg: recentAvg,
          previous_avg: previousAvg,
          drop_percentage: drop * 100,
          feedback_count: recentFeedback.length,
        },
      };
    }

    return null;
  } catch (error) {
    console.error('[Suggestions Generator] Error detecting sentiment drop:', error);
    return null;
  }
}

/**
 * Detect theme spikes (sudden increase in mentions)
 */
async function detectThemeSpike(projectId: string) {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get recent feedback with themes
    const { data: recentFeedback } = await supabase
      .from('posts')
      .select('themes')
      .eq('project_id', projectId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .not('themes', 'is', null);

    if (!recentFeedback || recentFeedback.length < 10) return null;

    // Count theme occurrences
    const themeCounts: Record<string, number> = {};
    recentFeedback.forEach((post) => {
      (post.themes || []).forEach((theme: string) => {
        themeCounts[theme] = (themeCounts[theme] || 0) + 1;
      });
    });

    // Find most mentioned theme
    const sortedThemes = Object.entries(themeCounts).sort((a, b) => b[1] - a[1]);

    if (sortedThemes.length === 0) return null;

    const [topTheme, count] = sortedThemes[0];
    const percentage = (count / recentFeedback.length) * 100;

    // Spike if theme appears in more than 30% of feedback
    if (percentage > 30) {
      return {
        suggestion_type: 'theme_spike' as SuggestionType,
        title: `Theme Spike: ${topTheme}`,
        description: `The theme "${topTheme}" has appeared in ${count} feedback items (${percentage.toFixed(0)}%) in the last week.`,
        query_suggestion: `Show me all feedback about ${topTheme}`,
        priority: (percentage > 50 ? 'high' : 'medium') as SuggestionPriority,
        context_data: {
          theme: topTheme,
          count,
          percentage,
          total_feedback: recentFeedback.length,
        },
      };
    }

    return null;
  } catch (error) {
    console.error('[Suggestions Generator] Error detecting theme spike:', error);
    return null;
  }
}

/**
 * Detect churn risks
 */
async function detectChurnRisk(projectId: string) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get negative feedback from high-value customers
    const { data: feedback } = await supabase
      .from('posts')
      .select('sentiment, user_email, content')
      .eq('project_id', projectId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .lt('sentiment', -0.3) // Negative sentiment
      .not('user_email', 'is', null)
      .limit(50);

    if (!feedback || feedback.length < 3) return null;

    // Count unique users with negative feedback
    const uniqueUsers = new Set(feedback.map((f) => f.user_email));

    if (uniqueUsers.size >= 3) {
      return {
        suggestion_type: 'churn_risk' as SuggestionType,
        title: 'Churn Risk Detected',
        description: `${uniqueUsers.size} users have submitted negative feedback in the last 30 days. This may indicate churn risk.`,
        query_suggestion: 'Show me recent negative feedback and common complaints',
        priority: (uniqueUsers.size > 5 ? 'high' : 'medium') as SuggestionPriority,
        context_data: {
          user_count: uniqueUsers.size,
          feedback_count: feedback.length,
          avg_sentiment: feedback.reduce((sum, f) => sum + (f.sentiment || 0), 0) / feedback.length,
        },
      };
    }

    return null;
  } catch (error) {
    console.error('[Suggestions Generator] Error detecting churn risk:', error);
    return null;
  }
}

/**
 * Detect opportunities
 */
async function detectOpportunity(projectId: string) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get positive feedback with high engagement (votes)
    const { data: feedback } = await supabase
      .from('posts')
      .select('title, upvotes, sentiment, themes')
      .eq('project_id', projectId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .gt('sentiment', 0.5)
      .gt('upvotes', 5)
      .order('upvotes', { ascending: false })
      .limit(10);

    if (!feedback || feedback.length < 3) return null;

    // Find common themes in positive feedback
    const themeCounts: Record<string, number> = {};
    feedback.forEach((post) => {
      (post.themes || []).forEach((theme: string) => {
        themeCounts[theme] = (themeCounts[theme] || 0) + 1;
      });
    });

    const sortedThemes = Object.entries(themeCounts).sort((a, b) => b[1] - a[1]);

    if (sortedThemes.length > 0) {
      const [topTheme, count] = sortedThemes[0];

      return {
        suggestion_type: 'opportunity' as SuggestionType,
        title: `Growth Opportunity: ${topTheme}`,
        description: `${count} highly-voted, positive feedback items mention "${topTheme}". This could be a growth opportunity.`,
        query_suggestion: `What are users saying about ${topTheme}?`,
        priority: 'medium' as SuggestionPriority,
        context_data: {
          theme: topTheme,
          count,
          total_votes: feedback.reduce((sum, f) => sum + (f.upvotes || 0), 0),
        },
      };
    }

    return null;
  } catch (error) {
    console.error('[Suggestions Generator] Error detecting opportunity:', error);
    return null;
  }
}

/**
 * Detect competitor moves
 */
async function detectCompetitorMove(projectId: string) {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Check if competitor_events table exists and has recent events
    const { data: competitorEvents } = await supabase
      .from('competitor_events')
      .select('*')
      .eq('project_id', projectId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .in('impact_assessment', ['critical', 'high'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (!competitorEvents || competitorEvents.length === 0) return null;

    const event = competitorEvents[0];

    return {
      suggestion_type: 'competitor_move' as SuggestionType,
      title: `Competitor Alert: ${event.event_title}`,
      description: event.event_summary || 'A competitor has made a significant move.',
      query_suggestion: 'How does this compare to our current features and roadmap?',
      priority: (event.impact_assessment === 'critical' ? 'critical' : 'high') as SuggestionPriority,
      context_data: {
        event_id: event.id,
        event_type: event.event_type,
        competitor_id: event.competitor_id,
        event_date: event.event_date,
      },
    };
  } catch (error) {
    // Table might not exist if Devil's Advocate isn't set up
    console.log('[Suggestions Generator] competitor_events table not available');
    return null;
  }
}
