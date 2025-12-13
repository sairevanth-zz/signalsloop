/**
 * Slack Join Channels Endpoint
 * 
 * Manually triggers the bot to join all public channels
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { decryptToken } from '@/lib/encryption';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
    try {
        const supabase = getSupabaseServiceRoleClient();
        if (!supabase) {
            return NextResponse.json({ error: 'No supabase' }, { status: 500 });
        }

        // Get active connection
        const { data: connection, error } = await supabase
            .from('slack_connections')
            .select('id, bot_token_encrypted, team_name')
            .eq('status', 'active')
            .single();

        if (error || !connection) {
            return NextResponse.json({ error: 'No active connection' }, { status: 404 });
        }

        // Decrypt token
        const botToken = decryptToken(connection.bot_token_encrypted);

        // List public channels
        const listResponse = await fetch('https://slack.com/api/conversations.list?types=public_channel&exclude_archived=true', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${botToken}`,
            },
        });

        const listData = await listResponse.json();

        if (!listData.ok) {
            return NextResponse.json({
                error: 'Failed to list channels',
                slack_error: listData.error
            }, { status: 500 });
        }

        const channels = listData.channels || [];
        const results: { channel: string; joined: boolean; error?: string }[] = [];

        // Join each channel
        for (const channel of channels) {
            if (channel.is_member) {
                results.push({ channel: channel.name, joined: true, error: 'already_member' });
                continue;
            }

            try {
                const joinResponse = await fetch('https://slack.com/api/conversations.join', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${botToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ channel: channel.id }),
                });

                const joinData = await joinResponse.json();
                results.push({
                    channel: channel.name,
                    joined: joinData.ok,
                    error: joinData.error
                });
            } catch (err) {
                results.push({
                    channel: channel.name,
                    joined: false,
                    error: err instanceof Error ? err.message : 'Unknown error'
                });
            }
        }

        return NextResponse.json({
            success: true,
            workspace: connection.team_name,
            channels_found: channels.length,
            results,
        });
    } catch (error) {
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
