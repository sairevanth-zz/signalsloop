/**
 * Slack Debug Endpoint
 * 
 * Tests the complete flow: decrypt token, connect to Slack, send message
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { decryptToken } from '@/lib/encryption';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const steps: Record<string, any> = {};

    try {
        const supabase = getSupabaseServiceRoleClient();
        if (!supabase) {
            return NextResponse.json({ error: 'No supabase client' }, { status: 500 });
        }
        steps['supabase'] = 'ok';

        // Get active slack connection
        const { data: connection, error: connError } = await supabase
            .from('slack_connections')
            .select('id, team_name, team_id, bot_token_encrypted, status, created_at')
            .eq('status', 'active')
            .single();

        if (connError) {
            steps['connection_error'] = connError.message;
            return NextResponse.json({ steps, error: 'No connection' }, { status: 404 });
        }

        steps['connection'] = {
            id: connection.id,
            team_name: connection.team_name,
            team_id: connection.team_id,
            status: connection.status,
            created_at: connection.created_at,
            has_token: !!connection.bot_token_encrypted,
            token_length: connection.bot_token_encrypted?.length || 0,
        };

        // Try to decrypt token
        let botToken: string | null = null;
        try {
            botToken = decryptToken(connection.bot_token_encrypted);
            steps['decrypt'] = {
                success: true,
                token_starts_with: botToken?.substring(0, 10) + '...',
                token_length: botToken?.length || 0,
            };
        } catch (decryptError) {
            steps['decrypt'] = {
                success: false,
                error: decryptError instanceof Error ? decryptError.message : 'Unknown error',
            };
            return NextResponse.json({ steps, error: 'Decrypt failed' }, { status: 500 });
        }

        // Test Slack API auth
        try {
            const authResponse = await fetch('https://slack.com/api/auth.test', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${botToken}`,
                    'Content-Type': 'application/json',
                },
            });
            const authData = await authResponse.json();
            steps['slack_auth'] = authData;
        } catch (authError) {
            steps['slack_auth'] = {
                error: authError instanceof Error ? authError.message : 'Unknown error',
            };
        }

        return NextResponse.json({
            success: true,
            steps,
            message: 'Debug complete - check steps for details',
        });

    } catch (error) {
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error',
            steps,
        }, { status: 500 });
    }
}
