/**
 * Linear Webhooks Handler
 * 
 * POST /api/integrations/linear/webhooks
 * 
 * Handles Linear webhook events:
 * - Comment: Parse @signalsloop mentions and respond
 * - IssueUpdate: Sync status changes to linked feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { LinearAPI } from '@/lib/linear/api';
import { parseIntent } from '@/lib/ai/intent-parser';
import { executeAction } from '@/lib/ai/chat-actions';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Verify Linear webhook signature
 */
function verifyLinearSignature(
    payload: string,
    signature: string | null,
    secret: string
): boolean {
    if (!signature || !secret) return false;

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

/**
 * POST /api/integrations/linear/webhooks
 */
export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();
        const payload = JSON.parse(rawBody);

        const webhookType = payload.type;
        const action = payload.action;

        console.log('[Linear Webhook] Received:', webhookType, action);

        // Verify signature if we have a secret configured
        const signature = request.headers.get('linear-signature');
        const webhookSecret = process.env.LINEAR_WEBHOOK_SECRET;

        if (webhookSecret && !verifyLinearSignature(rawBody, signature, webhookSecret)) {
            console.log('[Linear Webhook] Invalid signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const supabase = getSupabaseServiceRoleClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
        }

        // Get organization ID from payload
        const organizationId = payload.organizationId;
        if (!organizationId) {
            return NextResponse.json({ success: true, message: 'No organization ID' });
        }

        // Find connection for this Linear organization
        const { data: connection } = await supabase
            .from('linear_connections')
            .select('id, project_id, access_token')
            .eq('organization_id', organizationId)
            .single();

        if (!connection) {
            console.log('[Linear Webhook] No connection found for org:', organizationId);
            return NextResponse.json({ success: true, message: 'No connection' });
        }

        // Handle Comment events
        if (webhookType === 'Comment' && action === 'create') {
            await handleCommentCreated(connection, payload.data, supabase);
        }

        // Handle Issue status updates
        if (webhookType === 'Issue' && action === 'update') {
            await handleIssueUpdated(connection, payload.data, payload.updatedFrom, supabase);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Linear Webhook] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Check if comment mentions @signalsloop
 */
function mentionsSignalsLoop(text: string): boolean {
    return /\bsignalsloop\b/i.test(text);
}

/**
 * Handle Comment created event
 */
async function handleCommentCreated(
    connection: { id: string; project_id: string; access_token: string },
    commentData: any,
    supabase: ReturnType<typeof getSupabaseServiceRoleClient>
) {
    const commentBody = commentData.body || '';
    const issueId = commentData.issueId;

    console.log('[Linear Webhook] Comment on issue:', issueId);

    if (!mentionsSignalsLoop(commentBody)) {
        console.log('[Linear Webhook] No @signalsloop mention, ignoring');
        return;
    }

    console.log('[Linear Webhook] @signalsloop mentioned, processing...');

    try {
        // Parse the intent from the comment
        const cleanedMessage = commentBody
            .replace(/@?signalsloop/gi, '')
            .trim();

        const intent = await parseIntent(cleanedMessage);
        console.log('[Linear Webhook] Parsed intent:', intent.action);

        // Execute the action
        const result = await executeAction(intent, connection.project_id);

        // Build reply
        let replyText = result.message;

        // Add Linear-specific formatting (markdown)
        if (result.success) {
            replyText = `✅ **SignalsLoop:** ${replyText}`;
        } else {
            replyText = `❌ **SignalsLoop:** ${replyText}`;
        }

        // Post reply as comment
        const api = new LinearAPI(connection.access_token);
        await api.addComment(issueId, replyText);

        console.log('[Linear Webhook] Reply posted to issue:', issueId);
    } catch (error) {
        console.error('[Linear Webhook] Error processing comment:', error);

        // Try to post error reply
        try {
            const api = new LinearAPI(connection.access_token);
            await api.addComment(issueId, '❌ **SignalsLoop:** Sorry, I encountered an error processing your request.');
        } catch (replyError) {
            console.error('[Linear Webhook] Failed to post error reply:', replyError);
        }
    }
}

/**
 * Handle Issue updated event - sync status changes
 */
async function handleIssueUpdated(
    connection: { id: string; project_id: string; access_token: string },
    issueData: any,
    updatedFrom: any,
    supabase: ReturnType<typeof getSupabaseServiceRoleClient>
) {
    // Check if state was updated
    if (!updatedFrom?.stateId) return;

    const issueIdentifier = issueData.identifier;
    const newStateName = issueData.state?.name;
    const newStateType = issueData.state?.type;

    console.log(`[Linear Webhook] Status change: ${issueIdentifier} → ${newStateName}`);

    // Find linked feedback posts
    const { data: linkedPosts } = await supabase!
        .from('posts')
        .select('id, status')
        .eq('project_id', connection.project_id)
        .contains('metadata', { linear_issue_id: issueData.id });

    if (!linkedPosts || linkedPosts.length === 0) {
        console.log('[Linear Webhook] No linked posts found for', issueIdentifier);
        return;
    }

    // Map Linear state type to SignalsLoop status
    const signalsLoopStatus = mapLinearStateToSignalsLoop(newStateType, newStateName);

    if (!signalsLoopStatus) {
        console.log('[Linear Webhook] Unknown Linear state:', newStateType, newStateName);
        return;
    }

    // Update linked posts
    for (const post of linkedPosts) {
        if (post.status !== signalsLoopStatus) {
            await supabase!
                .from('posts')
                .update({ status: signalsLoopStatus })
                .eq('id', post.id);

            console.log(`[Linear Webhook] Updated post ${post.id} to ${signalsLoopStatus}`);
        }
    }
}

/**
 * Map Linear state type/name to SignalsLoop status
 * Linear state types: triage, backlog, unstarted, started, completed, canceled
 */
function mapLinearStateToSignalsLoop(stateType: string, stateName: string): string | null {
    switch (stateType?.toLowerCase()) {
        case 'completed':
            return 'completed';
        case 'canceled':
            return 'completed'; // Or could be a different status
        case 'started':
            return 'in_progress';
        case 'unstarted':
        case 'backlog':
        case 'triage':
            return 'open';
        default:
            // Fallback to name-based matching
            const nameLower = stateName?.toLowerCase() || '';
            if (nameLower.includes('done') || nameLower.includes('complete')) return 'completed';
            if (nameLower.includes('progress') || nameLower.includes('review')) return 'in_progress';
            if (nameLower.includes('planned')) return 'planned';
            return null;
    }
}

/**
 * GET endpoint for webhook verification
 */
export async function GET() {
    return NextResponse.json({
        message: 'Linear Webhooks endpoint is active',
        supported_types: ['Comment', 'Issue'],
    });
}
