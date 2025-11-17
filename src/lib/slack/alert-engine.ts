/**
 * Slack Alert Rules Engine
 *
 * Evaluates whether feedback, themes, or events should trigger Slack alerts.
 * Configurable rules reduce noise and amplify important signals.
 */

import { createServerClient } from '@/lib/supabase-client';

export interface CriticalFeedbackRule {
  sentiment_threshold: number; // e.g., -0.7
  keywords: string[]; // e.g., ['churn', 'cancel', 'frustrated']
  urgency_min: number; // 1-5
  revenue_risk_min?: number; // e.g., 1000
}

export interface SentimentDropRule {
  drop_percentage: number; // e.g., 20 (means 20%)
  time_period_days: number; // e.g., 7
  min_sample_size: number; // e.g., 50
}

export interface NewThemeRule {
  min_mentions: number; // e.g., 10
  time_window_hours: number; // e.g., 24
  sentiment_filter?: 'positive' | 'negative' | 'neutral' | 'any';
  min_urgency?: number; // Average urgency threshold
}

export interface CompetitiveThreatRule {
  min_mentions: number; // e.g., 20
  time_window_hours: number; // e.g., 48
  sentiment_spike?: number; // e.g., 0.3 (30% increase)
  competitor_comparison: boolean;
}

export type AlertRuleConfig =
  | CriticalFeedbackRule
  | SentimentDropRule
  | NewThemeRule
  | CompetitiveThreatRule;

/**
 * Gets alert rule configuration for a project
 */
export async function getAlertRule(
  projectId: string,
  ruleType: 'critical_feedback' | 'sentiment_drop' | 'new_theme' | 'competitive_threat'
) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('slack_alert_rules')
    .select('*')
    .eq('project_id', projectId)
    .eq('rule_type', ruleType)
    .eq('enabled', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data;
}

/**
 * Evaluates if feedback should trigger critical alert
 *
 * @param feedback - Feedback object with sentiment, content, etc.
 * @param projectId - Project ID to get rules for
 * @returns true if alert should be sent
 */
export async function shouldAlertCriticalFeedback(
  feedback: {
    content: string;
    sentiment_score: number;
    urgency_score?: number;
    revenue_risk?: number;
  },
  projectId: string
): Promise<boolean> {
  const rule = await getAlertRule(projectId, 'critical_feedback');

  if (!rule) {
    return false; // No rule configured
  }

  const config = rule.config as CriticalFeedbackRule;

  // Check sentiment threshold
  if (feedback.sentiment_score > config.sentiment_threshold) {
    return false; // Not negative enough
  }

  // Check urgency if available
  if (config.urgency_min && feedback.urgency_score) {
    if (feedback.urgency_score < config.urgency_min) {
      return false; // Not urgent enough
    }
  }

  // Check revenue risk if configured
  if (config.revenue_risk_min && feedback.revenue_risk) {
    if (feedback.revenue_risk < config.revenue_risk_min) {
      return false; // Revenue risk too low
    }
  }

  // Check keywords if configured
  if (config.keywords && config.keywords.length > 0) {
    const contentLower = feedback.content.toLowerCase();
    const hasKeyword = config.keywords.some(keyword =>
      contentLower.includes(keyword.toLowerCase())
    );

    if (!hasKeyword) {
      return false; // No critical keywords found
    }
  }

  // All conditions met
  return true;
}

/**
 * Evaluates if sentiment drop should trigger alert
 *
 * @param currentSentiment - Current average sentiment
 * @param previousSentiment - Previous average sentiment
 * @param sampleSize - Number of feedback items in analysis
 * @param projectId - Project ID to get rules for
 * @returns true if alert should be sent
 */
export async function shouldAlertSentimentDrop(
  currentSentiment: number,
  previousSentiment: number,
  sampleSize: number,
  projectId: string
): Promise<boolean> {
  const rule = await getAlertRule(projectId, 'sentiment_drop');

  if (!rule) {
    return false;
  }

  const config = rule.config as SentimentDropRule;

  // Check sample size
  if (sampleSize < config.min_sample_size) {
    return false; // Not enough data
  }

  // Calculate drop percentage
  const dropPercentage =
    ((previousSentiment - currentSentiment) / Math.abs(previousSentiment)) * 100;

  // Check if drop exceeds threshold
  return dropPercentage >= config.drop_percentage;
}

/**
 * Evaluates if new theme should trigger alert
 *
 * @param theme - Theme object with mentions, sentiment, etc.
 * @param projectId - Project ID to get rules for
 * @returns true if alert should be sent
 */
export async function shouldAlertNewTheme(
  theme: {
    mention_count: number;
    avg_sentiment: number;
    first_detected_at: string;
    avg_urgency?: number;
  },
  projectId: string
): Promise<boolean> {
  const rule = await getAlertRule(projectId, 'new_theme');

  if (!rule) {
    return false;
  }

  const config = rule.config as NewThemeRule;

  // Check mention threshold
  if (theme.mention_count < config.min_mentions) {
    return false; // Not enough mentions
  }

  // Check time window
  const themeAge = Date.now() - new Date(theme.first_detected_at).getTime();
  const windowMs = config.time_window_hours * 60 * 60 * 1000;

  if (themeAge > windowMs) {
    return false; // Theme is too old
  }

  // Check sentiment filter if configured
  if (config.sentiment_filter && config.sentiment_filter !== 'any') {
    if (config.sentiment_filter === 'negative' && theme.avg_sentiment >= 0) {
      return false;
    }
    if (config.sentiment_filter === 'positive' && theme.avg_sentiment <= 0) {
      return false;
    }
    if (config.sentiment_filter === 'neutral' && Math.abs(theme.avg_sentiment) > 0.2) {
      return false;
    }
  }

  // Check urgency if configured
  if (config.min_urgency && theme.avg_urgency) {
    if (theme.avg_urgency < config.min_urgency) {
      return false;
    }
  }

  return true;
}

/**
 * Evaluates if competitive activity should trigger alert
 *
 * @param competitorData - Competitor mention data
 * @param projectId - Project ID to get rules for
 * @returns true if alert should be sent
 */
export async function shouldAlertCompetitiveThreat(
  competitorData: {
    mention_count: number;
    time_window_hours: number;
    sentiment_change?: number;
  },
  projectId: string
): Promise<boolean> {
  const rule = await getAlertRule(projectId, 'competitive_threat');

  if (!rule) {
    return false;
  }

  const config = rule.config as CompetitiveThreatRule;

  // Check mention threshold
  if (competitorData.mention_count < config.min_mentions) {
    return false;
  }

  // Check time window matches
  if (competitorData.time_window_hours !== config.time_window_hours) {
    return false;
  }

  // Check sentiment spike if configured
  if (config.sentiment_spike && competitorData.sentiment_change !== undefined) {
    if (competitorData.sentiment_change < config.sentiment_spike) {
      return false;
    }
  }

  return true;
}

/**
 * Updates alert rule configuration
 */
export async function updateAlertRule(
  projectId: string,
  ruleType: string,
  config: AlertRuleConfig,
  enabled: boolean
) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('slack_alert_rules')
    .update({
      config,
      enabled,
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)
    .eq('rule_type', ruleType)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Gets all alert rules for a project
 */
export async function getAllAlertRules(projectId: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('slack_alert_rules')
    .select('*')
    .eq('project_id', projectId)
    .order('rule_type');

  if (error) throw error;
  return data;
}

/**
 * Enables/disables an alert rule
 */
export async function toggleAlertRule(
  projectId: string,
  ruleType: string,
  enabled: boolean
) {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('slack_alert_rules')
    .update({ enabled })
    .eq('project_id', projectId)
    .eq('rule_type', ruleType);

  if (error) throw error;
}

/**
 * Checks if an alert was recently sent to avoid spam
 *
 * @param connectionId - Slack connection ID
 * @param alertType - Type of alert
 * @param entityId - Related entity ID (optional)
 * @param cooldownMinutes - Cooldown period in minutes (default: 60)
 * @returns true if alert can be sent, false if in cooldown
 */
export async function canSendAlert(
  connectionId: string,
  alertType: string,
  entityId?: string,
  cooldownMinutes = 60
): Promise<boolean> {
  const supabase = await createServerClient();

  const cooldownDate = new Date(Date.now() - cooldownMinutes * 60 * 1000);

  let query = supabase
    .from('slack_message_logs')
    .select('id')
    .eq('slack_connection_id', connectionId)
    .eq('alert_type', alertType)
    .eq('success', true)
    .gte('created_at', cooldownDate.toISOString());

  // If entity_id provided, check for that specific entity
  if (entityId) {
    query = query.eq('entity_id', entityId);
  }

  const { data, error } = await query.limit(1);

  if (error) {
    console.error('Error checking alert cooldown:', error);
    return true; // Allow alert on error
  }

  // If we found a recent alert, don't send
  return data.length === 0;
}

/**
 * Marks an alert as acknowledged (updates interaction log)
 */
export async function acknowledgeAlert(
  connectionId: string,
  userId: string,
  messageTs: string,
  entityId: string
) {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('slack_interaction_logs')
    .insert({
      slack_connection_id: connectionId,
      slack_user_id: userId,
      action_id: 'acknowledge_alert',
      payload: { entity_id: entityId, message_ts: messageTs },
      message_ts: messageTs,
    });

  if (error) throw error;
}
