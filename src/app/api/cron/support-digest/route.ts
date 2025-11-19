/**
 * Support Ticket Daily Digest Cron Job
 * GET /api/cron/support-digest
 *
 * Sends daily Slack digest with:
 * - Top 3 themes from support tickets
 * - ARR at risk
 * - Sentiment trends
 * - Actionable recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface ProjectDigest {
  project_id: string;
  project_name: string;
  top_themes: Array<{
    theme_name: string;
    description: string;
    count: number;
    avg_sentiment: number;
    arr_at_risk: number;
  }>;
  total_arr_at_risk: number;
  total_tickets: number;
  sentiment_breakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

export async function GET(request: NextRequest) {
  console.log('[Cron: Support Digest] Starting daily digest job...');

  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron: Support Digest] Unauthorized access attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all projects with support tickets
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .order('created_at', { ascending: false });

    if (projectsError || !projects || projects.length === 0) {
      console.log('[Cron: Support Digest] No projects found');
      return NextResponse.json({
        success: true,
        message: 'No projects found',
        digests_sent: 0,
      });
    }

    console.log(`[Cron: Support Digest] Processing ${projects.length} projects`);

    const digests: ProjectDigest[] = [];

    // Generate digest for each project
    for (const project of projects) {
      try {
        // Fetch summary for last 7 days
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/support/summary?projectId=${project.id}&days=7`,
          {
            headers: {
              'Authorization': `Bearer ${cronSecret}`,
            },
          }
        );

        if (!response.ok) {
          console.warn(`[Cron: Support Digest] Failed to fetch summary for ${project.name}`);
          continue;
        }

        const data = await response.json();

        if (!data.success || !data.summary) {
          continue;
        }

        const summary = data.summary;

        // Only send digest if there are tickets
        if (summary.overview.total_tickets === 0) {
          continue;
        }

        // Calculate sentiment breakdown
        const sentimentBreakdown = summary.sentiment_trend.reduce(
          (acc: any, day: any) => ({
            positive: acc.positive + day.positive,
            negative: acc.negative + day.negative,
            neutral: acc.neutral + day.neutral,
          }),
          { positive: 0, negative: 0, neutral: 0 }
        );

        const digest: ProjectDigest = {
          project_id: project.id,
          project_name: project.name,
          top_themes: summary.top_themes.slice(0, 3),
          total_arr_at_risk: summary.overview.total_arr_at_risk,
          total_tickets: summary.overview.total_tickets,
          sentiment_breakdown: sentimentBreakdown,
        };

        digests.push(digest);
      } catch (error) {
        console.error(`[Cron: Support Digest] Error processing project ${project.name}:`, error);
      }
    }

    console.log(`[Cron: Support Digest] Generated ${digests.length} digests`);

    // Send Slack notifications
    let sentCount = 0;
    for (const digest of digests) {
      try {
        await sendSlackDigest(digest);
        sentCount++;
      } catch (error) {
        console.error(`[Cron: Support Digest] Error sending digest for ${digest.project_name}:`, error);
      }
    }

    console.log(`[Cron: Support Digest] Sent ${sentCount} digests`);

    return NextResponse.json({
      success: true,
      message: `Sent ${sentCount} support digests`,
      digests_sent: sentCount,
      projects_processed: projects.length,
    });

  } catch (error) {
    console.error('[Cron: Support Digest] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send support digests',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Send Slack digest using webhook
 */
async function sendSlackDigest(digest: ProjectDigest) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('[Cron: Support Digest] SLACK_WEBHOOK_URL not configured, skipping Slack notification');
    return;
  }

  // Calculate sentiment percentage
  const totalSentiment =
    digest.sentiment_breakdown.positive +
    digest.sentiment_breakdown.negative +
    digest.sentiment_breakdown.neutral;

  const positivePercent = totalSentiment > 0
    ? Math.round((digest.sentiment_breakdown.positive / totalSentiment) * 100)
    : 0;

  const negativePercent = totalSentiment > 0
    ? Math.round((digest.sentiment_breakdown.negative / totalSentiment) * 100)
    : 0;

  // Build Slack blocks
  const blocks: unknown[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📊 Daily Support Digest: ${digest.project_name}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Total Tickets (7d):*\n${digest.total_tickets}`,
        },
        {
          type: 'mrkdwn',
          text: `*ARR at Risk:*\n$${digest.total_arr_at_risk.toFixed(0)}`,
        },
        {
          type: 'mrkdwn',
          text: `*Positive Sentiment:*\n${positivePercent}%`,
        },
        {
          type: 'mrkdwn',
          text: `*Negative Sentiment:*\n${negativePercent}%`,
        },
      ],
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*🔥 Top 3 Support Themes*',
      },
    },
  ];

  // Add top themes
  digest.top_themes.forEach((theme, index) => {
    const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
    const sentimentEmoji = theme.avg_sentiment >= 0 ? '😊' : theme.avg_sentiment > -0.5 ? '😐' : '😞';

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} *${theme.theme_name}* ${sentimentEmoji}\n` +
              `_${theme.description}_\n` +
              `• ${theme.count} tickets • Sentiment: ${theme.avg_sentiment.toFixed(2)}` +
              (theme.arr_at_risk > 0 ? ` • $${theme.arr_at_risk.toFixed(0)} at risk` : ''),
      },
    });
  });

  // Add action button
  blocks.push(
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '💡 *Recommendation:* Review these themes and consider adding them to your product roadmap.',
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Full Dashboard',
            emoji: true,
          },
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.signalsloop.com'}/app/support?projectId=${digest.project_id}`,
          style: 'primary',
        },
      ],
    }
  );

  // Send to Slack
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ blocks }),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook failed: ${response.statusText}`);
  }

  console.log(`[Cron: Support Digest] Sent Slack digest for ${digest.project_name}`);
}
