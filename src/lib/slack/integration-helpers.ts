/**
 * Slack Integration Helper Functions
 *
 * High-level functions for triggering alerts from various parts of the app
 */

import { createServerClient } from '@/lib/supabase-client';
import { postMessage } from './client';
import {
  buildCriticalFeedbackAlert,
  buildNewThemeAlert,
  buildSentimentDropAlert,
  buildCompetitiveThreatAlert,
  type CriticalFeedbackData,
  type NewThemeData,
  type SentimentDropData,
  type CompetitiveThreatData,
} from './messages';
import {
  shouldAlertCriticalFeedback,
  shouldAlertNewTheme,
  shouldAlertSentimentDrop,
  shouldAlertCompetitiveThreat,
  canSendAlert,
} from './alert-engine';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.signalsloop.com';

/**
 * Sends a critical feedback alert to Slack
 *
 * Call this when critical feedback is detected (high churn risk, negative sentiment)
 *
 * @example
 * await sendCriticalFeedbackAlert(projectId, {
 *   feedback_id: 'uuid',
 *   content: 'User is threatening to churn...',
 *   sentiment_score: -0.85,
 *   revenue_risk: 50000,
 *   // ... other fields
 * });
 */
export async function sendCriticalFeedbackAlert(
  projectId: string,
  feedbackData: CriticalFeedbackData
) {
  try {
    // Check if alert should be triggered based on rules
    const shouldAlert = await shouldAlertCriticalFeedback(
      {
        content: feedbackData.content,
        sentiment_score: feedbackData.sentiment_score,
        urgency_score: feedbackData.urgency_score,
        revenue_risk: feedbackData.revenue_risk,
      },
      projectId
    );

    if (!shouldAlert) {
      console.log('Alert rules not met for critical feedback');
      return { sent: false, reason: 'rules_not_met' };
    }

    // Get Slack connection
    const supabase = await createServerClient();

    const { data: connection } = await supabase
      .from('slack_connections')
      .select('id')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .single();

    if (!connection) {
      return { sent: false, reason: 'no_connection' };
    }

    // Check cooldown to prevent spam
    const canSend = await canSendAlert(
      connection.id,
      'critical_feedback',
      feedbackData.feedback_id,
      60 // 60 minute cooldown
    );

    if (!canSend) {
      return { sent: false, reason: 'cooldown' };
    }

    // Get channel mapping
    const { data: mapping } = await supabase
      .from('slack_channel_mappings')
      .select('*')
      .eq('slack_connection_id', connection.id)
      .eq('alert_type', 'critical_feedback')
      .single();

    if (!mapping) {
      return { sent: false, reason: 'no_channel_mapping' };
    }

    // Build and send message
    const blocks = buildCriticalFeedbackAlert(feedbackData, DASHBOARD_URL);

    await postMessage(
      connection.id,
      {
        channel: mapping.channel_id,
        blocks,
        text: `🚨 Critical feedback detected from ${feedbackData.user_name}`,
      },
      'critical_feedback',
      feedbackData.feedback_id,
      'feedback',
      mapping.mention_users
    );

    return { sent: true };
  } catch (error) {
    console.error('Error sending critical feedback alert:', error);
    return { sent: false, reason: 'error', error };
  }
}

/**
 * Sends a new theme detection alert to Slack
 *
 * Call this when AI detects a new emerging theme in feedback
 */
export async function sendNewThemeAlert(
  projectId: string,
  themeData: NewThemeData
) {
  try {
    const shouldAlert = await shouldAlertNewTheme(
      {
        mention_count: themeData.mention_count,
        avg_sentiment: themeData.avg_sentiment,
        first_detected_at: themeData.first_detected_at,
      },
      projectId
    );

    if (!shouldAlert) {
      return { sent: false, reason: 'rules_not_met' };
    }

    const supabase = await createServerClient();

    const { data: connection } = await supabase
      .from('slack_connections')
      .select('id')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .single();

    if (!connection) {
      return { sent: false, reason: 'no_connection' };
    }

    const canSend = await canSendAlert(
      connection.id,
      'new_theme',
      themeData.theme_id,
      1440 // 24 hour cooldown for themes
    );

    if (!canSend) {
      return { sent: false, reason: 'cooldown' };
    }

    const { data: mapping } = await supabase
      .from('slack_channel_mappings')
      .select('*')
      .eq('slack_connection_id', connection.id)
      .eq('alert_type', 'new_theme')
      .single();

    if (!mapping) {
      return { sent: false, reason: 'no_channel_mapping' };
    }

    const blocks = buildNewThemeAlert(themeData, DASHBOARD_URL);

    await postMessage(
      connection.id,
      {
        channel: mapping.channel_id,
        blocks,
        text: `🆕 New theme detected: "${themeData.theme_name}"`,
      },
      'new_theme',
      themeData.theme_id,
      'theme',
      mapping.mention_users
    );

    return { sent: true };
  } catch (error) {
    console.error('Error sending new theme alert:', error);
    return { sent: false, reason: 'error', error };
  }
}

/**
 * Sends a sentiment drop alert to Slack
 *
 * Call this when overall sentiment decreases significantly
 */
export async function sendSentimentDropAlert(
  projectId: string,
  sentimentData: SentimentDropData
) {
  try {
    const shouldAlert = await shouldAlertSentimentDrop(
      sentimentData.current_sentiment,
      sentimentData.previous_sentiment,
      sentimentData.sample_size,
      projectId
    );

    if (!shouldAlert) {
      return { sent: false, reason: 'rules_not_met' };
    }

    const supabase = await createServerClient();

    const { data: connection } = await supabase
      .from('slack_connections')
      .select('id')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .single();

    if (!connection) {
      return { sent: false, reason: 'no_connection' };
    }

    const canSend = await canSendAlert(
      connection.id,
      'sentiment_drop',
      undefined,
      10080 // 7 day cooldown for sentiment drops
    );

    if (!canSend) {
      return { sent: false, reason: 'cooldown' };
    }

    const { data: mapping } = await supabase
      .from('slack_channel_mappings')
      .select('*')
      .eq('slack_connection_id', connection.id)
      .eq('alert_type', 'sentiment_drop')
      .single();

    if (!mapping) {
      return { sent: false, reason: 'no_channel_mapping' };
    }

    const blocks = buildSentimentDropAlert(sentimentData, DASHBOARD_URL);

    await postMessage(
      connection.id,
      {
        channel: mapping.channel_id,
        blocks,
        text: `📉 Sentiment drop detected: -${sentimentData.drop_percentage.toFixed(1)}%`,
      },
      'sentiment_drop',
      undefined,
      undefined,
      mapping.mention_users
    );

    return { sent: true };
  } catch (error) {
    console.error('Error sending sentiment drop alert:', error);
    return { sent: false, reason: 'error', error };
  }
}

/**
 * Sends a competitive threat alert to Slack
 *
 * Call this when competitor mentions spike in customer feedback
 */
export async function sendCompetitiveThreatAlert(
  projectId: string,
  competitorData: CompetitiveThreatData
) {
  try {
    const shouldAlert = await shouldAlertCompetitiveThreat(
      {
        mention_count: competitorData.mention_count,
        time_window_hours: competitorData.time_window_hours,
        sentiment_change: competitorData.sentiment_trend,
      },
      projectId
    );

    if (!shouldAlert) {
      return { sent: false, reason: 'rules_not_met' };
    }

    const supabase = await createServerClient();

    const { data: connection } = await supabase
      .from('slack_connections')
      .select('id')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .single();

    if (!connection) {
      return { sent: false, reason: 'no_connection' };
    }

    const canSend = await canSendAlert(
      connection.id,
      'competitive_threat',
      competitorData.competitor_name,
      2880 // 48 hour cooldown per competitor
    );

    if (!canSend) {
      return { sent: false, reason: 'cooldown' };
    }

    const { data: mapping } = await supabase
      .from('slack_channel_mappings')
      .select('*')
      .eq('slack_connection_id', connection.id)
      .eq('alert_type', 'competitive_threat')
      .single();

    if (!mapping) {
      return { sent: false, reason: 'no_channel_mapping' };
    }

    const blocks = buildCompetitiveThreatAlert(competitorData, DASHBOARD_URL);

    await postMessage(
      connection.id,
      {
        channel: mapping.channel_id,
        blocks,
        text: `⚔️ Competitive threat: ${competitorData.competitor_name}`,
      },
      'competitive_threat',
      undefined,
      undefined,
      mapping.mention_users
    );

    return { sent: true };
  } catch (error) {
    console.error('Error sending competitive threat alert:', error);
    return { sent: false, reason: 'error', error };
  }
}

/**
 * Gets Slack connection status for a project
 */
export async function getSlackConnectionStatus(projectId: string) {
  const supabase = await createServerClient();

  const { data: connection } = await supabase
    .from('slack_connections')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'active')
    .single();

  return {
    connected: !!connection,
    connection,
  };
}

/**
 * Example: Integration with existing feedback processing
 *
 * Add this to your feedback processing pipeline:
 *
 * ```typescript
 * // After analyzing feedback sentiment and urgency
 * if (feedbackAnalysis.urgency_score >= 4 && feedbackAnalysis.sentiment_score < -0.7) {
 *   await sendCriticalFeedbackAlert(projectId, {
 *     feedback_id: feedback.id,
 *     content: feedback.content,
 *     sentiment_score: feedbackAnalysis.sentiment_score,
 *     urgency_score: feedbackAnalysis.urgency_score,
 *     revenue_risk: calculateRevenueRisk(feedback.user),
 *     platform: feedback.source,
 *     user_name: feedback.user_name,
 *     user_email: feedback.user_email,
 *     theme_name: feedbackAnalysis.primary_theme,
 *     similar_count: await countSimilarIssues(feedback.id),
 *     trend_percentage: await calculateTrendPercentage(theme.id),
 *     detected_keywords: feedbackAnalysis.keywords,
 *     created_at: feedback.created_at,
 *   });
 * }
 * ```
 */
