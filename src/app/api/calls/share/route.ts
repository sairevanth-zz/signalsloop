/**
 * Call Audit Share API
 * POST /api/calls/share
 *
 * Shares call audit summary to Slack or email
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, channel } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    if (channel !== 'slack' && channel !== 'email') {
      return NextResponse.json(
        { error: 'channel must be slack or email' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Verify project access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, slug')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch summary data
    const summaryResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/calls/summary?projectId=${projectId}`,
      { headers: request.headers }
    );

    if (!summaryResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch summary data' },
        { status: 500 }
      );
    }

    const { summary } = await summaryResponse.json();

    if (channel === 'slack') {
      await sendSlackNotification(project, summary);
    } else if (channel === 'email') {
      await sendEmailNotification(project, summary);
    }

    return NextResponse.json({
      success: true,
      message: `Call audit shared to ${channel}`,
    });
  } catch (error) {
    console.error('[Call Share] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function sendSlackNotification(project: any, summary: any) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error('SLACK_WEBHOOK_URL not configured');
  }

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📞 Call Audit: ${project.name}`,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Total Calls:*\n${summary.total_calls}`,
        },
        {
          type: 'mrkdwn',
          text: `*Analyzed:*\n${summary.analyzed_calls}`,
        },
        {
          type: 'mrkdwn',
          text: `*Expansion Revenue:*\n$${summary.expansion_revenue.toLocaleString()}`,
        },
        {
          type: 'mrkdwn',
          text: `*Churn Risk:*\n$${summary.churn_risk_revenue.toLocaleString()}`,
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
        text: `*Top Insights:*\n${summary.top_insights.slice(0, 5).map((insight: string, i: number) => `${i + 1}. ${insight}`).join('\n')}`,
      },
    },
  ];

  if (summary.top_objections.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Top Objections:*\n${summary.top_objections.slice(0, 3).map((obj: any, i: number) => `${i + 1}. ${obj.type} (${obj.count} mentions)`).join('\n')}`,
      },
    });
  }

  if (summary.top_competitors.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Competitors:*\n${summary.top_competitors.slice(0, 3).map((comp: any, i: number) => `${i + 1}. ${comp.name} (${comp.mentions} mentions)`).join('\n')}`,
      },
    });
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      blocks,
      text: `Call Audit for ${project.name}`,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send Slack notification');
  }
}

async function sendEmailNotification(project: any, summary: any) {
  // Email notification implementation
  // This would integrate with Resend or another email service
  console.log('[Call Share] Email notification not yet implemented');
  throw new Error('Email notifications not yet implemented');
}
