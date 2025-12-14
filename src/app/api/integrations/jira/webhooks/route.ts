/**
 * Jira Webhooks Handler
 * 
 * POST /api/integrations/jira/webhooks
 * 
 * Handles Jira webhook events:
 * - comment_created: Parse @signalsloop mentions and respond
 * - issue_updated: Sync status changes to linked feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { JiraAPI } from '@/lib/jira/api';
import { parseIntent } from '@/lib/ai/intent-parser';
import { executeAction } from '@/lib/ai/chat-actions';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Jira webhook event types we care about
const SUPPORTED_EVENTS = [
    'comment_created',
    'issue_updated',
] as const;

/**
 * POST /api/integrations/jira/webhooks
 */
export async function POST(request: NextRequest) {
    try {
        const payload = await request.json();

        const webhookEvent = payload.webhookEvent;
        const issue = payload.issue;
        const comment = payload.comment;

        console.log('[Jira Webhook] Received event:', webhookEvent);

        if (!webhookEvent || !SUPPORTED_EVENTS.includes(webhookEvent)) {
            return NextResponse.json({ success: true, message: 'Event ignored' });
        }

        const supabase = getSupabaseServiceRoleClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
        }

        // Get connection from cloud_id in the webhook
        const cloudId = payload.cloudId || extractCloudIdFromSelf(issue?.self);
        if (!cloudId) {
            console.log('[Jira Webhook] No cloudId found');
            return NextResponse.json({ success: true, message: 'No cloudId' });
        }

        const { data: connection } = await supabase
            .from('jira_connections')
            .select('id, project_id, cloud_id')
            .eq('cloud_id', cloudId)
            .single();

        if (!connection) {
            console.log('[Jira Webhook] No connection found for cloudId:', cloudId);
            return NextResponse.json({ success: true, message: 'No connection' });
        }

        // Handle comment_created - check for @signalsloop mention
        if (webhookEvent === 'comment_created' && comment) {
            await handleCommentCreated(connection, issue, comment, supabase);
        }

        // Handle issue_updated - sync status changes
        if (webhookEvent === 'issue_updated') {
            await handleIssueUpdated(connection, issue, payload.changelog, supabase);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Jira Webhook] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Extract cloud ID from Jira self URL
 */
function extractCloudIdFromSelf(selfUrl?: string): string | null {
    if (!selfUrl) return null;
    // URL format: https://api.atlassian.com/ex/jira/<cloudId>/rest/...
    const match = selfUrl.match(/\/ex\/jira\/([^/]+)\//);
    return match?.[1] || null;
}

/**
 * Check if comment mentions @signalsloop
 */
function mentionsSignalsLoop(commentBody: string): boolean {
    // Check for @signalsloop mention (case insensitive)
    return /\bsignalsloop\b/i.test(commentBody);
}

/**
 * Extract text from Jira Atlassian Document Format (ADF)
 */
function extractTextFromADF(adf: any): string {
    if (!adf || !adf.content) return '';

    let text = '';

    function walkNode(node: any) {
        if (node.type === 'text') {
            text += node.text || '';
        }
        if (node.content) {
            node.content.forEach(walkNode);
        }
    }

    adf.content.forEach(walkNode);
    return text.trim();
}

/**
 * Handle comment_created event
 */
async function handleCommentCreated(
    connection: { id: string; project_id: string; cloud_id: string },
    issue: any,
    comment: any,
    supabase: ReturnType<typeof getSupabaseServiceRoleClient>
) {
    const commentText = comment.body?.content
        ? extractTextFromADF(comment.body)
        : (comment.body || '');

    console.log('[Jira Webhook] Comment text:', commentText.substring(0, 100));

    if (!mentionsSignalsLoop(commentText)) {
        console.log('[Jira Webhook] No @signalsloop mention, ignoring');
        return;
    }

    console.log('[Jira Webhook] @signalsloop mentioned, processing...');

    try {
        // Parse the intent from the comment
        const cleanedMessage = commentText
            .replace(/@?signalsloop/gi, '')
            .trim();

        const intent = await parseIntent(cleanedMessage);
        console.log('[Jira Webhook] Parsed intent:', intent.action);

        // Execute the action
        const result = await executeAction(intent, connection.project_id);

        // Build reply
        let replyText = result.message;

        // Add Jira-specific formatting
        if (result.success) {
            replyText = `✅ SignalsLoop: ${replyText}`;
        } else {
            replyText = `❌ SignalsLoop: ${replyText}`;
        }

        // Post reply as comment
        const api = new JiraAPI(connection.id, connection.cloud_id);
        await api.addComment(issue.key, replyText);

        console.log('[Jira Webhook] Reply posted to', issue.key);
    } catch (error) {
        console.error('[Jira Webhook] Error processing comment:', error);

        // Try to post error reply
        try {
            const api = new JiraAPI(connection.id, connection.cloud_id);
            await api.addComment(
                issue.key,
                '❌ SignalsLoop: Sorry, I encountered an error processing your request.'
            );
        } catch (replyError) {
            console.error('[Jira Webhook] Failed to post error reply:', replyError);
        }
    }
}

/**
 * Handle issue_updated event - sync status changes
 */
async function handleIssueUpdated(
    connection: { id: string; project_id: string; cloud_id: string },
    issue: any,
    changelog: any,
    supabase: ReturnType<typeof getSupabaseServiceRoleClient>
) {
    if (!changelog?.items) return;

    // Find status changes in changelog
    const statusChange = changelog.items.find(
        (item: any) => item.field === 'status'
    );

    if (!statusChange) return;

    const oldStatus = statusChange.fromString;
    const newStatus = statusChange.toString;
    const issueKey = issue.key;

    console.log(`[Jira Webhook] Status change: ${issueKey} ${oldStatus} → ${newStatus}`);

    // Find linked feedback posts
    const { data: linkedPosts } = await supabase!
        .from('posts')
        .select('id, status')
        .eq('project_id', connection.project_id)
        .contains('metadata', { jira_issue_key: issueKey });

    if (!linkedPosts || linkedPosts.length === 0) {
        console.log('[Jira Webhook] No linked posts found for', issueKey);
        return;
    }

    // Map Jira status to SignalsLoop status
    const signalsLoopStatus = mapJiraStatusToSignalsLoop(newStatus);

    if (!signalsLoopStatus) {
        console.log('[Jira Webhook] Unknown Jira status:', newStatus);
        return;
    }

    // Update linked posts
    for (const post of linkedPosts) {
        if (post.status !== signalsLoopStatus) {
            await supabase!
                .from('posts')
                .update({ status: signalsLoopStatus })
                .eq('id', post.id);

            console.log(`[Jira Webhook] Updated post ${post.id} to ${signalsLoopStatus}`);
        }
    }
}

/**
 * Map Jira status to SignalsLoop status
 */
function mapJiraStatusToSignalsLoop(jiraStatus: string): string | null {
    const statusLower = jiraStatus.toLowerCase();

    // Common Jira statuses mapped to SignalsLoop
    if (statusLower.includes('done') || statusLower.includes('resolved') || statusLower.includes('closed')) {
        return 'completed';
    }
    if (statusLower.includes('in progress') || statusLower.includes('in review')) {
        return 'in_progress';
    }
    if (statusLower.includes('to do') || statusLower.includes('backlog') || statusLower.includes('open')) {
        return 'open';
    }
    if (statusLower.includes('planned') || statusLower.includes('selected')) {
        return 'planned';
    }

    return null;
}

/**
 * GET endpoint for webhook verification
 */
export async function GET() {
    return NextResponse.json({
        message: 'Jira Webhooks endpoint is active',
        supported_events: SUPPORTED_EVENTS,
    });
}
