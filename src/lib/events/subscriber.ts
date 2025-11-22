/**
 * Event Subscriber - Subscribe to domain events via Supabase Realtime
 * Used by agents and UI components to react to events
 */

import { getServiceRoleClient } from '@/lib/supabase-singleton';
import { DomainEvent, EventHandler, EventSubscription } from './types';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Subscribes to a specific event type and calls the handler when events occur
 *
 * @param eventType - The event type to subscribe to (e.g., 'feedback.created')
 * @param handler - Function to call when event is received
 * @param options - Optional configuration
 * @returns Subscription object with cleanup function
 *
 * @example
 * ```typescript
 * const subscription = await subscribeToEvent(
 *   EventType.FEEDBACK_CREATED,
 *   async (event) => {
 *     console.log('New feedback:', event.payload);
 *     // Process the event...
 *   }
 * );
 *
 * // Later, cleanup:
 * await subscription.unsubscribe();
 * ```
 */
export async function subscribeToEvent(
  eventType: string,
  handler: EventHandler,
  options?: {
    projectId?: string;           // Filter events by project
    correlationId?: string;       // Filter by correlation ID
  }
): Promise<{ unsubscribe: () => Promise<void> }> {
  const supabase = getServiceRoleClient();

  // Create a unique channel name
  const channelName = `events:${eventType}:${Date.now()}`;

  // Subscribe to INSERT events on the events table
  const channel: RealtimeChannel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'events',
        filter: `type=eq.${eventType}`,
      },
      async (payload) => {
        const event = payload.new as DomainEvent;

        // Apply optional filters
        if (options?.projectId && event.metadata.project_id !== options.projectId) {
          return;
        }

        if (options?.correlationId && event.metadata.correlation_id !== options.correlationId) {
          return;
        }

        // Call the handler
        try {
          await handler(event);
        } catch (error) {
          console.error(`Error handling event ${eventType}:`, error);
          // TODO: Implement dead letter queue for failed events
        }
      }
    )
    .subscribe();

  console.log(`📡 Subscribed to event: ${eventType}`);

  // Return cleanup function
  return {
    unsubscribe: async () => {
      await supabase.removeChannel(channel);
      console.log(`📡 Unsubscribed from event: ${eventType}`);
    },
  };
}

/**
 * Subscribes to multiple event types at once
 * More efficient than creating separate subscriptions
 *
 * @param subscriptions - Array of event subscriptions
 * @param options - Optional configuration
 * @returns Cleanup function to unsubscribe from all events
 */
export async function subscribeToEvents(
  subscriptions: EventSubscription[],
  options?: {
    projectId?: string;
  }
): Promise<{ unsubscribe: () => Promise<void> }> {
  const cleanupFunctions: Array<() => Promise<void>> = [];

  for (const sub of subscriptions) {
    const { unsubscribe } = await subscribeToEvent(sub.eventType, sub.handler, options);
    cleanupFunctions.push(unsubscribe);
  }

  return {
    unsubscribe: async () => {
      await Promise.all(cleanupFunctions.map(fn => fn()));
    },
  };
}

/**
 * Polls for events (fallback when Realtime is unavailable)
 * Used as backup when Supabase Realtime hits rate limits
 *
 * @param eventType - Event type to poll for
 * @param handler - Handler function
 * @param options - Configuration options
 * @returns Cleanup function
 */
export function pollForEvents(
  eventType: string,
  handler: EventHandler,
  options?: {
    projectId?: string;
    interval?: number;             // Polling interval in ms (default: 5000)
  }
): { stop: () => void } {
  const supabase = getServiceRoleClient();
  const interval = options?.interval || 5000;
  let lastCheckedAt = new Date();
  let isRunning = true;

  const poll = async () => {
    if (!isRunning) return;

    try {
      // Query for new events since last check
      let query = supabase
        .from('events')
        .select('*')
        .eq('type', eventType)
        .gt('created_at', lastCheckedAt.toISOString())
        .order('created_at', { ascending: true });

      if (options?.projectId) {
        query = query.eq('metadata->>project_id', options.projectId);
      }

      const { data: events, error } = await query;

      if (error) {
        console.error('Error polling for events:', error);
        return;
      }

      if (events && events.length > 0) {
        lastCheckedAt = new Date(events[events.length - 1].created_at!);

        // Process events sequentially
        for (const event of events) {
          try {
            await handler(event as DomainEvent);
          } catch (error) {
            console.error(`Error handling event ${eventType}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }

    // Schedule next poll
    if (isRunning) {
      setTimeout(poll, interval);
    }
  };

  // Start polling
  poll();

  console.log(`🔄 Started polling for event: ${eventType} (interval: ${interval}ms)`);

  return {
    stop: () => {
      isRunning = false;
      console.log(`🔄 Stopped polling for event: ${eventType}`);
    },
  };
}
