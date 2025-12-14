/**
 * Linear OAuth Callback Handler
 * 
 * GET /api/integrations/linear/callback
 * 
 * Handles the OAuth callback from Linear after user authorization.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    exchangeCodeForTokens,
    getOrganization,
    storeConnection,
    verifyOAuthState,
} from '@/lib/linear/oauth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Handle OAuth errors
        if (error) {
            console.error('[Linear OAuth] Error:', error);
            return NextResponse.redirect(
                new URL(`/settings?error=linear_auth_failed&message=${encodeURIComponent(error)}`, request.url)
            );
        }

        if (!code || !state) {
            return NextResponse.redirect(
                new URL('/settings?error=linear_missing_params', request.url)
            );
        }

        // Verify state token (CSRF protection)
        let userId: string;
        let projectId: string;

        try {
            const stateData = await verifyOAuthState(state);
            userId = stateData.userId;
            projectId = stateData.projectId;
        } catch (err) {
            console.error('[Linear OAuth] State verification failed:', err);
            return NextResponse.redirect(
                new URL('/settings?error=linear_invalid_state', request.url)
            );
        }

        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(code);
        console.log('[Linear OAuth] Token exchange successful');

        // Get organization info
        const organization = await getOrganization(tokens.access_token);
        console.log('[Linear OAuth] Organization:', organization.name);

        // Store connection
        await storeConnection(userId, projectId, tokens, organization);
        console.log('[Linear OAuth] Connection stored');

        // Redirect to settings with success
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        return NextResponse.redirect(
            new URL(`/settings?success=linear_connected&org=${encodeURIComponent(organization.name)}`, baseUrl)
        );
    } catch (error) {
        console.error('[Linear OAuth] Callback error:', error);
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        return NextResponse.redirect(
            new URL('/settings?error=linear_connection_failed', baseUrl)
        );
    }
}
