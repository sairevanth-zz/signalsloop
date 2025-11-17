/**
 * Slack Block Kit Message Builders
 *
 * Creates beautiful, interactive messages for different alert types.
 * Uses Slack's Block Kit for rich formatting, buttons, and actions.
 *
 * @see https://api.slack.com/block-kit
 */

import type { Block, KnownBlock } from '@slack/web-api';

export interface CriticalFeedbackData {
  feedback_id: string;
  content: string;
  sentiment_score: number;
  revenue_risk: number;
  platform: string;
  user_name: string;
  user_email?: string;
  theme_name: string;
  similar_count: number;
  urgency_score: number;
  trend_percentage: number;
  detected_keywords: string[];
  created_at: string;
}

export interface NewThemeData {
  theme_id: string;
  theme_name: string;
  description: string;
  mention_count: number;
  avg_sentiment: number;
  time_window: string;
  sources: Array<{ platform: string; count: number }>;
  top_quotes: string[];
  trend: 'rising' | 'stable' | 'falling';
  competitor_comparison?: string;
  first_detected_at: string;
}

export interface SentimentDropData {
  project_name: string;
  current_sentiment: number;
  previous_sentiment: number;
  drop_percentage: number;
  time_period_days: number;
  sample_size: number;
  top_negative_feedback: Array<{
    content: string;
    sentiment: number;
    platform: string;
  }>;
  affected_themes: string[];
}

export interface CompetitiveThreatData {
  competitor_name: string;
  threat_level: 'high' | 'medium' | 'low';
  mention_count: number;
  sentiment_trend: number;
  time_window_hours: number;
  key_features_mentioned: string[];
  user_quotes: string[];
  switching_signals: number;
  recommended_actions: string[];
}

export interface WeeklyDigestData {
  project_name: string;
  week_start: string;
  week_end: string;
  total_feedback: number;
  feedback_change_pct: number;
  overall_sentiment: number;
  sentiment_change: number;
  top_themes: Array<{
    name: string;
    mention_count: number;
    sentiment: number;
    trend: string;
  }>;
  competitive_updates: Array<{
    competitor: string;
    mentions: number;
    change_pct: number;
    highlights: string;
  }>;
  critical_issues: Array<{
    title: string;
    status: string;
    impact: string;
  }>;
  wins: Array<{
    title: string;
    impact: string;
  }>;
  action_items: Array<{
    priority: 'high' | 'medium' | 'low';
    task: string;
    owner?: string;
  }>;
}

/**
 * Builds a critical feedback alert message
 * Used when high-risk feedback is detected (churn risk, high revenue impact)
 */
export function buildCriticalFeedbackAlert(
  data: CriticalFeedbackData,
  dashboardUrl: string
): (Block | KnownBlock)[] {
  const sentimentEmoji =
    data.sentiment_score < -0.7 ? '😡' :
    data.sentiment_score < -0.5 ? '😠' :
    data.sentiment_score < -0.3 ? '😔' : '😐';

  const urgencyEmoji = data.urgency_score >= 5 ? '🔴' : data.urgency_score >= 3 ? '🟡' : '🟢';

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🚨 CRITICAL FEEDBACK ALERT',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*High-Risk Customer Feedback Detected*\nImmediate attention required to prevent churn`,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `${sentimentEmoji} *Sentiment Score:*\n${data.sentiment_score.toFixed(2)} (Very Negative)`,
        },
        {
          type: 'mrkdwn',
          text: `💰 *Revenue at Risk:*\n$${data.revenue_risk.toLocaleString()}/year`,
        },
        {
          type: 'mrkdwn',
          text: `${urgencyEmoji} *Urgency Level:*\n${data.urgency_score}/5 (${data.urgency_score >= 4 ? 'Critical' : 'High'})`,
        },
        {
          type: 'mrkdwn',
          text: `⏱️ *Response Time:*\n< 2 hours recommended`,
        },
      ],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📝 *Customer Feedback:*\n>${data.content.substring(0, 500)}${data.content.length > 500 ? '...' : ''}`,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `📍 *Platform:* ${data.platform}`,
        },
        {
          type: 'mrkdwn',
          text: `👤 *User:* ${data.user_name}`,
        },
        {
          type: 'mrkdwn',
          text: `🏷️ *Theme:* ${data.theme_name}`,
        },
        {
          type: 'mrkdwn',
          text: `📅 *Date:* ${new Date(data.created_at).toLocaleDateString()}`,
        },
      ],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🔍 *Context & Signals:*\n• ${data.similar_count} similar issues reported recently\n• Trend: ${data.trend_percentage > 0 ? '▲' : '▼'} ${Math.abs(data.trend_percentage).toFixed(0)}% vs. last 7 days\n• Keywords detected: ${data.detected_keywords.slice(0, 5).join(', ')}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `⚡ *Recommended Actions:*\n1. 🎫 Create P0 Jira ticket immediately\n2. 📧 Reach out to customer directly\n3. 📢 Post internal acknowledgment\n4. 👥 Escalate to product & engineering`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '🎫 Create Jira Issue',
            emoji: true,
          },
          style: 'primary',
          action_id: 'create_jira_issue',
          value: data.feedback_id,
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '👁️ View in Dashboard',
            emoji: true,
          },
          action_id: 'view_dashboard',
          url: `${dashboardUrl}/feedback/${data.feedback_id}`,
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '✅ Acknowledge',
            emoji: true,
          },
          action_id: 'acknowledge_alert',
          value: data.feedback_id,
        },
      ],
    },
  ];
}

/**
 * Builds a new theme detection alert
 * Used when AI detects emerging patterns in feedback
 */
export function buildNewThemeAlert(
  data: NewThemeData,
  dashboardUrl: string
): (Block | KnownBlock)[] {
  const trendEmoji = data.trend === 'rising' ? '📈' : data.trend === 'falling' ? '📉' : '➡️';
  const sentimentEmoji = data.avg_sentiment > 0 ? '😊' : data.avg_sentiment < -0.3 ? '😔' : '😐';

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🆕 NEW THEME DETECTED',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*"${data.theme_name}"*\n${data.description}`,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `${trendEmoji} *Mentions:*\n${data.mention_count} (${data.time_window})`,
        },
        {
          type: 'mrkdwn',
          text: `${sentimentEmoji} *Avg Sentiment:*\n${data.avg_sentiment.toFixed(2)}`,
        },
        {
          type: 'mrkdwn',
          text: `📊 *Trend:*\n${data.trend.charAt(0).toUpperCase() + data.trend.slice(1)}`,
        },
        {
          type: 'mrkdwn',
          text: `🕐 *First Seen:*\n${new Date(data.first_detected_at).toLocaleDateString()}`,
        },
      ],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📊 *Sources Distribution:*\n${data.sources.map(s => `• ${s.platform}: ${s.count} mentions`).join('\n')}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `💬 *Top User Quotes:*\n${data.top_quotes.slice(0, 3).map((q, i) => `${i + 1}. "${q.substring(0, 150)}${q.length > 150 ? '...' : ''}"`).join('\n\n')}`,
      },
    },
    ...(data.competitor_comparison
      ? [
          {
            type: 'section' as const,
            text: {
              type: 'mrkdwn' as const,
              text: `💡 *Competitive Intelligence:*\n${data.competitor_comparison}`,
            },
          },
        ]
      : []),
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '🎫 Create Epic',
            emoji: true,
          },
          style: 'primary',
          action_id: 'create_epic',
          value: data.theme_id,
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '📊 View Analysis',
            emoji: true,
          },
          action_id: 'view_theme',
          url: `${dashboardUrl}/themes/${data.theme_id}`,
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '🔕 Mute Theme',
            emoji: true,
          },
          action_id: 'mute_theme',
          value: data.theme_id,
        },
      ],
    },
  ];
}

/**
 * Builds a sentiment drop alert
 * Triggered when overall sentiment decreases significantly
 */
export function buildSentimentDropAlert(
  data: SentimentDropData,
  dashboardUrl: string
): (Block | KnownBlock)[] {
  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '📉 SENTIMENT DROP ALERT',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${data.project_name}*\nSignificant decrease in customer sentiment detected`,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `📊 *Current Sentiment:*\n${data.current_sentiment.toFixed(2)}`,
        },
        {
          type: 'mrkdwn',
          text: `📈 *Previous Sentiment:*\n${data.previous_sentiment.toFixed(2)}`,
        },
        {
          type: 'mrkdwn',
          text: `📉 *Drop:*\n-${data.drop_percentage.toFixed(1)}%`,
        },
        {
          type: 'mrkdwn',
          text: `📅 *Time Period:*\n${data.time_period_days} days`,
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📊 *Sample Size:* ${data.sample_size} feedback items analyzed`,
      },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🔍 *Top Negative Feedback:*\n${data.top_negative_feedback.slice(0, 3).map((f, i) => `${i + 1}. (${f.sentiment.toFixed(2)}) ${f.content.substring(0, 100)}... - _${f.platform}_`).join('\n\n')}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🏷️ *Affected Themes:*\n${data.affected_themes.slice(0, 5).join(', ')}`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '📊 View Sentiment Trends',
            emoji: true,
          },
          style: 'primary',
          action_id: 'view_sentiment',
          url: `${dashboardUrl}/analytics/sentiment`,
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '🔍 Investigate',
            emoji: true,
          },
          action_id: 'investigate_drop',
          url: `${dashboardUrl}/feedback?sort=sentiment_asc`,
        },
      ],
    },
  ];
}

/**
 * Builds a competitive threat alert
 * Triggered when competitor mentions spike
 */
export function buildCompetitiveThreatAlert(
  data: CompetitiveThreatData,
  dashboardUrl: string
): (Block | KnownBlock)[] {
  const threatEmoji = data.threat_level === 'high' ? '🔴' : data.threat_level === 'medium' ? '🟡' : '🟢';

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '⚔️ COMPETITIVE THREAT DETECTED',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${data.competitor_name}*\nIncreased competitive activity detected in customer feedback`,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `${threatEmoji} *Threat Level:*\n${data.threat_level.toUpperCase()}`,
        },
        {
          type: 'mrkdwn',
          text: `📊 *Mentions:*\n${data.mention_count} (${data.time_window_hours}h)`,
        },
        {
          type: 'mrkdwn',
          text: `📈 *Sentiment Trend:*\n${data.sentiment_trend > 0 ? '▲' : '▼'} ${Math.abs(data.sentiment_trend).toFixed(1)}%`,
        },
        {
          type: 'mrkdwn',
          text: `⚠️ *Switching Signals:*\n${data.switching_signals} customers`,
        },
      ],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🎯 *Key Features Mentioned:*\n${data.key_features_mentioned.slice(0, 5).map(f => `• ${f}`).join('\n')}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `💬 *Customer Quotes:*\n${data.user_quotes.slice(0, 2).map((q, i) => `${i + 1}. "${q}"`).join('\n\n')}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `⚡ *Recommended Actions:*\n${data.recommended_actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '📊 View Competitor Intel',
            emoji: true,
          },
          style: 'primary',
          action_id: 'view_competitor',
          url: `${dashboardUrl}/competitive/${encodeURIComponent(data.competitor_name)}`,
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '🎯 Create Response Plan',
            emoji: true,
          },
          action_id: 'create_response_plan',
          value: data.competitor_name,
        },
      ],
    },
  ];
}

/**
 * Builds comprehensive weekly digest
 * Sent every Monday morning with weekly summary
 */
export function buildWeeklyDigest(
  data: WeeklyDigestData,
  dashboardUrl: string
): (Block | KnownBlock)[] {
  const sentimentEmoji = data.sentiment_change > 0 ? '📈' : data.sentiment_change < 0 ? '📉' : '➡️';
  const feedbackEmoji = data.feedback_change_pct > 0 ? '📈' : data.feedback_change_pct < 0 ? '📉' : '➡️';

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📊 WEEKLY FEEDBACK DIGEST - ${data.project_name}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Week of ${new Date(data.week_start).toLocaleDateString()} - ${new Date(data.week_end).toLocaleDateString()}*`,
      },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*📈 KEY METRICS*`,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `${feedbackEmoji} *Total Feedback:*\n${data.total_feedback} (${data.feedback_change_pct > 0 ? '+' : ''}${data.feedback_change_pct.toFixed(0)}%)`,
        },
        {
          type: 'mrkdwn',
          text: `${sentimentEmoji} *Avg Sentiment:*\n${data.overall_sentiment.toFixed(2)} (${data.sentiment_change > 0 ? '+' : ''}${data.sentiment_change.toFixed(2)})`,
        },
      ],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🔥 TOP THEMES THIS WEEK*\n${data.top_themes.slice(0, 5).map((t, i) => `${i + 1}. *${t.name}* - ${t.mention_count} mentions (${t.sentiment.toFixed(2)} sentiment) ${t.trend}`).join('\n')}`,
      },
    },
    ...(data.critical_issues.length > 0
      ? [
          { type: 'divider' as const },
          {
            type: 'section' as const,
            text: {
              type: 'mrkdwn' as const,
              text: `*🚨 CRITICAL ISSUES*\n${data.critical_issues.map((i, idx) => `${idx + 1}. *${i.title}* - ${i.status}\n   Impact: ${i.impact}`).join('\n\n')}`,
            },
          },
        ]
      : []),
    ...(data.wins.length > 0
      ? [
          { type: 'divider' as const },
          {
            type: 'section' as const,
            text: {
              type: 'mrkdwn' as const,
              text: `*🎉 WINS & POSITIVE HIGHLIGHTS*\n${data.wins.map((w, i) => `${i + 1}. *${w.title}*\n   ${w.impact}`).join('\n\n')}`,
            },
          },
        ]
      : []),
    ...(data.competitive_updates.length > 0
      ? [
          { type: 'divider' as const },
          {
            type: 'section' as const,
            text: {
              type: 'mrkdwn' as const,
              text: `*⚔️ COMPETITIVE LANDSCAPE*\n${data.competitive_updates.map((c, i) => `${i + 1}. *${c.competitor}* - ${c.mentions} mentions (${c.change_pct > 0 ? '+' : ''}${c.change_pct.toFixed(0)}%)\n   ${c.highlights}`).join('\n\n')}`,
            },
          },
        ]
      : []),
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*✅ ACTION ITEMS FOR THIS WEEK*\n${data.action_items.slice(0, 5).map((a, i) => `${i + 1}. [${a.priority.toUpperCase()}] ${a.task}${a.owner ? ` - @${a.owner}` : ''}`).join('\n')}`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '📊 View Full Dashboard',
            emoji: true,
          },
          style: 'primary',
          action_id: 'view_dashboard',
          url: dashboardUrl,
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '📈 Analytics',
            emoji: true,
          },
          action_id: 'view_analytics',
          url: `${dashboardUrl}/analytics`,
        },
      ],
    },
  ];
}

/**
 * Builds a simple success confirmation message
 */
export function buildSuccessMessage(message: string): (Block | KnownBlock)[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `✅ ${message}`,
      },
    },
  ];
}

/**
 * Builds an error message
 */
export function buildErrorMessage(message: string): (Block | KnownBlock)[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `❌ ${message}`,
      },
    },
  ];
}
