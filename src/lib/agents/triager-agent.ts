import { publishEvent } from '@/lib/events/publisher'
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client'
import { categorize } from '@/lib/ai-categorization'
import { calculatePriorityScore } from '@/lib/enhanced-priority-scoring'
import { detectDuplicates } from '@/lib/enhanced-duplicate-detection'
import { addAction } from '@/lib/actions/action-queue'

export interface TriageResult {
  postId: string
  category?: string
  priority?: number
  assignedPmId?: string
  duplicateOf?: string
  similarityScore?: number
  actions: {
    categorized: boolean
    prioritized: boolean
    assigned: boolean
    mergesuggested: boolean
    merged: boolean
  }
  error?: string
}

/**
 * Triager Agent - Orchestrates automatic feedback triage
 *
 * Workflow:
 * 1. Auto-categorize (if not already categorized)
 * 2. Auto-prioritize (if not already prioritized)
 * 3. Detect duplicates and suggest/auto-merge
 * 4. Assign to appropriate PM based on rules
 * 5. Record triage results
 * 6. Publish events for downstream agents
 */
export async function triageAgent(postId: string, projectId: string): Promise<TriageResult> {
  console.log(`[Triager Agent] Processing feedback: ${postId}`)

  const result: TriageResult = {
    postId,
    actions: {
      categorized: false,
      prioritized: false,
      assigned: false,
      merged: false,
      mergeSuggested: false
    }
  }

  try {
    // Update triage queue status
    await updateTriageStatus(postId, 'processing')

    // 1. Fetch feedback
    const { data: post, error: fetchError } = await getSupabaseServiceRoleClient()
      .from('posts')
      .select('*, projects(*)')
      .eq('id', postId)
      .single()

    if (fetchError || !post) {
      throw new Error(`Failed to fetch post: ${fetchError?.message}`)
    }

    // 2. Auto-categorize (if not already categorized)
    if (!post.category || post.category === 'Uncategorized') {
      try {
        const category = await categorize(post.title, post.description || '')
        result.category = category

        await getSupabaseServiceRoleClient()
          .from('posts')
          .update({ category })
          .eq('id', postId)

        result.actions.categorized = true
        console.log(`[Triager] ✓ Categorized as: ${category}`)
      } catch (error: any) {
        console.error(`[Triager] ✗ Categorization failed:`, error.message)
      }
    } else {
      result.category = post.category
    }

    // 3. Auto-prioritize (if not already prioritized)
    if (!post.priority) {
      try {
        const priorityResult = await calculatePriorityScore({
          post: {
            id: postId,
            title: post.title,
            description: post.description || '',
            vote_count: post.vote_count || 0,
            comment_count: post.comment_count || 0,
            created_at: post.created_at
          },
          projectId
        })

        result.priority = priorityResult.priority

        await getSupabaseServiceRoleClient()
          .from('posts')
          .update({ priority: priorityResult.priority })
          .eq('id', postId)

        result.actions.prioritized = true
        console.log(`[Triager] ✓ Priority set to: P${priorityResult.priority}`)
      } catch (error: any) {
        console.error(`[Triager] ✗ Prioritization failed:`, error.message)
      }
    } else {
      result.priority = post.priority
    }

    // 4. Duplicate detection
    try {
      const duplicates = await detectDuplicates({
        postId,
        title: post.title,
        description: post.description || '',
        projectId
      })

      if (duplicates && duplicates.length > 0) {
        const topDuplicate = duplicates[0]
        result.duplicateOf = topDuplicate.duplicate_post_id
        result.similarityScore = topDuplicate.similarity_score

        // Check auto-merge settings
        const { data: settings } = await getSupabaseServiceRoleClient()
          .from('pm_assignments')
          .select('auto_merge_enabled, auto_merge_confidence_threshold')
          .eq('project_id', projectId)
          .limit(1)
          .single()

        const threshold = settings?.auto_merge_confidence_threshold || 0.85

        if (settings?.auto_merge_enabled && topDuplicate.similarity_score >= threshold) {
          // Auto-merge
          await mergeFeedback(
            postId,
            topDuplicate.duplicate_post_id,
            projectId,
            topDuplicate.similarity_score,
            true
          )
          result.actions.merged = true
          console.log(`[Triager] ✓ Auto-merged into: ${topDuplicate.duplicate_post_id}`)
        } else {
          // Create merge suggestion in action queue
          await createMergeSuggestion(
            postId,
            topDuplicate.duplicate_post_id,
            projectId,
            topDuplicate.similarity_score
          )
          result.actions.mergeSuggested = true
          console.log(`[Triager] ✓ Merge suggested for: ${topDuplicate.duplicate_post_id}`)
        }
      }
    } catch (error: any) {
      console.error(`[Triager] ✗ Duplicate detection failed:`, error.message)
    }

    // 5. PM Assignment (only if not already assigned and not merged)
    if (!post.assigned_pm_id && !result.actions.merged) {
      try {
        const assignedPmId = await assignToPM(
          post,
          projectId,
          result.category || post.category,
          result.priority || post.priority
        )

        if (assignedPmId) {
          result.assignedPmId = assignedPmId
          result.actions.assigned = true

          await getSupabaseServiceRoleClient()
            .from('posts')
            .update({
              assigned_pm_id: assignedPmId,
              assigned_at: new Date().toISOString(),
              auto_assigned: true
            })
            .eq('id', postId)

          console.log(`[Triager] ✓ Assigned to PM: ${assignedPmId}`)

          // Notify PM if enabled
          await notifyPMOfAssignment(assignedPmId, post)
        }
      } catch (error: any) {
        console.error(`[Triager] ✗ PM assignment failed:`, error.message)
      }
    }

    // 6. Record triage in queue
    await getSupabaseServiceRoleClient()
      .from('triage_queue')
      .update({
        status: 'completed',
        suggested_category: result.category,
        suggested_priority: result.priority,
        suggested_pm_id: result.assignedPmId,
        duplicate_of: result.duplicateOf,
        similarity_score: result.similarityScore,
        auto_categorized: result.actions.categorized,
        auto_prioritized: result.actions.prioritized,
        auto_assigned: result.actions.assigned,
        auto_merged: result.actions.merged,
        processed_at: new Date().toISOString()
      })
      .eq('post_id', postId)

    // 7. Publish event
    await publishEvent({
      type: 'feedback.triaged',
      projectId,
      payload: {
        postId,
        ...result
      }
    })

    console.log(`[Triager] ✓ Triage completed for: ${postId}`)
    return result

  } catch (error: any) {
    console.error(`[Triager] ✗ Triage failed for ${postId}:`, error.message)

    // Record error in queue
    await getSupabaseServiceRoleClient()
      .from('triage_queue')
      .update({
        status: 'failed',
        error_message: error.message
      })
      .eq('post_id', postId)

    result.error = error.message
    return result
  }
}

/**
 * Assign feedback to appropriate PM based on assignment rules
 */
async function assignToPM(
  post: any,
  projectId: string,
  category: string,
  priority: number
): Promise<string | null> {
  // Fetch PM assignment rules for this project
  const { data: pmRules, error } = await getSupabaseServiceRoleClient()
    .from('pm_assignments')
    .select('*')
    .eq('project_id', projectId)
    .eq('auto_assign_enabled', true)
    .order('priority_threshold', { ascending: true }) // Higher priority PMs first

  if (error || !pmRules || pmRules.length === 0) {
    console.log(`[Triager] No PM assignment rules found for project ${projectId}`)
    return null
  }

  // Match PM based on rules
  for (const pm of pmRules) {
    let matches = true

    // Check product areas/themes
    if (pm.product_areas && pm.product_areas.length > 0) {
      const categoryMatches = pm.product_areas.some((area: string) =>
        category?.toLowerCase().includes(area.toLowerCase())
      )

      if (!categoryMatches) {
        matches = false
        continue
      }
    }

    // Check priority threshold (only assign if priority is high enough)
    if (pm.priority_threshold && priority > pm.priority_threshold) {
      matches = false
      continue
    }

    // Check customer segments (if customer segment data exists)
    if (pm.customer_segments && pm.customer_segments.length > 0 && post.customer_segment) {
      const segmentMatches = pm.customer_segments.includes(post.customer_segment)
      if (!segmentMatches) {
        matches = false
        continue
      }
    }

    // Match found!
    if (matches) {
      return pm.id
    }
  }

  // No matching PM found
  console.log(`[Triager] No matching PM found for category: ${category}, priority: P${priority}`)
  return null
}

/**
 * Merge source feedback into target feedback
 */
async function mergeFeedback(
  sourceId: string,
  targetId: string,
  projectId: string,
  similarityScore: number,
  autoMerged: boolean
) {
  // 1. Record merge
  await getSupabaseServiceRoleClient()
    .from('feedback_merges')
    .insert({
      project_id: projectId,
      primary_post_id: targetId,
      merged_post_id: sourceId,
      similarity_score: similarityScore,
      auto_merged: autoMerged,
      merge_reason: `Auto-merged due to ${(similarityScore * 100).toFixed(1)}% similarity`
    })

  // 2. Update source post
  await getSupabaseServiceRoleClient()
    .from('posts')
    .update({
      status: 'merged',
      merged_into: targetId
    })
    .eq('id', sourceId)

  // 3. Aggregate votes and comments to target
  const { data: source } = await getSupabaseServiceRoleClient()
    .from('posts')
    .select('vote_count, comment_count')
    .eq('id', sourceId)
    .single()

  if (source) {
    // Use the increment function
    await getSupabaseServiceRoleClient().rpc('increment_post_stats', {
      p_post_id: targetId,
      p_votes: source.vote_count || 0,
      p_comments: source.comment_count || 0
    })
  }

  // 4. Publish merge event
  await publishEvent({
    type: 'feedback.merged',
    projectId,
    payload: {
      sourceId,
      targetId,
      similarityScore,
      autoMerged
    }
  })
}

/**
 * Create merge suggestion in action queue
 */
async function createMergeSuggestion(
  sourceId: string,
  targetId: string,
  projectId: string,
  similarityScore: number
) {
  // Fetch post titles for description
  const { data: posts } = await getSupabaseServiceRoleClient()
    .from('posts')
    .select('id, title')
    .in('id', [sourceId, targetId])

  const sourceTitle = posts?.find(p => p.id === sourceId)?.title || 'Unknown'
  const targetTitle = posts?.find(p => p.id === targetId)?.title || 'Unknown'

  await addAction({
    projectId,
    actionType: 'merge_suggestion',
    priority: similarityScore > 0.9 ? 1 : 2,
    severity: similarityScore > 0.9 ? 'warning' : 'info',
    title: 'Review suggested merge',
    description: `Two similar feedback items detected (${(similarityScore * 100).toFixed(1)}% match)`,
    relatedPostId: sourceId,
    metadata: {
      sourcePostId: sourceId,
      targetPostId: targetId,
      sourceTitle,
      targetTitle,
      similarityScore
    },
    requiresApproval: true
  })
}

/**
 * Notify PM of new assignment
 */
async function notifyPMOfAssignment(pmId: string, post: any) {
  // Fetch PM details
  const { data: pm } = await getSupabaseServiceRoleClient()
    .from('pm_assignments')
    .select('*')
    .eq('id', pmId)
    .single()

  if (!pm || !pm.notify_on_assignment) {
    return
  }

  // TODO: Send email notification
  // For now, just log
  console.log(`[Triager] Would notify ${pm.pm_email} about assignment of: ${post.title}`)

  // Could integrate with existing email system
  // await sendEmail({
  //   to: pm.pm_email,
  //   subject: `New feedback assigned: ${post.title}`,
  //   body: `...`
  // })
}

/**
 * Update triage queue status
 */
async function updateTriageStatus(postId: string, status: string) {
  await getSupabaseServiceRoleClient()
    .from('triage_queue')
    .update({ status })
    .eq('post_id', postId)
}

/**
 * Register Triager Agent with event system
 */
export function registerTriagerAgent() {
  // This agent will be triggered by feedback.created events
  // Registration happens in src/lib/agents/registry.ts
}
