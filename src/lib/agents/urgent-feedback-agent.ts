/**
 * Urgent Feedback Agent (Phase 3)
 *
 * Listens to: sentiment.analyzed
 * Actions: Alerts PM/team when very negative feedback is detected
 * Triggers: No events (terminal agent)
 *
 * This agent ensures critical user issues get immediate attention
 */

import { DomainEvent } from '@/lib/events/types';
import { getServiceRoleClient } from '@/lib/supabase-singleton';

// Threshold for urgent alerts (very negative sentiment)
const URGENT_SENTIMENT_THRESHOLD = -0.7;

/**
 * Handle sentiment.analyzed event
 * Alert on very negative feedback that needs immediate attention
 */
export async function handleUrgentFeedback(event: DomainEvent): Promise<void> {
  const startTime = Date.now();
  const { payload, metadata } = event;

  const sentimentScore = payload.sentiment_score;

  // Only process very negative feedback
  if (sentimentScore >= URGENT_SENTIMENT_THRESHOLD) {
    return;
  }

  console.log(`[URGENT FEEDBACK AGENT] 🚨 Very negative feedback detected: ${sentimentScore}`);

  try {
    const supabase = getServiceRoleClient();

    // Get full post details
    const { data: post } = await supabase
      .from('posts')
      .select('id, title, content, category, vote_count, user_id, project_id, created_at')
      .eq('id', payload.post_id)
      .single();

    if (!post) {
      console.log('[URGENT FEEDBACK AGENT] ⏭️  Post not found');
      return;
    }

    // Get project details
    const { data: project } = await supabase
      .from('projects')
      .select('name, slug, owner_id, settings')
      .eq('id', post.project_id)
      .single();

    if (!project) {
      console.log('[URGENT FEEDBACK AGENT] ⏭️  Project not found');
      return;
    }

    // Check if urgent alerts are enabled
    const urgentAlertsEnabled = project.settings?.notifications?.urgent_alerts?.enabled !== false; // Default true
    if (!urgentAlertsEnabled) {
      console.log('[URGENT FEEDBACK AGENT] ⏭️  Urgent alerts disabled for project');
      return;
    }

    // Determine urgency level
    const urgencyLevel = sentimentScore <= -0.9 ? 'critical' : 'high';
    const emoji = urgencyLevel === 'critical' ? '🔴' : '🟠';

    const postUrl = `/${project.slug}/feedback/${post.id}`;

    // Prepare alert message
    const message = {
      channel: project.settings?.notifications?.slack?.channel || '#product',
      text: `${emoji} URGENT: Very negative feedback - "${post.title}"`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} ${urgencyLevel === 'critical' ? 'CRITICAL' : 'URGENT'}: Negative Feedback Alert`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${post.title}*\n\n${post.content?.substring(0, 300)}${post.content && post.content.length > 300 ? '...' : ''}`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Sentiment Score:*\n${sentimentScore.toFixed(2)} (${payload.sentiment_category})`,
            },
            {
              type: 'mrkdwn',
              text: `*Emotional Tone:*\n${payload.emotional_tone}`,
            },
            {
              type: 'mrkdwn',
              text: `*Category:*\n${post.category || 'General'}`,
            },
            {
              type: 'mrkdwn',
              text: `*Votes:*\n${post.vote_count || 0}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `⚠️ *Recommended Actions:*\n• Review and respond within 24 hours\n• Check for similar complaints\n• Consider priority escalation`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🔍 View Feedback',
              },
              url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://signalsloop.com'}${postUrl}`,
              style: urgencyLevel === 'critical' ? 'danger' : 'primary',
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '📊 View Similar',
              },
              url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://signalsloop.com'}/${project.slug}/feedback?sentiment=negative`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `🤖 Auto-detected by SignalsLoop AI • Sentiment analysis confidence: ${((payload.confidence_score || 0) * 100).toFixed(0)}%`,
            },
          ],
        },
      ],
    };

    // Send Slack alert if configured
    if (project.settings?.notifications?.slack?.webhook_url) {
      await sendSlackAlert(project.settings.notifications.slack.webhook_url, message);
    }

    // Log urgent feedback for tracking
    await supabase.from('urgent_feedback_log').insert({
      post_id: post.id,
      project_id: post.project_id,
      sentiment_score: sentimentScore,
      urgency_level: urgencyLevel,
      alerted_at: new Date().toISOString(),
    }).catch((error) => {
      // Table might not exist yet - that's okay
      console.log('[URGENT FEEDBACK AGENT] Note: urgent_feedback_log table not found (optional)');
    });

    const duration = Date.now() - startTime;
    console.log(`[URGENT FEEDBACK AGENT] ✅ Alert sent in ${duration}ms (urgency: ${urgencyLevel})`);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[URGENT FEEDBACK AGENT] ❌ Error after ${duration}ms:`, error);
  }
}

/**
 * Send Slack alert for urgent feedback
 */
async function sendSlackAlert(webhookUrl: string, message: any): Promise<void> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }

    console.log('[URGENT FEEDBACK AGENT] ✅ Slack alert sent');
  } catch (error) {
    console.error('[URGENT FEEDBACK AGENT] ❌ Failed to send Slack alert:', error);
  }
}

/**
 * Check if user has history of negative feedback
 * Used for identifying chronically unhappy users
 */
export async function checkUserSentimentHistory(userId: string, projectId: string): Promise<{
  isAtRisk: boolean;
  negativeCount: number;
  totalCount: number;
}> {
  const supabase = getServiceRoleClient();

  // Get user's recent feedback with sentiment
  const { data: userFeedback } = await supabase
    .from('posts')
    .select(`
      id,
      sentiment_analysis (
        sentiment_score
      )
    `)
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!userFeedback || userFeedback.length === 0) {
    return { isAtRisk: false, negativeCount: 0, totalCount: 0 };
  }

  const negativeCount = userFeedback.filter(
    (f: any) => f.sentiment_analysis?.[0]?.sentiment_score < -0.3
  ).length;

  const totalCount = userFeedback.length;
  const negativeRatio = negativeCount / totalCount;

  // User is at risk if >60% of recent feedback is negative
  const isAtRisk = negativeRatio > 0.6 && totalCount >= 3;

  return { isAtRisk, negativeCount, totalCount };
}
