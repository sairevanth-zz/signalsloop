/**
 * Slack Events API Handler
 *
 * Handles incoming events from Slack, particularly @mentions of the bot.
 * When a user mentions @SignalsLoop, this handler:
 * 1. Verifies the request signature
 * 2. Parses the message using AI (Claude/GPT-4)
 * 3. Executes the appropriate action
 * 4. Responds in the same channel/thread
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { parseIntent, formatActionDescription } from '@/lib/ai/intent-parser';
import { executeAction } from '@/lib/ai/chat-actions';
import { decryptToken } from '@/lib/encryption';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow longer for AI processing

/**
 * Verify Slack request signature
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

    // Prevent replay attacks
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
        console.error('Slack request timestamp is too old');
        return false;
    }

    const sigBasestring = `v0:${timestamp}:${body}`;
    const mySignature =
        'v0=' +
        crypto
            .createHmac('sha256', signingSecret)
            .update(sigBasestring)
            .digest('hex');

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
 * Send a message to Slack
 */
async function sendSlackMessage(
    token: string,
    channel: string,
    text: string,
    threadTs?: string
): Promise<void> {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            channel,
            text,
            thread_ts: threadTs, // Reply in thread if specified
            unfurl_links: false,
            unfurl_media: false,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('Failed to send Slack message:', error);
    }
}

/**
 * POST /api/integrations/slack/events
 *
 * Receives events from Slack Events API
 */
export async function POST(request: NextRequest) {
    try {
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

        const event = JSON.parse(rawBody);

        // Handle URL verification challenge (required for initial setup)
        if (event.type === 'url_verification') {
            return NextResponse.json({ challenge: event.challenge });
        }

        // Handle event callbacks
        if (event.type === 'event_callback') {
            const innerEvent = event.event;

            // Only handle app_mention events (when someone @mentions the bot)
            if (innerEvent.type === 'app_mention') {
                // Process asynchronously to respond within 3 seconds
                processAppMention(event, innerEvent).catch((error) => {
                    console.error('Error processing app mention:', error);
                });
            }

            // Handle direct messages to the bot
            if (innerEvent.type === 'message' && innerEvent.channel_type === 'im') {
                processDirectMessage(event, innerEvent).catch((error) => {
                    console.error('Error processing direct message:', error);
                });
            }
        }

        // Respond immediately (Slack requires response within 3 seconds)
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Slack events error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Process an app_mention event
 */
async function processAppMention(
    event: any,
    innerEvent: {
        text: string;
        channel: string;
        ts: string;
        thread_ts?: string;
        user: string;
    }
): Promise<void> {
    const supabase = getSupabaseServiceRoleClient();
    const teamId = event.team_id;

    // Get Slack connection for this team
    const { data: connection } = await supabase
        .from('slack_connections')
        .select('id, project_id, bot_token_encrypted')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .single();

    if (!connection) {
        console.error('No active Slack connection found for team:', teamId);
        return;
    }

    // Decrypt bot token
    let botToken: string;
    try {
        botToken = decryptToken(connection.bot_token_encrypted);
    } catch (error) {
        console.error('Failed to decrypt bot token:', error);
        return;
    }

    // Parse the message to extract intent
    const intent = await parseIntent(innerEvent.text);

    // Log the interaction
    await supabase.from('slack_interaction_logs').insert({
        slack_connection_id: connection.id,
        slack_user_id: innerEvent.user,
        action_id: `chat:${intent.action}`,
        payload: {
            text: innerEvent.text,
            intent: intent,
        },
        message_ts: innerEvent.ts,
        channel_id: innerEvent.channel,
    });

    // If it's an unknown action, just respond with the AI's message
    if (intent.action === 'unknown') {
        await sendSlackMessage(
            botToken,
            innerEvent.channel,
            intent.parameters.response,
            innerEvent.thread_ts || innerEvent.ts
        );
        return;
    }

    // Execute the action
    const result = await executeAction(intent, connection.project_id);

    // Send the result back to Slack
    await sendSlackMessage(
        botToken,
        innerEvent.channel,
        result.message,
        innerEvent.thread_ts || innerEvent.ts
    );
}

/**
 * Process a direct message to the bot
 */
async function processDirectMessage(
    event: any,
    innerEvent: {
        text: string;
        channel: string;
        ts: string;
        user: string;
    }
): Promise<void> {
    // Skip bot's own messages
    if (innerEvent.user === event.authorizations?.[0]?.user_id) {
        return;
    }

    const supabase = getSupabaseServiceRoleClient();
    const teamId = event.team_id;

    // Get Slack connection
    const { data: connection } = await supabase
        .from('slack_connections')
        .select('id, project_id, bot_token_encrypted')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .single();

    if (!connection) {
        console.error('No active Slack connection found for team:', teamId);
        return;
    }

    let botToken: string;
    try {
        botToken = decryptToken(connection.bot_token_encrypted);
    } catch (error) {
        console.error('Failed to decrypt bot token:', error);
        return;
    }

    // Parse and execute
    const intent = await parseIntent(innerEvent.text);

    await supabase.from('slack_interaction_logs').insert({
        slack_connection_id: connection.id,
        slack_user_id: innerEvent.user,
        action_id: `dm:${intent.action}`,
        payload: {
            text: innerEvent.text,
            intent: intent,
        },
        message_ts: innerEvent.ts,
        channel_id: innerEvent.channel,
    });

    if (intent.action === 'unknown') {
        await sendSlackMessage(
            botToken,
            innerEvent.channel,
            intent.parameters.response
        );
        return;
    }

    const result = await executeAction(intent, connection.project_id);

    await sendSlackMessage(botToken, innerEvent.channel, result.message);
}
