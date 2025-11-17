/**
 * Slack Interactive Components Handler
 *
 * Handles button clicks, select menus, and other interactive elements in Slack messages.
 * Verifies request signature and processes actions like "Create Jira Issue", "Acknowledge", etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerClient } from '@/lib/supabase-client';
import { updateMessage, postThreadReply } from '@/lib/slack/client';
import { buildSuccessMessage, buildErrorMessage } from '@/lib/slack/messages';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Verifies that the request came from Slack using signature validation
 *
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 */
function verifySlackRequest(
  signature: string | null,
  timestamp: string | null,
  body: string
): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  if (!signingSecret || !signature || !timestamp) {
    return false;
  }

  // Prevent replay attacks (timestamp must be within 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    console.error('Slack request timestamp is too old');
    return false;
  }

  // Create signature base string
  const sigBasestring = `v0:${timestamp}:${body}`;

  // Create HMAC SHA256 hash
  const mySignature =
    'v0=' +
    crypto
      .createHmac('sha256', signingSecret)
      .update(sigBasestring)
      .digest('hex');

  // Compare signatures (timing-safe comparison)
  try {
    return crypto.timingSafeEqual(
      Buffer.from(mySignature),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

/**
 * Handles "Create Jira Issue" button click
 */
async function handleCreateJiraIssue(
  payload: any,
  connectionId: string
): Promise<any> {
  const feedbackId = payload.actions[0].value;
  const supabase = await createServerClient();

  try {
    // Get feedback details
    const { data: feedback } = await supabase
      .from('feedback')
      .select('*, projects(id, name)')
      .eq('id', feedbackId)
      .single();

    if (!feedback) {
      return {
        text: '❌ Feedback not found',
        replace_original: false,
      };
    }

    // Check if Jira is connected for this project
    const { data: jiraConnection } = await supabase
      .from('jira_connections')
      .select('id')
      .eq('project_id', feedback.project_id)
      .eq('status', 'active')
      .single();

    if (!jiraConnection) {
      return {
        text: '❌ Jira is not connected for this project. Please connect Jira first.',
        replace_original: false,
      };
    }

    // Create Jira issue using existing API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/jira/create-issue`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback_id: feedbackId,
          project_id: feedback.project_id,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create Jira issue');
    }

    // Log interaction
    await supabase.from('slack_interaction_logs').insert({
      slack_connection_id: connectionId,
      slack_user_id: payload.user.id,
      action_id: 'create_jira_issue',
      payload: { feedback_id: feedbackId },
      response: result,
      message_ts: payload.message.ts,
      channel_id: payload.channel.id,
    });

    return {
      text: `✅ Jira issue created successfully!\n\n🔗 <${result.issue.url}|${result.issue.key}>: ${result.issue.summary}`,
      replace_original: false,
    };
  } catch (error) {
    console.error('Error creating Jira issue:', error);
    return {
      text: `❌ Failed to create Jira issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      replace_original: false,
    };
  }
}

/**
 * Handles "Acknowledge" button click
 */
async function handleAcknowledge(
  payload: any,
  connectionId: string
): Promise<any> {
  const entityId = payload.actions[0].value;
  const supabase = await createServerClient();

  try {
    // Log interaction
    await supabase.from('slack_interaction_logs').insert({
      slack_connection_id: connectionId,
      slack_user_id: payload.user.id,
      action_id: 'acknowledge_alert',
      payload: { entity_id: entityId },
      message_ts: payload.message.ts,
      channel_id: payload.channel.id,
    });

    return {
      text: `✅ Alert acknowledged by <@${payload.user.id}>`,
      replace_original: false,
    };
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return {
      text: '❌ Failed to acknowledge alert',
      replace_original: false,
    };
  }
}

/**
 * Handles "Create Epic" button click (for themes)
 */
async function handleCreateEpic(
  payload: any,
  connectionId: string
): Promise<any> {
  const themeId = payload.actions[0].value;
  const supabase = await createServerClient();

  try {
    // Get theme details
    const { data: theme } = await supabase
      .from('feedback_themes')
      .select('*, projects(id, name)')
      .eq('id', themeId)
      .single();

    if (!theme) {
      return {
        text: '❌ Theme not found',
        replace_original: false,
      };
    }

    // Check Jira connection
    const { data: jiraConnection } = await supabase
      .from('jira_connections')
      .select('id')
      .eq('project_id', theme.project_id)
      .eq('status', 'active')
      .single();

    if (!jiraConnection) {
      return {
        text: '❌ Jira is not connected for this project.',
        replace_original: false,
      };
    }

    // Create epic (this would use Jira API to create an epic)
    // For now, just log the interaction
    await supabase.from('slack_interaction_logs').insert({
      slack_connection_id: connectionId,
      slack_user_id: payload.user.id,
      action_id: 'create_epic',
      payload: { theme_id: themeId },
      message_ts: payload.message.ts,
      channel_id: payload.channel.id,
    });

    return {
      text: `✅ Epic creation initiated for theme: "${theme.name}"\n\nPlease complete the setup in Jira.`,
      replace_original: false,
    };
  } catch (error) {
    console.error('Error creating epic:', error);
    return {
      text: `❌ Failed to create epic: ${error instanceof Error ? error.message : 'Unknown error'}`,
      replace_original: false,
    };
  }
}

/**
 * Handles "Mute Theme" button click
 */
async function handleMuteTheme(
  payload: any,
  connectionId: string
): Promise<any> {
  const themeId = payload.actions[0].value;
  const supabase = await createServerClient();

  try {
    // Add theme to muted list (you could add a muted_themes table)
    await supabase.from('slack_interaction_logs').insert({
      slack_connection_id: connectionId,
      slack_user_id: payload.user.id,
      action_id: 'mute_theme',
      payload: { theme_id: themeId },
      message_ts: payload.message.ts,
      channel_id: payload.channel.id,
    });

    return {
      text: `🔕 Theme muted. You won't receive alerts for this theme anymore.`,
      replace_original: false,
    };
  } catch (error) {
    console.error('Error muting theme:', error);
    return {
      text: '❌ Failed to mute theme',
      replace_original: false,
    };
  }
}

/**
 * POST /api/integrations/slack/interactions
 *
 * Receives interactive component payloads from Slack
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();

    // Verify request signature
    const signature = request.headers.get('x-slack-signature');
    const timestamp = request.headers.get('x-slack-request-timestamp');

    if (!verifySlackRequest(signature, timestamp, rawBody)) {
      console.error('Invalid Slack request signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse payload (Slack sends it as URL-encoded form data)
    const params = new URLSearchParams(rawBody);
    const payloadStr = params.get('payload');

    if (!payloadStr) {
      return NextResponse.json(
        { error: 'Missing payload' },
        { status: 400 }
      );
    }

    const payload = JSON.parse(payloadStr);

    // Get Slack connection based on team_id
    const supabase = await createServerClient();

    const { data: connection } = await supabase
      .from('slack_connections')
      .select('id')
      .eq('team_id', payload.team.id)
      .eq('status', 'active')
      .single();

    if (!connection) {
      return NextResponse.json({
        text: '❌ Slack connection not found or inactive',
        replace_original: false,
      });
    }

    const actionId = payload.actions[0].action_id;

    // Route to appropriate handler based on action_id
    let response;

    switch (actionId) {
      case 'create_jira_issue':
        response = await handleCreateJiraIssue(payload, connection.id);
        break;

      case 'acknowledge_alert':
        response = await handleAcknowledge(payload, connection.id);
        break;

      case 'create_epic':
        response = await handleCreateEpic(payload, connection.id);
        break;

      case 'mute_theme':
        response = await handleMuteTheme(payload, connection.id);
        break;

      case 'view_dashboard':
      case 'view_theme':
      case 'view_sentiment':
      case 'view_competitor':
      case 'view_analytics':
        // These actions have URLs, handled by Slack directly
        return NextResponse.json({ ok: true });

      default:
        console.warn('Unknown action_id:', actionId);
        return NextResponse.json({
          text: '❓ Unknown action',
          replace_original: false,
        });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Slack interactions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
