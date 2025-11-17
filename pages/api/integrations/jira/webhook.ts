/**
 * Jira Webhook API Route
 *
 * Receives webhooks from Jira to sync issue status changes back to SignalsLoop.
 * Implements bi-directional sync for feedback resolution tracking.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

/**
 * Jira webhook payload structure
 */
interface JiraWebhookPayload {
  webhookEvent: string;
  issue_event_type_name?: string;
  issue?: {
    id: string;
    key: string;
    self: string;
    fields: {
      summary: string;
      status: {
        id: string;
        name: string;
        statusCategory: {
          id: number;
          key: string;
          name: string;
        };
      };
      priority?: {
        id: string;
        name: string;
      };
      assignee?: {
        accountId: string;
        displayName: string;
        emailAddress?: string;
        avatarUrls?: Record<string, string>;
      };
      updated: string;
      [key: string]: any;
    };
  };
  changelog?: {
    items: Array<{
      field: string;
      fieldtype: string;
      from: string;
      fromString: string;
      to: string;
      toString: string;
    }>;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload: JiraWebhookPayload = req.body;

    // Validate payload
    if (!payload.webhookEvent || !payload.issue) {
      console.log('Invalid webhook payload:', payload);
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const { webhookEvent, issue } = payload;

    // Log webhook receipt
    console.log(`Received Jira webhook: ${webhookEvent} for issue ${issue.key}`);

    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    // Find the issue link in our database
    const { data: issueLink, error: linkError } = await supabase
      .from('jira_issue_links')
      .select('*, jira_connections!inner(*)')
      .eq('issue_key', issue.key)
      .eq('sync_enabled', true)
      .single();

    if (linkError || !issueLink) {
      console.log(`Issue link not found for ${issue.key}`);
      // Return 200 to acknowledge receipt (avoid retries)
      return res.status(200).json({ received: true, action: 'ignored' });
    }

    // Update issue link with latest data from Jira
    const updateData: any = {
      status: issue.fields.status.name,
      priority: issue.fields.priority?.name,
      summary: issue.fields.summary,
      last_synced_at: new Date().toISOString()
    };

    // Update assignee if present
    if (issue.fields.assignee) {
      updateData.assignee = {
        id: issue.fields.assignee.accountId,
        name: issue.fields.assignee.displayName,
        email: issue.fields.assignee.emailAddress,
        avatar: issue.fields.assignee.avatarUrls?.['48x48']
      };
    }

    // Update the issue link
    await supabase
      .from('jira_issue_links')
      .update(updateData)
      .eq('id', issueLink.id);

    // Check if issue is now resolved (Done, Closed, Resolved)
    const resolvedStatuses = ['Done', 'Closed', 'Resolved', 'Complete', 'Completed'];
    const isResolved = resolvedStatuses.includes(issue.fields.status.name);

    // If issue is resolved, mark feedback as responded
    if (isResolved) {
      await supabase
        .from('discovered_feedback')
        .update({
          responded_at: new Date().toISOString(),
          response_content: `Resolved via Jira issue ${issue.key}`,
          response_url: `${issueLink.jira_connections.site_url}/browse/${issue.key}`
        })
        .eq('id', issueLink.feedback_id);
    }

    // Log the sync event
    await supabase.from('jira_sync_logs').insert({
      jira_connection_id: issueLink.jira_connection_id,
      action: 'webhook_received',
      jira_issue_key: issue.key,
      success: true,
      details: {
        webhook_event: webhookEvent,
        status: issue.fields.status.name,
        status_category: issue.fields.status.statusCategory.key,
        is_resolved: isResolved,
        changelog: payload.changelog
      }
    });

    // Update webhook stats
    await supabase
      .from('jira_webhooks')
      .update({
        last_triggered_at: new Date().toISOString(),
        total_events_received: supabase.sql`total_events_received + 1`
      })
      .eq('jira_connection_id', issueLink.jira_connection_id);

    res.status(200).json({
      received: true,
      issue_key: issue.key,
      status: issue.fields.status.name,
      is_resolved: isResolved
    });
  } catch (error) {
    console.error('Error processing Jira webhook:', error);

    // Log webhook error
    try {
      const supabase = getSupabaseServiceRoleClient();
      const payload = req.body as JiraWebhookPayload;

      if (supabase && payload.issue) {
        // Try to find connection to log error
        const { data: issueLink } = await supabase
          .from('jira_issue_links')
          .select('jira_connection_id')
          .eq('issue_key', payload.issue.key)
          .single();

        if (issueLink) {
          await supabase.from('jira_sync_logs').insert({
            jira_connection_id: issueLink.jira_connection_id,
            action: 'webhook_received',
            jira_issue_key: payload.issue.key,
            success: false,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            details: {
              webhook_event: payload.webhookEvent
            }
          });

          // Update webhook failure stats
          await supabase
            .from('jira_webhooks')
            .update({
              failed_events: supabase.sql`failed_events + 1`,
              last_error: error instanceof Error ? error.message : 'Unknown error'
            })
            .eq('jira_connection_id', issueLink.jira_connection_id);
        }
      }
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }

    // Still return 200 to avoid Jira retrying
    res.status(200).json({
      received: true,
      error: 'Processing failed but acknowledged'
    });
  }
}
