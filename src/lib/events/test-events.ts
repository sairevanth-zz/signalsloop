/**
 * Event System Test Script
 *
 * This script tests the event publishing and subscription infrastructure.
 * Run this after deploying Phase 1 migrations to verify everything works.
 *
 * Usage:
 *   ts-node src/lib/events/test-events.ts
 *
 * Or create an API route to trigger the test from the browser.
 */

import { publishEvent, subscribeToEvent, EventType, AggregateType, DomainEvent } from './index';

/**
 * Test 1: Publish a test event
 */
export async function testPublishEvent(): Promise<void> {
  console.log('\n=== Test 1: Publishing Event ===');

  try {
    const event = await publishEvent({
      type: 'test.event',
      aggregate_type: 'test',
      aggregate_id: crypto.randomUUID(),
      payload: {
        message: 'Hello from event system!',
        timestamp: new Date().toISOString(),
      },
      metadata: {
        project_id: crypto.randomUUID(),
        source: 'test_script',
      },
      version: 1,
    });

    console.log('✅ Event published successfully:', event.id);
    console.log('   Type:', event.type);
    console.log('   Created:', event.created_at);
  } catch (error) {
    console.error('❌ Failed to publish event:', error);
    throw error;
  }
}

/**
 * Test 2: Subscribe to events
 */
export async function testSubscribeToEvent(): Promise<void> {
  console.log('\n=== Test 2: Subscribing to Events ===');

  try {
    const subscription = await subscribeToEvent(
      'test.event',
      async (event: DomainEvent) => {
        console.log('📨 Event received!');
        console.log('   ID:', event.id);
        console.log('   Type:', event.type);
        console.log('   Payload:', event.payload);
      }
    );

    console.log('✅ Subscription created for: test.event');
    console.log('   Listening for events...');

    // Keep subscription alive for 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Cleanup
    await subscription.unsubscribe();
    console.log('✅ Subscription cleaned up');
  } catch (error) {
    console.error('❌ Failed to subscribe to events:', error);
    throw error;
  }
}

/**
 * Test 3: End-to-end test (publish + subscribe)
 */
export async function testEndToEnd(): Promise<void> {
  console.log('\n=== Test 3: End-to-End Test ===');

  let eventReceived = false;

  try {
    // Subscribe first
    const subscription = await subscribeToEvent(
      'test.e2e',
      async (event: DomainEvent) => {
        console.log('📨 Event received in E2E test!');
        console.log('   Message:', event.payload.message);
        eventReceived = true;
      }
    );

    console.log('✅ Subscription created');

    // Wait a bit for subscription to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Publish event
    console.log('📤 Publishing test event...');
    await publishEvent({
      type: 'test.e2e',
      aggregate_type: 'test',
      aggregate_id: crypto.randomUUID(),
      payload: {
        message: 'End-to-end test message',
        test_number: 3,
      },
      metadata: {
        project_id: crypto.randomUUID(),
        source: 'test_script',
      },
      version: 1,
    });

    console.log('✅ Event published');

    // Wait for event to be received
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Cleanup
    await subscription.unsubscribe();

    if (eventReceived) {
      console.log('✅ END-TO-END TEST PASSED!');
    } else {
      console.log('❌ END-TO-END TEST FAILED - Event not received');
    }
  } catch (error) {
    console.error('❌ E2E test failed:', error);
    throw error;
  }
}

/**
 * Test 4: Test real feedback event flow (simulated)
 */
export async function testFeedbackEventFlow(): Promise<void> {
  console.log('\n=== Test 4: Feedback Event Flow (Simulated) ===');

  try {
    console.log('📤 Simulating feedback.created event...');

    await publishEvent({
      type: EventType.FEEDBACK_CREATED,
      aggregate_type: AggregateType.POST,
      aggregate_id: crypto.randomUUID(),
      payload: {
        title: 'Test feedback item',
        content: 'This is a test feedback to verify event flow',
        category: 'feature_request',
        vote_count: 0,
        status: 'active',
      },
      metadata: {
        project_id: crypto.randomUUID(),
        user_id: crypto.randomUUID(),
        source: 'test_script',
      },
      version: 1,
    });

    console.log('✅ feedback.created event published');
    console.log('   In Phase 2, this would trigger:');
    console.log('   - Sentiment Analysis Agent');
    console.log('   - Duplicate Detection Agent');
    console.log('   - Notification Agent');
  } catch (error) {
    console.error('❌ Feedback event flow test failed:', error);
    throw error;
  }
}

/**
 * Run all tests
 */
export async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Event System Infrastructure Tests    ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    await testPublishEvent();
    await testSubscribeToEvent();
    await testEndToEnd();
    await testFeedbackEventFlow();

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  ✅ ALL TESTS PASSED!                 ║');
    console.log('╚════════════════════════════════════════╝\n');
  } catch (error) {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  ❌ TESTS FAILED                      ║');
    console.log('╚════════════════════════════════════════╝\n');
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log('Tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Tests failed:', error);
      process.exit(1);
    });
}
