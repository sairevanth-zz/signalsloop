/**
 * Action Executor
 * Executes actions detected by the action router
 */

import { createServerClient } from '@/lib/supabase-client';
import OpenAI from 'openai';
import type {
  ActionType,
  ActionResult,
  ActionExecution,
} from '@/types/ask';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// Main Executor Function
// ============================================================================

/**
 * Executes an action based on its type and parameters
 *
 * @param actionType - Type of action to execute
 * @param parameters - Action parameters
 * @param projectId - Project ID
 * @param userId - User ID
 * @param messageId - Message ID that triggered the action
 * @returns Action result
 */
export async function executeAction(
  actionType: ActionType,
  parameters: Record<string, any>,
  projectId: string,
  userId: string,
  messageId: string
): Promise<ActionResult> {
  const supabase = await createServerClient();

  // Create action execution log
  const { data: execution, error: executionError } = await supabase
    .from('ask_action_executions')
    .insert({
      message_id: messageId,
      project_id: projectId,
      user_id: userId,
      action_type: actionType,
      action_parameters: parameters,
      status: 'executing',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (executionError || !execution) {
    console.error('Failed to create action execution log:', executionError);
  }

  const executionId = execution?.id;
  const startTime = Date.now();

  try {
    let result: ActionResult;

    // Route to appropriate executor
    switch (actionType) {
      case 'create_spec':
        result = await executeCreateSpec(parameters, projectId, userId);
        break;

      case 'escalate_issue':
        result = await executeEscalateIssue(parameters, projectId, userId);
        break;

      case 'generate_report':
        result = await executeGenerateReport(parameters, projectId, userId);
        break;

      case 'create_roadmap_item':
        result = await executeCreateRoadmapItem(parameters, projectId, userId);
        break;

      case 'send_notification':
        result = await executeSendNotification(parameters, projectId, userId);
        break;

      case 'schedule_query':
        result = await executeScheduleQuery(parameters, projectId, userId);
        break;

      default:
        throw new Error(`Unsupported action type: ${actionType}`);
    }

    // Update execution log with success
    if (executionId) {
      await supabase
        .from('ask_action_executions')
        .update({
          status: 'completed',
          result_data: result.data,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
        })
        .eq('id', executionId);
    }

    return result;
  } catch (error) {
    console.error('Action execution error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    // Update execution log with failure
    if (executionId) {
      await supabase
        .from('ask_action_executions')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
        })
        .eq('id', executionId);
    }

    return {
      success: false,
      action_type: actionType,
      error: errorMessage,
    };
  }
}

// ============================================================================
// Individual Action Executors
// ============================================================================

/**
 * Execute: Create Spec
 */
async function executeCreateSpec(
  parameters: Record<string, any>,
  projectId: string,
  userId: string
): Promise<ActionResult> {
  const supabase = await createServerClient();

  const {
    feature_description,
    target_segment,
    success_metrics,
  } = parameters;

  if (!feature_description) {
    throw new Error('feature_description is required');
  }

  // Generate spec content using GPT-4o
  const specPrompt = `Create a product specification for the following feature:

Feature: ${feature_description}
${target_segment ? `Target Segment: ${target_segment}` : ''}
${success_metrics ? `Success Metrics: ${success_metrics}` : ''}

Generate a comprehensive product spec with the following sections:
1. Overview
2. Problem Statement
3. Proposed Solution
4. User Stories
5. Success Metrics
6. Technical Considerations

Format as markdown.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are a product manager writing detailed product specifications.',
      },
      { role: 'user', content: specPrompt },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const specContent = completion.choices[0]?.message?.content;

  if (!specContent) {
    throw new Error('Failed to generate spec content');
  }

  // Create spec in database
  const { data: spec, error: specError } = await supabase
    .from('specs')
    .insert({
      project_id: projectId,
      title: `Spec: ${feature_description}`,
      content: specContent,
      status: 'draft',
      created_by: userId,
    })
    .select('id, title')
    .single();

  if (specError || !spec) {
    throw new Error('Failed to create spec in database');
  }

  return {
    success: true,
    action_type: 'create_spec',
    data: spec,
    created_resource_id: spec.id,
    created_resource_url: `/${projectId}/specs/${spec.id}`,
  };
}

/**
 * Execute: Escalate Issue
 */
async function executeEscalateIssue(
  parameters: Record<string, any>,
  projectId: string,
  userId: string
): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { feedback_id, new_priority, reason } = parameters;

  if (!feedback_id) {
    throw new Error('feedback_id is required');
  }

  // Update feedback priority
  const { data: feedback, error: updateError } = await supabase
    .from('posts')
    .update({
      priority: new_priority || 'high',
      updated_at: new Date().toISOString(),
    })
    .eq('id', feedback_id)
    .eq('project_id', projectId)
    .select('id, title, priority')
    .single();

  if (updateError || !feedback) {
    throw new Error('Failed to escalate feedback item');
  }

  // Add a comment explaining the escalation
  if (reason) {
    await supabase.from('comments').insert({
      post_id: feedback_id,
      user_id: userId,
      content: `Escalated to ${new_priority || 'high'} priority via Ask SignalsLoop. Reason: ${reason}`,
    });
  }

  return {
    success: true,
    action_type: 'escalate_issue',
    data: feedback,
    created_resource_id: feedback_id,
    created_resource_url: `/${projectId}/post/${feedback_id}`,
  };
}

/**
 * Execute: Generate Report
 */
async function executeGenerateReport(
  parameters: Record<string, any>,
  projectId: string,
  userId: string
): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { topic, time_range, format } = parameters;

  if (!topic) {
    throw new Error('topic is required');
  }

  // Fetch relevant data based on topic
  let reportData = '';

  // For MVP, generate a simple report using GPT-4o
  // In production, this would fetch actual data from the database
  const reportPrompt = `Generate a comprehensive report on the following topic for a product feedback management system:

Topic: ${topic}
Time Range: ${time_range || 'last 30 days'}
Format: ${format || 'executive summary'}

The report should include:
1. Executive Summary
2. Key Findings
3. Trends and Patterns
4. Recommendations
5. Next Steps

Format as markdown with clear sections and bullet points.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are a product analytics expert generating insightful reports.',
      },
      { role: 'user', content: reportPrompt },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const reportContent = completion.choices[0]?.message?.content;

  if (!reportContent) {
    throw new Error('Failed to generate report');
  }

  // For now, return the report content
  // In production, this might be saved as a document or emailed
  return {
    success: true,
    action_type: 'generate_report',
    data: {
      report_content: reportContent,
      generated_at: new Date().toISOString(),
    },
  };
}

/**
 * Execute: Create Roadmap Item
 */
async function executeCreateRoadmapItem(
  parameters: Record<string, any>,
  projectId: string,
  userId: string
): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { feature_name, quarter, priority } = parameters;

  if (!feature_name) {
    throw new Error('feature_name is required');
  }

  // Create roadmap item
  const { data: roadmapItem, error: roadmapError } = await supabase
    .from('roadmap_items')
    .insert({
      project_id: projectId,
      title: feature_name,
      description: `Created via Ask SignalsLoop`,
      target_quarter: quarter,
      priority: priority || 'medium',
      status: 'planned',
      created_by: userId,
    })
    .select('id, title')
    .single();

  if (roadmapError || !roadmapItem) {
    throw new Error('Failed to create roadmap item');
  }

  return {
    success: true,
    action_type: 'create_roadmap_item',
    data: roadmapItem,
    created_resource_id: roadmapItem.id,
    created_resource_url: `/${projectId}/roadmap`,
  };
}

/**
 * Execute: Send Notification
 */
async function executeSendNotification(
  parameters: Record<string, any>,
  projectId: string,
  userId: string
): Promise<ActionResult> {
  const { recipient, subject, message } = parameters;

  if (!recipient || !subject) {
    throw new Error('recipient and subject are required');
  }

  // For MVP, just log the notification
  // In production, this would send via email/Slack
  console.log('Notification would be sent:', {
    recipient,
    subject,
    message,
    projectId,
  });

  return {
    success: true,
    action_type: 'send_notification',
    data: {
      recipient,
      subject,
      sent_at: new Date().toISOString(),
    },
  };
}

/**
 * Execute: Schedule Query
 */
async function executeScheduleQuery(
  parameters: Record<string, any>,
  projectId: string,
  userId: string
): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { query, frequency, delivery } = parameters;

  if (!query || !frequency) {
    throw new Error('query and frequency are required');
  }

  // Create scheduled query
  const { data: scheduledQuery, error: scheduleError } = await supabase
    .from('ask_scheduled_queries')
    .insert({
      project_id: projectId,
      user_id: userId,
      query_text: query,
      frequency,
      delivery_method: delivery || 'email',
      time_utc: '09:00:00', // Default 9 AM UTC
      is_active: true,
    })
    .select('id, query_text, frequency, next_run_at')
    .single();

  if (scheduleError || !scheduledQuery) {
    throw new Error('Failed to schedule query');
  }

  return {
    success: true,
    action_type: 'schedule_query',
    data: scheduledQuery,
    created_resource_id: scheduledQuery.id,
  };
}
