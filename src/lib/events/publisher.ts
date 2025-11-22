/**
 * Event Publisher - Publishes domain events to the event store
 * Used by all parts of the system to publish events
 */

import { getServiceRoleClient } from '@/lib/supabase-singleton';
import { DomainEvent, EventMetadata } from './types';

/**
 * Publishes a domain event to the event store
 *
 * @param event - The domain event to publish
 * @returns The published event with ID and timestamp
 *
 * @example
 * ```typescript
 * await publishEvent({
 *   type: EventType.FEEDBACK_CREATED,
 *   aggregate_type: AggregateType.POST,
 *   aggregate_id: post.id,
 *   payload: {
 *     title: post.title,
 *     content: post.content,
 *     category: post.category,
 *   },
 *   metadata: {
 *     project_id: post.project_id,
 *     user_id: post.user_id,
 *     source: 'api',
 *   },
 *   version: 1,
 * });
 * ```
 */
export async function publishEvent(event: DomainEvent): Promise<DomainEvent> {
  const supabase = getServiceRoleClient();

  // Add timestamp to metadata if not present
  const metadata: EventMetadata = {
    ...event.metadata,
    timestamp: event.metadata.timestamp || new Date().toISOString(),
  };

  // Insert event into events table
  const { data, error } = await supabase
    .from('events')
    .insert({
      type: event.type,
      aggregate_type: event.aggregate_type,
      aggregate_id: event.aggregate_id,
      payload: event.payload,
      metadata,
      version: event.version || 1,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to publish event:', error);
    throw new Error(`Failed to publish event: ${error.message}`);
  }

  console.log(`✅ Event published: ${event.type} for ${event.aggregate_type}:${event.aggregate_id}`);

  return data as DomainEvent;
}

/**
 * Publishes multiple events in a single transaction
 * More efficient than publishing events one by one
 *
 * @param events - Array of domain events to publish
 * @returns Array of published events with IDs and timestamps
 */
export async function publishEvents(events: DomainEvent[]): Promise<DomainEvent[]> {
  const supabase = getServiceRoleClient();

  // Add timestamps to metadata
  const eventsWithTimestamps = events.map(event => ({
    type: event.type,
    aggregate_type: event.aggregate_type,
    aggregate_id: event.aggregate_id,
    payload: event.payload,
    metadata: {
      ...event.metadata,
      timestamp: event.metadata.timestamp || new Date().toISOString(),
    },
    version: event.version || 1,
  }));

  // Insert all events at once
  const { data, error } = await supabase
    .from('events')
    .insert(eventsWithTimestamps)
    .select();

  if (error) {
    console.error('Failed to publish events:', error);
    throw new Error(`Failed to publish events: ${error.message}`);
  }

  console.log(`✅ Published ${events.length} events in batch`);

  return data as DomainEvent[];
}

/**
 * Helper function to create correlation IDs for event chains
 * Use this to trace related events across the system
 *
 * @returns A unique correlation ID (UUID v4)
 */
export function createCorrelationId(): string {
  return crypto.randomUUID();
}
