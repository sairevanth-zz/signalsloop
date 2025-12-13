/**
 * Slack Integration Health Check
 * 
 * Verifies that all required environment variables and configurations are in place
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const checks: Record<string, boolean | string> = {};

    // Check environment variables
    checks['SLACK_CLIENT_ID'] = !!process.env.SLACK_CLIENT_ID;
    checks['SLACK_CLIENT_SECRET'] = !!process.env.SLACK_CLIENT_SECRET;
    checks['SLACK_SIGNING_SECRET'] = !!process.env.SLACK_SIGNING_SECRET;
    checks['SLACK_REDIRECT_URI'] = !!process.env.SLACK_REDIRECT_URI;
    checks['SLACK_BOT_TOKEN'] = !!process.env.SLACK_BOT_TOKEN;
    checks['TOKEN_ENCRYPTION_KEY'] = !!process.env.TOKEN_ENCRYPTION_KEY;

    // Check database connection
    const supabase = getSupabaseServiceRoleClient();
    if (supabase) {
        checks['database'] = true;

        // Count active Slack connections
        const { count, error } = await supabase
            .from('slack_connections')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

        checks['active_connections'] = error ? `error: ${error.message}` : `${count || 0}`;
    } else {
        checks['database'] = false;
    }

    // Determine overall health
    const requiredEnvVars = ['SLACK_CLIENT_ID', 'SLACK_SIGNING_SECRET', 'TOKEN_ENCRYPTION_KEY'];
    const missingRequired = requiredEnvVars.filter(key => !checks[key]);

    const healthy = missingRequired.length === 0 && checks['database'] === true;

    return NextResponse.json({
        healthy,
        checks,
        missingRequired: missingRequired.length > 0 ? missingRequired : undefined,
        note: 'SLACK_BOT_TOKEN is optional - used as fallback when connection token fails',
        eventsUrl: 'https://signalsloop.com/api/integrations/slack/events',
    });
}
