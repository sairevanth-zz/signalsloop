/**
 * Deal Digest Cron Job
 * Sends daily/weekly digest of new losses + similar open deals at risk
 * Should be triggered daily via cron
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

/**
 * Format digest message for Slack
 */
function formatSlackDigest(projectName: string, digestData: any) {
  const { newLosses, atRiskDeals, topLossReasons, overview } = digestData;

  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📊 Win/Loss Daily Digest - ${projectName}`,
        emoji: true,
      },
    },
  ];

  // Overview stats
  if (overview) {
    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Win Rate:*\n${overview.win_rate}%`,
        },
        {
          type: 'mrkdwn',
          text: `*Revenue Lost (30d):*\n$${Number(overview.revenue_lost).toLocaleString()}`,
        },
        {
          type: 'mrkdwn',
          text: `*Open Deals:*\n${overview.open_deals}`,
        },
        {
          type: 'mrkdwn',
          text: `*Pipeline Value:*\n$${Number(overview.revenue_in_pipeline).toLocaleString()}`,
        },
      ],
    });
  }

  // New losses
  if (newLosses.length > 0) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🔴 New Losses (${newLosses.length})*`,
      },
    });

    newLosses.slice(0, 5).forEach((loss: any) => {
      const reason = loss.primary_reason || 'Unknown';
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `• *${loss.name}* - $${Number(loss.amount).toLocaleString()}\n  _Reason: ${reason}${
            loss.competitor ? ` | Competitor: ${loss.competitor}` : ''
          }_`,
        },
      });
    });
  }

  // At-risk deals
  if (atRiskDeals.length > 0) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*⚠️ Open Deals at Risk (${atRiskDeals.length})*\n_Similar patterns to recent losses_`,
      },
    });

    atRiskDeals.slice(0, 5).forEach((deal: any) => {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `• *${deal.name}* - $${Number(deal.amount).toLocaleString()}\n  _Stage: ${deal.stage}${
            deal.competitor ? ` | Competing with: ${deal.competitor}` : ''
          }_`,
        },
      });
    });
  }

  // Top loss reasons
  if (topLossReasons.length > 0) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Top Loss Reasons (Last 30 days)*',
      },
    });

    const reasonsText = topLossReasons
      .slice(0, 3)
      .map((r: any) => `• ${r.reason}: ${r.count} deals ($${Number(r.revenue).toLocaleString()})`)
      .join('\n');

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: reasonsText,
      },
    });
  }

  return { blocks };
}

/**
 * Send digest to Slack channel
 */
async function sendSlackDigest(webhookUrl: string, message: any) {
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

    return true;
  } catch (error) {
    console.error('[Deal Digest] Error sending to Slack:', error);
    return false;
  }
}

/**
 * Send digest via email (placeholder - integrate with Resend)
 */
async function sendEmailDigest(email: string, projectName: string, digestData: any) {
  // TODO: Integrate with Resend for email sending
  console.log(`[Deal Digest] Would send email to ${email} for project ${projectName}`);
  return true;
}

/**
 * GET /api/cron/deal-digest
 * Triggered by cron daily
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-cron-secret-here';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('[Deal Digest Cron] Starting daily digest generation');

    // Get all active digest subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('deal_digest_subscriptions')
      .select('*, projects(id, name)')
      .eq('active', true)
      .eq('frequency', 'daily');

    if (subsError) {
      throw subsError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Deal Digest Cron] No active subscriptions found');
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions',
        sent: 0,
      });
    }

    console.log(`[Deal Digest Cron] Found ${subscriptions.length} active subscriptions`);

    const results = [];
    let sent = 0;
    let failed = 0;

    // Group subscriptions by project
    const subsByProject = new Map<string, any[]>();
    subscriptions.forEach((sub) => {
      if (!subsByProject.has(sub.project_id)) {
        subsByProject.set(sub.project_id, []);
      }
      subsByProject.get(sub.project_id)!.push(sub);
    });

    // Process each project
    for (const [projectId, projectSubs] of subsByProject.entries()) {
      try {
        const projectName = projectSubs[0].projects?.name || 'Unknown Project';

        console.log(`[Deal Digest Cron] Processing digest for project ${projectId} (${projectName})`);

        // Get overview data
        const { data: overviewData } = await supabase.rpc('get_deals_overview', {
          p_project_id: projectId,
          p_days_back: 1, // Last 24 hours for daily digest
        });

        const overview = overviewData?.[0];

        // Get new losses (last 24 hours)
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const { data: newLosses } = await supabase
          .from('deal_autopsies')
          .select('*, deals!inner(id, name, amount, competitor, closed_at, status, project_id)')
          .eq('deals.project_id', projectId)
          .eq('deals.status', 'lost')
          .gte('deals.closed_at', oneDayAgo.toISOString())
          .order('deals.closed_at', { ascending: false });

        // Get at-risk open deals
        const atRiskDealIds = new Set<string>();
        newLosses?.forEach((autopsy: any) => {
          const similarIds = autopsy.similar_open_deal_ids || [];
          similarIds.forEach((id: string) => atRiskDealIds.add(id));
        });

        const { data: atRiskDeals } =
          atRiskDealIds.size > 0
            ? await supabase
                .from('deals')
                .select('*')
                .in('id', Array.from(atRiskDealIds))
                .order('amount', { ascending: false })
            : { data: [] };

        // Get top loss reasons (last 30 days)
        const { data: topLossReasons } = await supabase
          .from('deal_autopsies')
          .select('primary_reason, deals!inner(amount, project_id)')
          .eq('deals.project_id', projectId);

        const reasonCounts = new Map<string, { count: number; revenue: number }>();
        topLossReasons?.forEach((autopsy: any) => {
          const reason = autopsy.primary_reason || 'other';
          if (!reasonCounts.has(reason)) {
            reasonCounts.set(reason, { count: 0, revenue: 0 });
          }
          const current = reasonCounts.get(reason)!;
          current.count += 1;
          current.revenue += Number(autopsy.deals.amount);
        });

        const topReasons = Array.from(reasonCounts.entries())
          .map(([reason, data]) => ({ reason, ...data }))
          .sort((a, b) => b.count - a.count);

        // Skip digest if no new activity
        if (!newLosses?.length && !atRiskDeals?.length) {
          console.log(`[Deal Digest Cron] No new activity for project ${projectId}, skipping digest`);
          continue;
        }

        const digestData = {
          newLosses: newLosses?.map((a: any) => ({ ...a.deals, ...a })) || [],
          atRiskDeals: atRiskDeals || [],
          topLossReasons: topReasons,
          overview,
        };

        // Send to each subscription
        for (const sub of projectSubs) {
          try {
            if (sub.channel === 'slack') {
              const message = formatSlackDigest(projectName, digestData);
              const success = await sendSlackDigest(sub.destination, message);

              if (success) {
                sent++;
                await supabase
                  .from('deal_digest_subscriptions')
                  .update({ last_sent_at: new Date().toISOString() })
                  .eq('id', sub.id);
              } else {
                failed++;
              }
            } else if (sub.channel === 'email') {
              const success = await sendEmailDigest(sub.destination, projectName, digestData);
              if (success) sent++;
              else failed++;
            }

            results.push({
              projectId,
              projectName,
              channel: sub.channel,
              destination: sub.destination.substring(0, 20) + '...',
              success: true,
              newLosses: newLosses?.length || 0,
              atRiskDeals: atRiskDeals?.length || 0,
            });
          } catch (error) {
            console.error(`[Deal Digest Cron] Error sending to ${sub.channel}:`, error);
            failed++;
            results.push({
              projectId,
              channel: sub.channel,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        // Small delay between projects
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[Deal Digest Cron] Error processing project ${projectId}:`, error);
        failed++;
      }
    }

    console.log(`[Deal Digest Cron] Completed: ${sent} sent, ${failed} failed`);

    return NextResponse.json({
      success: true,
      message: `Sent ${sent} digest(s)`,
      sent,
      failed,
      results,
    });
  } catch (error) {
    console.error('[Deal Digest Cron] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Deal digest cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
