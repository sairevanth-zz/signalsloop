/**
 * Slack Notifications for User Signups and Intelligence
 *
 * Sends formatted messages to Slack when users sign up with enriched data
 */

import type { EnrichmentResult } from './enrichment';

export interface SignupNotification {
  userId: string;
  email: string;
  name: string | null;
  plan: string;
  enrichment: EnrichmentResult | null;
  timestamp: string;
}

/**
 * Format enrichment data as Slack blocks for rich display
 */
function formatSlackBlocks(notification: SignupNotification) {
  const { email, name, plan, enrichment } = notification;

  const blocks: unknown[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🎉 New User Signup',
        emoji: true
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Email:*\n${email}`
        },
        {
          type: 'mrkdwn',
          text: `*Name:*\n${name || 'Not provided'}`
        },
        {
          type: 'mrkdwn',
          text: `*Plan:*\n${getPlanEmoji(plan)} ${plan}`
        },
        {
          type: 'mrkdwn',
          text: `*Time:*\n${new Date(notification.timestamp).toLocaleString()}`
        }
      ]
    }
  ];

  if (enrichment) {
    // Confidence score indicator
    const confidenceEmoji = getConfidenceEmoji(enrichment.confidence_score);
    const confidencePercent = Math.round(enrichment.confidence_score * 100);

    blocks.push({
      type: 'divider'
    });

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Intelligence Summary* ${confidenceEmoji} (${confidencePercent}% confidence)`
      }
    });

    // Company & Role Information
    const companyFields: Array<{ type: string; text: string }> = [];

    if (enrichment.company_name) {
      companyFields.push({
        type: 'mrkdwn',
        text: `*Company:*\n${enrichment.company_name}`
      });
    }

    if (enrichment.role) {
      companyFields.push({
        type: 'mrkdwn',
        text: `*Role:*\n${enrichment.role}`
      });
    }

    if (enrichment.seniority_level) {
      companyFields.push({
        type: 'mrkdwn',
        text: `*Seniority:*\n${enrichment.seniority_level}`
      });
    }

    if (enrichment.industry) {
      companyFields.push({
        type: 'mrkdwn',
        text: `*Industry:*\n${enrichment.industry}`
      });
    }

    if (companyFields.length > 0) {
      blocks.push({
        type: 'section',
        fields: companyFields
      });
    }

    // Bio
    if (enrichment.bio) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Bio:*\n_${enrichment.bio}_`
        }
      });
    }

    // Social Profiles
    const socialLinks: string[] = [];
    if (enrichment.linkedin_url) {
      socialLinks.push(`<${enrichment.linkedin_url}|LinkedIn>`);
    }
    if (enrichment.github_url) {
      socialLinks.push(`<${enrichment.github_url}|GitHub (@${enrichment.github_username})>`);
    }
    if (enrichment.twitter_url) {
      socialLinks.push(`<${enrichment.twitter_url}|Twitter/X>`);
    }
    if (enrichment.website) {
      socialLinks.push(`<${enrichment.website}|Website>`);
    }

    if (socialLinks.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Links:* ${socialLinks.join(' • ')}`
        }
      });
    }

    // Location
    if (enrichment.location) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `📍 ${enrichment.location}`
          }
        ]
      });
    }

    // Data sources
    if (enrichment.data_sources.length > 0) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_Data sources: ${enrichment.data_sources.join(', ')}_`
          }
        ]
      });
    }
  } else {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '⚠️ _No enrichment data available_'
      }
    });
  }

  return blocks;
}

/**
 * Get emoji for plan type
 */
function getPlanEmoji(plan: string): string {
  switch (plan.toLowerCase()) {
    case 'pro-monthly':
    case 'pro-annual':
      return '💎';
    case 'pro-gift':
      return '🎁';
    case 'pro-discount':
      return '🎟️';
    case 'free':
    default:
      return '🆓';
  }
}

/**
 * Get emoji for confidence score
 */
function getConfidenceEmoji(score: number): string {
  if (score >= 0.8) return '🟢';
  if (score >= 0.5) return '🟡';
  return '🔴';
}

/**
 * Send signup notification to Slack
 */
export async function sendSignupNotification(notification: SignupNotification): Promise<void> {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!slackWebhookUrl) {
    console.log('[Slack] No webhook URL configured, skipping notification');
    return;
  }

  try {
    const blocks = formatSlackBlocks(notification);

    const payload = {
      blocks,
      text: `New signup: ${notification.email} (${notification.plan})`, // Fallback text
    };

    const response = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }

    console.log('[Slack] Notification sent successfully');
  } catch (error) {
    console.error('[Slack] Failed to send notification:', error);
    // Don't throw - we don't want Slack failures to block signup
  }
}

/**
 * Send simple text notification to Slack (for errors or quick messages)
 */
export async function sendSlackMessage(message: string, emoji = '📢'): Promise<void> {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!slackWebhookUrl) {
    console.log('[Slack] No webhook URL configured, skipping message');
    return;
  }

  try {
    const payload = {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} ${message}`
          }
        }
      ],
      text: message
    };

    const response = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }
  } catch (error) {
    console.error('[Slack] Failed to send message:', error);
  }
}
