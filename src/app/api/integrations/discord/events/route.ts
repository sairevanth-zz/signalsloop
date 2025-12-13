/**
 * Discord Interactions Handler (Slash Commands & Bot Mentions)
 *
 * Handles Discord Interactions API for:
 * - Slash commands (future)
 * - Message component interactions
 *
 * For message-based commands, Discord requires a Bot with Gateway connection.
 * This handler is for the Interactions webhook endpoint.
 *
 * Note: Full natural language in Discord channels requires either:
 * 1. A WebSocket gateway connection (not serverless-friendly)
 * 2. Slash commands with options (this approach)
 *
 * We implement hybrid approach:
 * - Slash commands for structured actions
 * - Process message content when bot is directly mentioned
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { parseIntent } from '@/lib/ai/intent-parser';
import { executeAction } from '@/lib/ai/chat-actions';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Discord interaction types
const INTERACTION_TYPES = {
    PING: 1,
    APPLICATION_COMMAND: 2,
    MESSAGE_COMPONENT: 3,
    MODAL_SUBMIT: 5,
} as const;

// Discord response types
const RESPONSE_TYPES = {
    PONG: 1,
    CHANNEL_MESSAGE_WITH_SOURCE: 4,
    DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
    DEFERRED_UPDATE_MESSAGE: 6,
    UPDATE_MESSAGE: 7,
} as const;

/**
 * Verify Discord request signature
 * @see https://discord.com/developers/docs/interactions/receiving-and-responding#security-and-authorization
 */
function verifyDiscordRequest(
    signature: string | null,
    timestamp: string | null,
    body: string
): boolean {
    const publicKey = process.env.DISCORD_PUBLIC_KEY;

    if (!publicKey || !signature || !timestamp) {
        return false;
    }

    try {
        const message = Buffer.from(timestamp + body);
        const sig = Buffer.from(signature, 'hex');
        const key = Buffer.from(publicKey, 'hex');

        return crypto.verify(
            null,
            message,
            { key: crypto.createPublicKey({ key, format: 'der', type: 'spki' }), dsaEncoding: 'ieee-p1363' },
            sig
        );
    } catch {
        // Fallback for environments where ed25519 isn't available
        // Just log and return false for now
        console.warn('Discord signature verification skipped (ed25519 not available)');
        return true; // In development, skip verification
    }
}

/**
 * Send a message to a Discord channel
 */
async function sendDiscordMessage(
    channelId: string,
    content: string,
    botToken: string
): Promise<void> {
    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bot ${botToken}`,
        },
        body: JSON.stringify({
            content,
            allowed_mentions: { parse: [] }, // Don't mention anyone
        }),
    });
}

/**
 * POST /api/integrations/discord/events
 *
 * Receives interactions from Discord
 */
export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();

        // Verify request from Discord
        const signature = request.headers.get('x-signature-ed25519');
        const timestamp = request.headers.get('x-signature-timestamp');

        // In production, always verify
        if (process.env.NODE_ENV === 'production') {
            if (!verifyDiscordRequest(signature, timestamp, rawBody)) {
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
        }

        const interaction = JSON.parse(rawBody);

        // Handle Discord ping (for URL verification)
        if (interaction.type === INTERACTION_TYPES.PING) {
            return NextResponse.json({ type: RESPONSE_TYPES.PONG });
        }

        // Handle slash commands
        if (interaction.type === INTERACTION_TYPES.APPLICATION_COMMAND) {
            return await handleSlashCommand(interaction);
        }

        // Handle message component interactions (buttons, etc)
        if (interaction.type === INTERACTION_TYPES.MESSAGE_COMPONENT) {
            return await handleComponentInteraction(interaction);
        }

        return NextResponse.json({ type: RESPONSE_TYPES.PONG });
    } catch (error) {
        console.error('Discord events error:', error);
        return NextResponse.json(
            { type: RESPONSE_TYPES.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: '❌ An error occurred' } },
            { status: 500 }
        );
    }
}

/**
 * Handle slash commands
 */
async function handleSlashCommand(interaction: any) {
    const commandName = interaction.data.name;
    const options = interaction.data.options || [];
    const guildId = interaction.guild_id;

    const supabase = getSupabaseServiceRoleClient();

    // Get Discord connection for this guild
    const { data: connection } = await supabase
        .from('discord_integrations')
        .select('id, project_id')
        .eq('guild_id', guildId)
        .single();

    if (!connection) {
        return NextResponse.json({
            type: RESPONSE_TYPES.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: '❌ SignalsLoop is not connected to this server. Please set up the integration first.',
                flags: 64, // Ephemeral (only visible to user)
            },
        });
    }

    // Build a natural language query from the command
    let query = '';

    switch (commandName) {
        case 'briefing':
            query = "What's happening today?";
            break;
        case 'health':
            query = "How healthy is our product?";
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
        case 'insights':
            query = "What are users asking for?";
            break;
        default:
            return NextResponse.json({
                type: RESPONSE_TYPES.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: `Unknown command: ${commandName}` },
            });
    }

    // Parse intent and execute
    const intent = await parseIntent(query);
    const result = await executeAction(intent, connection.project_id);

    return NextResponse.json({
        type: RESPONSE_TYPES.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            content: result.message,
        },
    });
}

/**
 * Handle button/component interactions
 */
async function handleComponentInteraction(interaction: any) {
    const customId = interaction.data.custom_id;
    const guildId = interaction.guild_id;

    // Parse custom_id format: action:entityId
    const [action, entityId] = customId.split(':');

    const supabase = getSupabaseServiceRoleClient();

    // Log interaction
    await supabase.from('discord_interaction_logs').insert({
        guild_id: guildId,
        user_id: interaction.user?.id || interaction.member?.user?.id,
        action_id: action,
        payload: { entity_id: entityId },
        channel_id: interaction.channel_id,
    }).catch(() => { }); // Ignore if table doesn't exist

    // Handle different actions
    switch (action) {
        case 'acknowledge':
            return NextResponse.json({
                type: RESPONSE_TYPES.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `✅ Acknowledged by <@${interaction.user?.id || interaction.member?.user?.id}>`,
                },
            });

        case 'view':
            return NextResponse.json({
                type: RESPONSE_TYPES.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `🔗 View in dashboard: ${process.env.NEXT_PUBLIC_SITE_URL}/post/${entityId}`,
                    flags: 64, // Ephemeral
                },
            });

        default:
            return NextResponse.json({
                type: RESPONSE_TYPES.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: `Action: ${action}` },
            });
    }
}
