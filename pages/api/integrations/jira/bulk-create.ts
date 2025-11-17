/**
 * Bulk Create Jira Issues API Route
 *
 * Creates multiple Jira issues from a theme or selection of feedback items.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { JiraAPI, getIssueUrl } from '@/lib/jira/api';
import { generateBulkIssues, generateEpicFromBulk } from '@/lib/jira/issue-generator';

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
      feedback_ids,
      connection_id,
      project_key,
      issue_type = 'Task',
      create_epic = false,
      theme_name
    } = req.body;

    // Validate required fields
    if (!feedback_ids || !Array.isArray(feedback_ids) || feedback_ids.length === 0) {
      return res.status(400).json({
        error: 'feedback_ids array is required and must not be empty'
      });
    }

    if (!connection_id) {
      return res.status(400).json({ error: 'connection_id is required' });
    }

    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    // Get authenticated user
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get Jira connection
    const { data: connection, error: connectionError } = await supabase
      .from('jira_connections')
      .select('*')
      .eq('id', connection_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (connectionError || !connection) {
      return res.status(404).json({ error: 'Jira connection not found or inactive' });
    }

    // Get all feedback items
    const { data: feedbackItems, error: feedbackError } = await supabase
      .from('discovered_feedback')
      .select('*')
      .in('id', feedback_ids);

    if (feedbackError || !feedbackItems || feedbackItems.length === 0) {
      return res.status(404).json({ error: 'No feedback items found' });
    }

    // Filter out feedback that already has Jira issues
    const { data: existingLinks } = await supabase
      .from('jira_issue_links')
      .select('feedback_id')
      .in('feedback_id', feedback_ids);

    const existingFeedbackIds = new Set(existingLinks?.map(l => l.feedback_id) || []);
    const newFeedbackItems = feedbackItems.filter(f => !existingFeedbackIds.has(f.id));

    if (newFeedbackItems.length === 0) {
      return res.status(400).json({
        error: 'All selected feedback items already have Jira issues',
        existing_count: existingFeedbackIds.size
      });
    }

    // Create Jira API client
    const jiraAPI = new JiraAPI(connection.id, connection.cloud_id);

    const results = {
      epic: null as any,
      issues: [] as any[],
      errors: [] as any[]
    };

    // If create_epic is true, create an epic first
    if (create_epic) {
      try {
        const avgSentiment = newFeedbackItems.reduce((sum, f) => sum + (f.sentiment_score || 0), 0) / newFeedbackItems.length;

        const epicData = await generateEpicFromBulk({
          feedbackItems: newFeedbackItems.map(f => ({
            content: f.content,
            sentiment: f.sentiment_score || 0,
            theme: f.theme_name,
            platform: f.platform,
            author_username: f.author_username,
            platform_url: f.platform_url
          })),
          theme: theme_name || 'Bulk Import',
          totalMentions: newFeedbackItems.length,
          avgSentiment
        });

        const jiraEpic = await jiraAPI.createIssue({
          project: project_key || connection.default_project_key,
          summary: epicData.summary,
          description: epicData.description,
          issuetype: 'Epic',
          priority: epicData.priority,
          labels: epicData.labels
        });

        results.epic = {
          key: jiraEpic.key,
          url: getIssueUrl(connection.site_url, jiraEpic.key)
        };

        // Log epic creation
        await supabase.from('jira_sync_logs').insert({
          jira_connection_id: connection.id,
          action: 'issue_created',
          jira_issue_key: jiraEpic.key,
          success: true,
          details: {
            is_epic: true,
            feedback_count: newFeedbackItems.length,
            theme: theme_name
          },
          user_id: user.id
        });
      } catch (error) {
        console.error('Failed to create epic:', error);
        results.errors.push({
          type: 'epic_creation',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Generate issues for each feedback item
    const generatedIssues = await generateBulkIssues(
      newFeedbackItems.map(f => ({
        content: f.content,
        sentiment: f.sentiment_score || 0,
        theme: f.theme_name,
        platform: f.platform,
        classification: f.classification,
        urgency_score: f.urgency_score,
        author_username: f.author_username,
        platform_url: f.platform_url
      })),
      { parallel: true, maxConcurrent: 3 }
    );

    // Create issues in Jira
    for (let i = 0; i < newFeedbackItems.length; i++) {
      const feedback = newFeedbackItems[i];
      const generated = generatedIssues[i];

      try {
        const jiraIssue = await jiraAPI.createIssue({
          project: project_key || connection.default_project_key,
          summary: generated.summary,
          description: generated.description,
          issuetype: issue_type || generated.issueType,
          priority: generated.priority,
          labels: generated.labels
        });

        // Store issue link
        await supabase.from('jira_issue_links').insert({
          feedback_id: feedback.id,
          jira_connection_id: connection.id,
          issue_key: jiraIssue.key,
          issue_id: jiraIssue.id,
          issue_url: getIssueUrl(connection.site_url, jiraIssue.key),
          project_key: project_key || connection.default_project_key,
          issue_type: issue_type || generated.issueType,
          status: jiraIssue.fields.status.name,
          priority: jiraIssue.fields.priority?.name,
          summary: jiraIssue.fields.summary,
          epic_key: results.epic?.key,
          created_in_jira_at: jiraIssue.fields.created
        });

        results.issues.push({
          feedback_id: feedback.id,
          key: jiraIssue.key,
          url: getIssueUrl(connection.site_url, jiraIssue.key),
          summary: jiraIssue.fields.summary
        });

        // Log creation
        await supabase.from('jira_sync_logs').insert({
          jira_connection_id: connection.id,
          action: 'issue_created',
          jira_issue_key: jiraIssue.key,
          success: true,
          details: {
            feedback_id: feedback.id,
            bulk_operation: true,
            epic_key: results.epic?.key
          },
          user_id: user.id
        });
      } catch (error) {
        console.error(`Failed to create issue for feedback ${feedback.id}:`, error);
        results.errors.push({
          feedback_id: feedback.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.status(200).json({
      success: true,
      created_count: results.issues.length,
      error_count: results.errors.length,
      epic: results.epic,
      issues: results.issues,
      errors: results.errors.length > 0 ? results.errors : undefined
    });
  } catch (error) {
    console.error('Error in bulk create:', error);
    res.status(500).json({
      error: 'Failed to create Jira issues',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
