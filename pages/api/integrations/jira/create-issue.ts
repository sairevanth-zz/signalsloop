/**
 * Create Jira Issue API Route
 *
 * Creates a Jira issue from SignalsLoop feedback with optional AI generation.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { JiraAPI, getIssueUrl } from '@/lib/jira/api';
import { generateIssueFromFeedback } from '@/lib/jira/issue-generator';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      feedback_id,
      connection_id,
      project_key,
      issue_type,
      use_ai = true,
      // Optional manual override
      manual_summary,
      manual_description,
      manual_priority,
      manual_labels
    } = req.body;

    // Validate required fields
    if (!feedback_id || !connection_id) {
      return res.status(400).json({
        error: 'feedback_id and connection_id are required'
      });
    }

    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    // Get authenticated user from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get Jira connection and verify ownership
    const { data: connection, error: connectionError } = await supabase
      .from('jira_connections')
      .select('*')
      .eq('id', connection_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (connectionError || !connection) {
      return res.status(404).json({
        error: 'Jira connection not found or inactive'
      });
    }

    // Get feedback item
    const { data: feedback, error: feedbackError } = await supabase
      .from('discovered_feedback')
      .select('*')
      .eq('id', feedback_id)
      .single();

    if (feedbackError || !feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    // Check if issue already exists for this feedback
    const { data: existingLink } = await supabase
      .from('jira_issue_links')
      .select('issue_key, issue_url')
      .eq('feedback_id', feedback_id)
      .single();

    if (existingLink) {
      return res.status(409).json({
        error: 'Issue already exists for this feedback',
        issue_key: existingLink.issue_key,
        issue_url: existingLink.issue_url
      });
    }

    // Get theme label mappings if available
    let labels: string[] = manual_labels || [];

    if (feedback.theme_analyzed_at) {
      const { data: themeMappings } = await supabase
        .from('jira_label_mappings')
        .select('jira_labels')
        .eq('project_id', connection.project_id)
        .eq('auto_apply', true);

      if (themeMappings && themeMappings.length > 0) {
        const mappedLabels = themeMappings.flatMap(m => m.jira_labels || []);
        labels = [...new Set([...labels, ...mappedLabels])];
      }
    }

    // Generate or use manual issue data
    let issueData;

    if (use_ai && !manual_summary) {
      // AI-generate issue details
      const generated = await generateIssueFromFeedback({
        content: feedback.content,
        sentiment: feedback.sentiment_score || 0,
        theme: feedback.theme_name,
        platform: feedback.platform,
        classification: feedback.classification,
        urgency_score: feedback.urgency_score,
        author_username: feedback.author_username,
        platform_url: feedback.platform_url
      });

      issueData = {
        project: project_key || connection.default_project_key,
        summary: generated.summary,
        description: generated.description,
        issuetype: issue_type || generated.issueType || connection.default_issue_type || 'Task',
        priority: generated.priority,
        labels: [...new Set([...labels, ...generated.labels])]
      };
    } else {
      // Use manual data
      if (!manual_summary || !manual_description) {
        return res.status(400).json({
          error: 'manual_summary and manual_description are required when use_ai=false'
        });
      }

      // Convert plain text to ADF format
      const { textToADF } = await import('@/lib/jira/api');

      issueData = {
        project: project_key || connection.default_project_key,
        summary: manual_summary,
        description: textToADF(manual_description),
        issuetype: issue_type || connection.default_issue_type || 'Task',
        priority: manual_priority,
        labels
      };
    }

    // Create Jira API client
    const jiraAPI = new JiraAPI(connection.id, connection.cloud_id);

    // Create issue in Jira
    const jiraIssue = await jiraAPI.createIssue(issueData);

    // Store issue link in database
    const { data: issueLink, error: linkError } = await supabase
      .from('jira_issue_links')
      .insert({
        feedback_id: feedback_id,
        jira_connection_id: connection.id,
        issue_key: jiraIssue.key,
        issue_id: jiraIssue.id,
        issue_url: getIssueUrl(connection.site_url, jiraIssue.key),
        project_key: issueData.project,
        issue_type: issueData.issuetype,
        status: jiraIssue.fields.status.name,
        priority: jiraIssue.fields.priority?.name,
        summary: jiraIssue.fields.summary,
        created_in_jira_at: jiraIssue.fields.created
      })
      .select()
      .single();

    if (linkError) {
      console.error('Failed to store issue link:', linkError);
      // Issue was created in Jira but failed to store link
      // Return success but log the error
    }

    // Log successful creation
    await supabase.from('jira_sync_logs').insert({
      jira_connection_id: connection.id,
      action: 'issue_created',
      jira_issue_key: jiraIssue.key,
      success: true,
      details: {
        feedback_id,
        issue_key: jiraIssue.key,
        project_key: issueData.project,
        use_ai
      },
      user_id: user.id
    });

    res.status(200).json({
      success: true,
      issue: {
        id: jiraIssue.id,
        key: jiraIssue.key,
        url: getIssueUrl(connection.site_url, jiraIssue.key),
        summary: jiraIssue.fields.summary,
        status: jiraIssue.fields.status.name,
        priority: jiraIssue.fields.priority?.name
      },
      link_id: issueLink?.id
    });
  } catch (error) {
    console.error('Error creating Jira issue:', error);

    // Log failed creation
    try {
      const supabase = getSupabaseServiceRoleClient();
      if (supabase && req.body.connection_id) {
        await supabase.from('jira_sync_logs').insert({
          jira_connection_id: req.body.connection_id,
          action: 'issue_created',
          success: false,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          details: {
            feedback_id: req.body.feedback_id
          }
        });
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    res.status(500).json({
      error: 'Failed to create Jira issue',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
