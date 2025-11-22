/**
 * Agent Runner Service
 *
 * This service starts all event-driven agents by subscribing them to their respective events.
 * Agents run continuously, listening for events and reacting in real-time.
 *
 * Usage:
 *   1. Via API route (long-running): GET /api/agents/start
 *   2. Via Edge Function (serverless): Supabase Edge Function
 *   3. Via background service: Node.js service or Docker container
 */

import { subscribeToEvent, subscribeToEvents } from '@/lib/events/subscriber';
import { AGENT_REGISTRY, getRegisteredEventTypes } from './registry';
import { EventType, DomainEvent, EventHandler } from '@/lib/events/types';

/**
 * Start all agents by subscribing to their events
 * This function runs indefinitely, listening for events
 */
export async function startAllAgents(): Promise<() => Promise<void>> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 Starting Event-Driven Agents                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  const subscriptions: Array<{ unsubscribe: () => Promise<void> }> = [];
  const registeredEvents = getRegisteredEventTypes();

  console.log(`📡 Registered event types: ${registeredEvents.length}`);
  console.log('');

  // Subscribe to each event type
  for (const eventType of registeredEvents) {
    const handlers = AGENT_REGISTRY[eventType];

    if (!handlers || handlers.length === 0) {
      continue;
    }

    console.log(`📨 ${eventType}`);
    console.log(`   └─ ${handlers.length} agent(s) will react to this event`);

    // Create a combined handler that runs all agents for this event in parallel
    const combinedHandler = async (event: DomainEvent) => {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📬 Event received: ${event.type}`);
      console.log(`   Aggregate: ${event.aggregate_type}:${event.aggregate_id}`);
      console.log(`   Project: ${event.metadata.project_id}`);
      console.log(`   Time: ${new Date(event.created_at || Date.now()).toISOString()}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      // Run all handlers in parallel
      await Promise.all(
        handlers.map(async (handler: EventHandler, index: number) => {
          try {
            await handler(event);
          } catch (error) {
            console.error(`❌ Agent ${index + 1} failed for ${event.type}:`, error);
            // Continue - don't let one agent failure break others
          }
        })
      );
    };

    // Subscribe to this event type
    const subscription = await subscribeToEvent(eventType, combinedHandler);
    subscriptions.push(subscription);
  }

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ All agents started and listening                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Active Agents:');
  console.log(`  • Sentiment Analysis Agent (${EventType.FEEDBACK_CREATED})`);
  console.log(`  • Proactive Spec Writer Agent (${EventType.THEME_THRESHOLD_REACHED})`);
  console.log('');
  console.log('💡 Agents are now running autonomously, reacting to events in real-time.');
  console.log('');

  // Return cleanup function
  return async () => {
    console.log('\n🛑 Stopping all agents...');
    await Promise.all(subscriptions.map(sub => sub.unsubscribe()));
    console.log('✅ All agents stopped\n');
  };
}

/**
 * Start a specific agent by event type
 * Useful for testing individual agents
 */
export async function startAgent(eventType: string): Promise<() => Promise<void>> {
  const handlers = AGENT_REGISTRY[eventType];

  if (!handlers || handlers.length === 0) {
    throw new Error(`No agents registered for event type: ${eventType}`);
  }

  console.log(`🚀 Starting agent for: ${eventType}`);
  console.log(`   ${handlers.length} handler(s) registered\n`);

  const combinedHandler = async (event: DomainEvent) => {
    console.log(`📬 Event: ${event.type} (${event.aggregate_type}:${event.aggregate_id})`);

    await Promise.all(
      handlers.map(async (handler: EventHandler) => {
        try {
          await handler(event);
        } catch (error) {
          console.error(`❌ Agent failed:`, error);
        }
      })
    );
  };

  const subscription = await subscribeToEvent(eventType, combinedHandler);

  console.log(`✅ Agent started for: ${eventType}\n`);

  return async () => {
    await subscription.unsubscribe();
    console.log(`🛑 Agent stopped for: ${eventType}\n`);
  };
}

/**
 * Health check for agent runner
 * Returns status of all registered agents
 */
export function getAgentStatus() {
  const registeredEvents = getRegisteredEventTypes();

  return {
    status: 'healthy',
    agentsRegistered: registeredEvents.length,
    events: registeredEvents.map(eventType => ({
      eventType,
      handlerCount: AGENT_REGISTRY[eventType]?.length || 0,
    })),
    timestamp: new Date().toISOString(),
  };
}

/**
 * List all registered agents and their event subscriptions
 */
export function listAgents() {
  const registeredEvents = getRegisteredEventTypes();

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Registered Event-Driven Agents                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  registeredEvents.forEach(eventType => {
    const handlers = AGENT_REGISTRY[eventType];
    console.log(`📨 ${eventType}`);
    console.log(`   └─ ${handlers?.length || 0} agent(s)\n`);
  });

  console.log(`Total: ${registeredEvents.length} event types with active agents\n`);
}
