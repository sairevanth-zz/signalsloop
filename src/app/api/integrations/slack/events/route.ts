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
 * GET /api/integrations/slack/events
 * 
 * Health check endpoint - Slack only uses POST, but this helps with debugging
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        endpoint: 'Slack Events API',
        method: 'POST required for events',
        note: 'Slack sends POST requests for events. If you see this, the endpoint is reachable.',
    });
}

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
    const supabase = getSupabaseServiceRoleClient();

    try {
        const rawBody = await request.text();
        console.log('[Slack] Received event, body length:', rawBody.length);

        // Log incoming event for debugging (temporary)
        if (supabase) {
            try {
                await supabase.from('slack_event_logs').insert({
                    event_type: 'incoming',
                    payload: { body_length: rawBody.length, timestamp: new Date().toISOString() },
                });
            } catch {
                // Ignore if table doesn't exist
            }
        }

        // Verify request signature
        const signature = request.headers.get('x-slack-signature');
        const timestamp = request.headers.get('x-slack-request-timestamp');

        console.log('[Slack] Headers - signature:', signature ? 'present' : 'missing', 'timestamp:', timestamp);

        if (!verifySlackRequest(signature, timestamp, rawBody)) {
            console.error('[Slack] Invalid signature');
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 401 }
            );
        }

        console.log('[Slack] Signature verified OK');
        const event = JSON.parse(rawBody);

        // Handle URL verification challenge (required for initial setup)
        if (event.type === 'url_verification') {
            console.log('[Slack] URL verification challenge received');
            return NextResponse.json({ challenge: event.challenge });
        }

        // Handle event callbacks
        if (event.type === 'event_callback') {
            const innerEvent = event.event;
            console.log('[Slack] Event callback:', innerEvent.type, 'text:', innerEvent.text?.substring(0, 50));

            // Handle app_mention events (when someone @mentions the bot)
            if (innerEvent.type === 'app_mention') {
                console.log('[Slack] Processing app_mention');
                await processAppMention(event, innerEvent);
            }

            // Handle direct messages to the bot
            if (innerEvent.type === 'message' && innerEvent.channel_type === 'im') {
                console.log('[Slack] Processing DM');
                await processDirectMessage(event, innerEvent);
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[Slack] Error:', error);
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
    console.log('[Slack] Processing app_mention:', innerEvent.text);

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
        console.error('[Slack] Supabase client not available');
        return;
    }

    const teamId = event.team_id;
    console.log('[Slack] Team ID:', teamId);

    // Get Slack connection for this team
    const { data: connection, error: connError } = await supabase
        .from('slack_connections')
        .select('id, project_id, bot_token_encrypted')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .single();

    if (connError) {
        console.error('[Slack] Connection lookup error:', connError);
    }

    let botToken: string | null = null;
    let projectId: string | null = connection?.project_id || null;

    // Try to get bot token from connection
    if (connection?.bot_token_encrypted) {
        try {
            botToken = decryptToken(connection.bot_token_encrypted);
            console.log('[Slack] Got bot token from connection');
        } catch (error) {
            console.error('[Slack] Failed to decrypt bot token:', error);
        }
    }

    // Fallback: get bot token from env (for testing)
    if (!botToken && process.env.SLACK_BOT_TOKEN) {
        botToken = process.env.SLACK_BOT_TOKEN;
        console.log('[Slack] Using bot token from env');
    }

    // Fallback: get any project if no connection
    if (!projectId) {
        console.log('[Slack] No connection, trying fallback project');
        const { data: anyProject } = await supabase
            .from('projects')
            .select('id')
            .limit(1)
            .single();

        if (anyProject) {
            projectId = anyProject.id;
            console.log('[Slack] Using fallback project:', projectId);
        }
    }

    if (!botToken) {
        console.error('[Slack] No bot token available');
        return;
    }

    if (!projectId) {
        console.error('[Slack] No project ID available');
        await sendSlackMessage(
            botToken,
            innerEvent.channel,
            '❌ SignalsLoop is not connected to any project. Please set up the integration at signalsloop.com',
            innerEvent.thread_ts || innerEvent.ts
        );
        return;
    }

    // Parse the message to extract intent
    console.log('[Slack] Parsing intent...');
    const intent = await parseIntent(innerEvent.text);
    console.log('[Slack] Intent:', intent.action);

    // Log the interaction (ignore errors)
    try {
        if (connection?.id) {
            await supabase.from('slack_interaction_logs').insert({
                slack_connection_id: connection.id,
                slack_user_id: innerEvent.user,
                action_id: `chat:${intent.action}`,
                payload: { text: innerEvent.text, intent },
                message_ts: innerEvent.ts,
                channel_id: innerEvent.channel,
            });
        }
    } catch (e) {
        console.warn('[Slack] Failed to log interaction:', e);
    }

    // If it's an unknown action, just respond with the AI's message
    if (intent.action === 'unknown') {
        await sendSlackMessage(
            botToken,
            innerEvent.channel,
            intent.parameters.response || "I'm not sure what you mean. Try asking for a briefing, health score, or insights!",
            innerEvent.thread_ts || innerEvent.ts
        );
        return;
    }

    // Execute the action
    console.log('[Slack] Executing action...');
    const result = await executeAction(intent, projectId);
    console.log('[Slack] Result:', result.success);

    // Send the result back to Slack
    await sendSlackMessage(
        botToken,
        innerEvent.channel,
        result.message,
        innerEvent.thread_ts || innerEvent.ts
    );
    console.log('[Slack] Message sent');
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

    console.log('[Slack] Processing DM:', innerEvent.text);

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
        console.error('[Slack] Supabase client not available');
        return;
    }

    const teamId = event.team_id;

    // Get Slack connection
    const { data: connection } = await supabase
        .from('slack_connections')
        .select('id, project_id, bot_token_encrypted')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .single();

    let botToken: string | null = null;
    let projectId: string | null = connection?.project_id || null;

    if (connection?.bot_token_encrypted) {
        try {
            botToken = decryptToken(connection.bot_token_encrypted);
        } catch (error) {
            console.error('[Slack] Failed to decrypt bot token:', error);
        }
    }

    // Fallback to env token
    if (!botToken && process.env.SLACK_BOT_TOKEN) {
        botToken = process.env.SLACK_BOT_TOKEN;
    }

    // Fallback project
    if (!projectId) {
        const { data: anyProject } = await supabase
            .from('projects')
            .select('id')
            .limit(1)
            .single();
        projectId = anyProject?.id || null;
    }

    if (!botToken || !projectId) {
        console.error('[Slack] Missing bot token or project ID');
        return;
    }

    // Parse and execute
    const intent = await parseIntent(innerEvent.text);

    try {
        if (connection?.id) {
            await supabase.from('slack_interaction_logs').insert({
                slack_connection_id: connection.id,
                slack_user_id: innerEvent.user,
                action_id: `dm:${intent.action}`,
                payload: { text: innerEvent.text, intent },
                message_ts: innerEvent.ts,
                channel_id: innerEvent.channel,
            });
        }
    } catch (e) {
        // Ignore logging errors
    }

    if (intent.action === 'unknown') {
        await sendSlackMessage(
            botToken,
            innerEvent.channel,
            intent.parameters.response || "I'm not sure what you mean. Try: 'What's the briefing?' or 'Show me insights'"
        );
        return;
    }

    const result = await executeAction(intent, projectId);
    await sendSlackMessage(botToken, innerEvent.channel, result.message);
}
