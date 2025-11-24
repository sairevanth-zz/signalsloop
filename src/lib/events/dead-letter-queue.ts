/**
 * Dead Letter Queue - Handles failed event processing
 *
 * When event handlers fail, events are sent to the DLQ for later
 * investigation, retry, or manual resolution.
 */

import { getServiceRoleClient } from '@/lib/supabase-singleton';
import { DomainEvent } from './types';

export interface DeadLetterQueueEntry {
  id?: string;
  event_id?: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, any>;
  metadata: Record<string, any>;
  error_message: string;
  error_stack?: string;
  retry_count?: number;
  status?: 'pending' | 'retrying' | 'resolved' | 'abandoned';
  failed_at?: Date;
  last_retry_at?: Date;
}

/**
 * Send a failed event to the dead letter queue
 */
export async function sendToDeadLetterQueue(
  event: DomainEvent,
  error: Error
): Promise<void> {
  const supabase = getServiceRoleClient();

  try {
    const { error: insertError } = await supabase
      .from('event_dead_letter_queue')
      .insert({
        event_id: event.id,
        event_type: event.type,
        aggregate_type: event.aggregate_type,
        aggregate_id: event.aggregate_id,
        payload: event.payload,
        metadata: event.metadata,
        error_message: error.message,
        error_stack: error.stack,
        status: 'pending',
      });

    if (insertError) {
      console.error('[DLQ] Failed to insert into dead letter queue:', insertError);
      // Log to console as fallback if DLQ insertion fails
      console.error('[DLQ Fallback] Event:', JSON.stringify(event));
      console.error('[DLQ Fallback] Error:', error);
    } else {
      console.log(`[DLQ] Event sent to dead letter queue: ${event.type} (${event.aggregate_id})`);
    }
  } catch (dlqError) {
    console.error('[DLQ] Critical error writing to dead letter queue:', dlqError);
    // Last resort: log to console
    console.error('[DLQ Critical Fallback] Event:', JSON.stringify(event));
    console.error('[DLQ Critical Fallback] Error:', error);
  }
}

/**
 * Get pending events from the dead letter queue
 */
export async function getPendingDLQEvents(
  projectId?: string,
  limit: number = 50
): Promise<DeadLetterQueueEntry[]> {
  const supabase = getServiceRoleClient();

  let query = supabase
    .from('event_dead_letter_queue')
    .select('*')
    .eq('status', 'pending')
    .order('failed_at', { ascending: true })
    .limit(limit);

  if (projectId) {
    query = query.eq('metadata->>project_id', projectId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[DLQ] Error fetching pending events:', error);
    return [];
  }

  return data as DeadLetterQueueEntry[];
}

/**
 * Retry a failed event
 */
export async function retryDLQEvent(dlqId: string): Promise<boolean> {
  const supabase = getServiceRoleClient();

  try {
    const { data, error } = await supabase.rpc('retry_failed_event', {
      p_dlq_id: dlqId,
    });

    if (error) {
      console.error('[DLQ] Error retrying event:', error);
      return false;
    }

    if (data && data.success) {
      console.log(`[DLQ] Event retry initiated: ${dlqId} (attempt ${data.retry_count})`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('[DLQ] Failed to retry event:', error);
    return false;
  }
}

/**
 * Mark a DLQ event as resolved
 */
export async function resolveDLQEvent(
  dlqId: string,
  resolvedBy: string,
  notes?: string
): Promise<void> {
  const supabase = getServiceRoleClient();

  const { error } = await supabase
    .from('event_dead_letter_queue')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy,
      resolution_notes: notes,
    })
    .eq('id', dlqId);

  if (error) {
    console.error('[DLQ] Error resolving event:', error);
    throw error;
  }

  console.log(`[DLQ] Event resolved: ${dlqId}`);
}

/**
 * Mark a DLQ event as abandoned (after too many retries)
 */
export async function abandonDLQEvent(
  dlqId: string,
  reason?: string
): Promise<void> {
  const supabase = getServiceRoleClient();

  const { error } = await supabase
    .from('event_dead_letter_queue')
    .update({
      status: 'abandoned',
      resolution_notes: reason || 'Abandoned after maximum retry attempts',
    })
    .eq('id', dlqId);

  if (error) {
    console.error('[DLQ] Error abandoning event:', error);
    throw error;
  }

  console.log(`[DLQ] Event abandoned: ${dlqId}`);
}

/**
 * Get DLQ statistics for monitoring
 */
export async function getDLQStats(projectId?: string): Promise<{
  pending: number;
  retrying: number;
  resolved: number;
  abandoned: number;
  total: number;
}> {
  const supabase = getServiceRoleClient();

  let query = supabase
    .from('event_dead_letter_queue')
    .select('status');

  if (projectId) {
    query = query.eq('metadata->>project_id', projectId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[DLQ] Error fetching stats:', error);
    return { pending: 0, retrying: 0, resolved: 0, abandoned: 0, total: 0 };
  }

  const stats = {
    pending: 0,
    retrying: 0,
    resolved: 0,
    abandoned: 0,
    total: data?.length || 0,
  };

  data?.forEach((entry: { status: string }) => {
    if (entry.status === 'pending') stats.pending++;
    else if (entry.status === 'retrying') stats.retrying++;
    else if (entry.status === 'resolved') stats.resolved++;
    else if (entry.status === 'abandoned') stats.abandoned++;
  });

  return stats;
}
