import { getSupabaseServiceRoleClient } from '@/lib/supabase-client'
import { publishEvent } from '@/lib/events/publisher'

export type ActionType =
  | 'merge_suggestion'
  | 'priority_change'
  | 'competitive_threat'
  | 'anomaly_detected'
  | 'spec_ready_for_review'
  | 'roadmap_adjustment'
  | 'customer_at_risk'
  | 'opportunity_identified'
  | 'release_ready'
  | 'feature_gap_detected'
  | 'sentiment_drop'
  | 'feedback_spike'
  | 'pm_assignment_needed'
  | 'poll_suggested'
  | 'knowledge_gap_detected'

export type ActionSeverity = 'critical' | 'warning' | 'info' | 'success'

export interface Action {
  id?: string
  projectId: string
  actionType: ActionType
  priority: 1 | 2 | 3
  severity: ActionSeverity
  title: string
  description?: string
  relatedPostId?: string
  relatedRoadmapId?: string
  relatedCompetitorId?: string
  relatedSpecId?: string
  relatedPollId?: string
  metadata?: Record<string, any>
  requiresApproval?: boolean
  expiresAt?: Date
}

export interface ActionQueueStats {
  pending: number
  executed: number
  dismissed: number
  critical: number
  highPriority: number
  byType: Record<ActionType, number>
}

/**
 * Add a new action to the queue
 */
export async function addAction(action: Action): Promise<string> {
  console.log(`[Action Queue] Adding action: ${action.title}`)

  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) {
    throw new Error('Service role client not available')
  }

  const { data, error } = await supabase
    .from('unified_action_queue')
    .insert({
      project_id: action.projectId,
      action_type: action.actionType,
      priority: action.priority,
      severity: action.severity,
      title: action.title,
      description: action.description,
      related_post_id: action.relatedPostId,
      related_roadmap_id: action.relatedRoadmapId,
      related_competitor_id: action.relatedCompetitorId,
      related_spec_id: action.relatedSpecId,
      metadata: action.metadata || {},
      requires_approval: action.requiresApproval ?? true,
      expires_at: action.expiresAt?.toISOString()
    })
    .select('id')
    .single()

  if (error) {
    console.error(`[Action Queue] Failed to add action:`, error)
    throw new Error(`Failed to add action: ${error.message}`)
  }

  // Publish event
  await publishEvent({
    type: 'action.created',
    projectId: action.projectId,
    payload: {
      actionId: data.id,
      actionType: action.actionType,
      severity: action.severity,
      priority: action.priority
    }
  })

  console.log(`[Action Queue] ✓ Action added: ${data.id}`)
  return data.id
}

/**
 * Get all pending actions for a project
 */
export async function getPendingActions(projectId: string): Promise<any[]> {
  const { data, error } = await getSupabaseServiceRoleClient()
    .rpc('get_pending_actions', { p_project_id: projectId })

  if (error) {
    console.error(`[Action Queue] Failed to fetch pending actions:`, error)
    throw new Error(`Failed to fetch actions: ${error.message}`)
  }

  return data || []
}

/**
 * Get action queue statistics
 */
export async function getActionQueueStats(projectId: string): Promise<ActionQueueStats> {
  const { data, error } = await getSupabaseServiceRoleClient()
    .rpc('get_action_queue_stats', { p_project_id: projectId })

  if (error) {
    console.error(`[Action Queue] Failed to fetch stats:`, error)
    throw new Error(`Failed to fetch stats: ${error.message}`)
  }

  return data as ActionQueueStats
}

/**
 * Execute an action
 */
export async function executeAction(
  actionId: string,
  userId: string,
  result?: any
): Promise<void> {
  console.log(`[Action Queue] Executing action: ${actionId}`)

  // Fetch action details
  const { data: action, error: fetchError } = await getSupabaseServiceRoleClient()
    .from('unified_action_queue')
    .select('*')
    .eq('id', actionId)
    .single()

  if (fetchError || !action) {
    throw new Error(`Action not found: ${actionId}`)
  }

  // Execute based on action type
  let executionResult = result || {}

  try {
    switch (action.action_type) {
      case 'merge_suggestion':
        executionResult = await executeMergeSuggestion(action)
        break

      case 'priority_change':
        executionResult = await executePriorityChange(action)
        break

      case 'spec_ready_for_review':
        executionResult = await approveSpec(action)
        break

      case 'roadmap_adjustment':
        executionResult = await executeRoadmapAdjustment(action)
        break

      default:
        executionResult = { message: 'Action acknowledged' }
    }

    // Update action as executed
    const { error: updateError } = await getSupabaseServiceRoleClient()
      .from('unified_action_queue')
      .update({
        executed: true,
        executed_by: userId,
        executed_at: new Date().toISOString(),
        execution_result: executionResult
      })
      .eq('id', actionId)

    if (updateError) {
      throw new Error(`Failed to update action: ${updateError.message}`)
    }

    // Publish event
    await publishEvent({
      type: 'action.executed',
      projectId: action.project_id,
      payload: {
        actionId,
        actionType: action.action_type,
        executedBy: userId,
        result: executionResult
      }
    })

    console.log(`[Action Queue] ✓ Action executed: ${actionId}`)

  } catch (error: any) {
    console.error(`[Action Queue] ✗ Execution failed:`, error.message)
    throw error
  }
}

/**
 * Dismiss an action
 */
export async function dismissAction(
  actionId: string,
  userId: string,
  reason?: string
): Promise<void> {
  console.log(`[Action Queue] Dismissing action: ${actionId}`)

  const { error } = await getSupabaseServiceRoleClient()
    .from('unified_action_queue')
    .update({
      dismissed: true,
      dismissed_by: userId,
      dismissed_at: new Date().toISOString(),
      dismissed_reason: reason
    })
    .eq('id', actionId)

  if (error) {
    throw new Error(`Failed to dismiss action: ${error.message}`)
  }

  // Publish event
  const { data: action } = await getSupabaseServiceRoleClient()
    .from('unified_action_queue')
    .select('project_id, action_type')
    .eq('id', actionId)
    .single()

  if (action) {
    await publishEvent({
      type: 'action.dismissed',
      projectId: action.project_id,
      payload: {
        actionId,
        actionType: action.action_type,
        dismissedBy: userId,
        reason
      }
    })
  }

  console.log(`[Action Queue] ✓ Action dismissed: ${actionId}`)
}

/**
 * Clean up expired actions
 */
export async function cleanupExpiredActions(): Promise<number> {
  const { data, error } = await getSupabaseServiceRoleClient()
    .from('unified_action_queue')
    .update({
      dismissed: true,
      dismissed_reason: 'Expired'
    })
    .lt('expires_at', new Date().toISOString())
    .is('executed', false)
    .is('dismissed', false)
    .select('id')

  if (error) {
    console.error(`[Action Queue] Failed to cleanup expired actions:`, error)
    return 0
  }

  const count = data?.length || 0
  console.log(`[Action Queue] Cleaned up ${count} expired actions`)
  return count
}

// ============================================================================
// Action Execution Handlers
// ============================================================================

/**
 * Execute merge suggestion
 */
async function executeMergeSuggestion(action: any): Promise<any> {
  const { sourcePostId, targetPostId, similarityScore } = action.metadata

  // Perform merge
  const { data: source } = await getSupabaseServiceRoleClient()
    .from('posts')
    .select('vote_count, comment_count')
    .eq('id', sourcePostId)
    .single()

  // Update source post
  await getSupabaseServiceRoleClient()
    .from('posts')
    .update({
      status: 'merged',
      merged_into: targetPostId
    })
    .eq('id', sourcePostId)

  // Aggregate stats
  if (source) {
    await getSupabaseServiceRoleClient().rpc('increment_post_stats', {
      p_post_id: targetPostId,
      p_votes: source.vote_count || 0,
      p_comments: source.comment_count || 0
    })
  }

  // Record merge
  await getSupabaseServiceRoleClient()
    .from('feedback_merges')
    .insert({
      project_id: action.project_id,
      primary_post_id: targetPostId,
      merged_post_id: sourcePostId,
      similarity_score: similarityScore,
      auto_merged: false,
      merged_by: action.executed_by,
      merge_reason: 'Approved merge suggestion'
    })

  return {
    merged: true,
    sourceId: sourcePostId,
    targetId: targetPostId
  }
}

/**
 * Execute priority change
 */
async function executePriorityChange(action: any): Promise<any> {
  const { postId, newPriority } = action.metadata

  await getSupabaseServiceRoleClient()
    .from('posts')
    .update({ priority: newPriority })
    .eq('id', postId)

  return {
    updated: true,
    postId,
    newPriority
  }
}

/**
 * Approve spec for development
 */
async function approveSpec(action: any): Promise<any> {
  const { specId } = action.metadata

  await getSupabaseServiceRoleClient()
    .from('specs')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString()
    })
    .eq('id', specId)

  return {
    approved: true,
    specId
  }
}

/**
 * Execute roadmap adjustment
 */
async function executeRoadmapAdjustment(action: any): Promise<any> {
  const { roadmapId, adjustmentType, newPriority, newStatus } = action.metadata

  const updates: any = {}
  if (newPriority) updates.priority = newPriority
  if (newStatus) updates.status = newStatus

  await getSupabaseServiceRoleClient()
    .from('roadmap_items')
    .update(updates)
    .eq('id', roadmapId)

  return {
    adjusted: true,
    roadmapId,
    adjustmentType,
    updates
  }
}
