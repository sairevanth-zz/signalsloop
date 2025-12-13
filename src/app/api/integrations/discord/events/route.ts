/**
 * Discord Interactions Handler (Slash Commands & Bot Mentions)
 *
 * Handles Discord Interactions API for slash commands.
 * Processes commands synchronously to avoid serverless timeout issues.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { parseIntent } from '@/lib/ai/intent-parser';
import { executeAction } from '@/lib/ai/chat-actions';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Discord interaction types
const INTERACTION_TYPES = {
    PING: 1,
    APPLICATION_COMMAND: 2,
    MESSAGE_COMPONENT: 3,
} as const;

// Discord response types
const RESPONSE_TYPES = {
    PONG: 1,
    CHANNEL_MESSAGE_WITH_SOURCE: 4,
} as const;

/**
 * Verify Discord request signature using Ed25519
 */
async function verifyDiscordRequest(
    signature: string | null,
    timestamp: string | null,
    body: string
): Promise<boolean> {
    const publicKey = process.env.DISCORD_PUBLIC_KEY;

    if (!publicKey || !signature || !timestamp) {
        console.error('[Discord] Missing publicKey, signature, or timestamp');
        return false;
    }

    try {
        const key = await crypto.subtle.importKey(
            'raw',
            Buffer.from(publicKey, 'hex'),
            { name: 'Ed25519' },
            false,
            ['verify']
        );

        const isValid = await crypto.subtle.verify(
            'Ed25519',
            key,
            Buffer.from(signature, 'hex'),
            Buffer.from(timestamp + body)
        );

        return isValid;
    } catch (error) {
        console.error('[Discord] Signature verification error:', error);
        return false;
    }
}

/**
 * POST /api/integrations/discord/events
 */
export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();

        // Verify request from Discord
        const signature = request.headers.get('x-signature-ed25519');
        const timestamp = request.headers.get('x-signature-timestamp');

        const isValid = await verifyDiscordRequest(signature, timestamp, rawBody);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const interaction = JSON.parse(rawBody);

        // Handle Discord ping (for URL verification)
        if (interaction.type === INTERACTION_TYPES.PING) {
            return NextResponse.json({ type: RESPONSE_TYPES.PONG });
        }

        // Handle slash commands - return quick static response for now
        if (interaction.type === INTERACTION_TYPES.APPLICATION_COMMAND) {
            const commandName = interaction.data.name;
            console.log(`[Discord] Received command: ${commandName}`);

            // Return immediate static response to test connectivity
            return NextResponse.json({
                type: RESPONSE_TYPES.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `✅ SignalsLoop received your /${commandName} command!\n\n⚠️ AI processing is being configured. Full responses coming soon.`
                },
            });
        }

        // Handle button interactions
        if (interaction.type === INTERACTION_TYPES.MESSAGE_COMPONENT) {
            const action = interaction.data.custom_id?.split(':')[0] || 'unknown';
            const userId = interaction.user?.id || interaction.member?.user?.id;

            return NextResponse.json({
                type: RESPONSE_TYPES.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: `✅ ${action} by <@${userId}>` },
            });
        }

        return NextResponse.json({ type: RESPONSE_TYPES.PONG });
    } catch (error) {
        console.error('[Discord] Error:', error);
        return NextResponse.json(
            { type: RESPONSE_TYPES.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: '❌ Error' } },
            { status: 500 }
        );
    }
}

/**
 * Process a slash command and return the result message
 */
async function processSlashCommand(interaction: any): Promise<string> {
    const commandName = interaction.data.name;
    const options = interaction.data.options || [];
    const guildId = interaction.guild_id;

    console.log(`[Discord] Command: ${commandName}, Guild: ${guildId}`);

    try {
        const supabase = getSupabaseServiceRoleClient();
        if (!supabase) {
            return '❌ Database unavailable';
        }

        // Try to find project for this guild
        const { data: connection } = await supabase
            .from('discord_integrations')
            .select('project_id')
            .eq('guild_id', guildId)
            .single();

        let projectId = connection?.project_id;

        // Fallback: use first available project
        if (!projectId) {
            console.log('[Discord] No guild connection, using fallback project');
            const { data: anyProject } = await supabase
                .from('projects')
                .select('id')
                .limit(1)
                .single();

            if (!anyProject) {
                return '❌ No projects found. Create one at signalsloop.com';
            }
            projectId = anyProject.id;
        }

        // Build query from command
        let query = '';
        switch (commandName) {
            case 'briefing':
                query = "What's happening today?";
                break;
            case 'health':
                query = "How healthy is our product?";
                break;
            case 'insights':
                query = "What are users asking for?";
                break;
            case 'feedback': {
                const action = options.find((o: any) => o.name === 'action')?.value;
                const text = options.find((o: any) => o.name === 'text')?.value || '';

                if (action === 'create') {
                    query = `Create feedback: ${text}`;
                } else if (action === 'search') {
                    query = `Search feedback about ${text}`;
                } else if (action === 'vote') {
                    const priority = options.find((o: any) => o.name === 'priority')?.value || 'important';
                    query = `Vote on ${text} as ${priority}`;
                }
                break;
            }
            default:
                return `Unknown command: ${commandName}`;
        }

        console.log(`[Discord] Query: ${query}`);

        // Parse intent and execute
        const intent = await parseIntent(query);
        console.log(`[Discord] Intent: ${intent.action}`);

        const result = await executeAction(intent, projectId);
        console.log(`[Discord] Success: ${result.success}`);

        return result.message;
    } catch (error) {
        console.error('[Discord] Command error:', error);
        return '❌ Something went wrong. Please try again.';
    }
}
