/**
 * Linear OAuth Connect Handler
 * 
 * GET /api/integrations/linear/connect
 * 
 * Initiates the OAuth flow by redirecting to Linear's authorization page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { getAuthorizationUrl, createOAuthState } from '@/lib/linear/oauth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }

        // Get current user using async createServerClient
        const supabase = await createServerClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 });
        }

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            // Redirect to login instead of returning JSON error
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
            const returnUrl = encodeURIComponent(`/settings?tab=integrations`);
            return NextResponse.redirect(`${baseUrl}/login?redirect=${returnUrl}`);
        }

        // Create OAuth state for CSRF protection
        const stateToken = await createOAuthState(user.id, projectId);

        // Get authorization URL
        const authUrl = getAuthorizationUrl(stateToken);

        // Redirect to Linear
        return NextResponse.redirect(authUrl);
    } catch (error) {
        console.error('[Linear Connect] Error:', error);
        return NextResponse.json(
            { error: 'Failed to initiate Linear connection' },
            { status: 500 }
        );
    }
}
