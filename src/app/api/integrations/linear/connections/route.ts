/**
 * Linear Connections API
 * 
 * GET /api/integrations/linear/connections - List connections
 * DELETE /api/integrations/linear/connections - Disconnect
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { disconnectLinear } from '@/lib/linear/oauth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }

        const supabase = getSupabaseServerClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 });
        }

        // Get current user
        const {
            data: { user },
        } = await supabase.auth.getUser();

        // Fetch connections
        const { data: connections, error } = await supabase
            .from('linear_connections')
            .select('id, organization_id, organization_name, organization_url_key, status, created_at')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true, connections: connections || [] });
    } catch (error) {
        console.error('[Linear Connections] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch Linear connections' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { connectionId } = await request.json();

        if (!connectionId) {
            return NextResponse.json({ error: 'connectionId is required' }, { status: 400 });
        }

        const supabase = getSupabaseServerClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 });
        }

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const success = await disconnectLinear(connectionId, user.id);

        if (!success) {
            return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Linear Disconnect] Error:', error);
        return NextResponse.json(
            { error: 'Failed to disconnect Linear' },
            { status: 500 }
        );
    }
}
