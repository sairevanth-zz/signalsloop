/**
 * Event-Driven Architecture - Main Export
 * Import everything you need from '@/lib/events'
 */

// Types
export * from './types';

// Publisher
export { publishEvent, publishEvents, createCorrelationId } from './publisher';

// Subscriber
export { subscribeToEvent, subscribeToEvents, pollForEvents } from './subscriber';
