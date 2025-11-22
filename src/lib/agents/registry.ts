/**
 * Agent Registry - Maps events to agent handlers
 * This is the central place where we define which agents react to which events
 *
 * Usage in Phase 2: Convert existing agents to event-driven
 * Usage in Phase 3: Add new autonomous agents
 */

import { EventType, EventHandler } from '@/lib/events/types';

/**
 * Agent Registry Structure
 * Maps event types to arrays of handler functions
 * Multiple agents can react to the same event in parallel
 */
export interface AgentRegistry {
  [eventType: string]: EventHandler[];
}

/**
 * The Agent Registry
 *
 * Phase 1: Infrastructure only - no agents yet
 * Phase 2: Will add existing agents (sentiment, theme, duplicate detection)
 * Phase 3: Will add new autonomous agents (notifications, competitive intel, etc.)
 */
export const AGENT_REGISTRY: AgentRegistry = {
  // ============================================================================
  // Feedback Domain Events
  // ============================================================================

  [EventType.FEEDBACK_CREATED]: [
    // Phase 2: Add these agents
    // - SentimentAnalysisAgent (analyzes sentiment)
    // - DuplicateDetectionAgent (checks for duplicates)
    // - NotificationAgent (alerts team)
    // - CompetitiveIntelligenceAgent (extracts competitor mentions)
  ],

  [EventType.FEEDBACK_UPDATED]: [
    // Phase 3: Add agents that react to updates
  ],

  [EventType.FEEDBACK_VOTED]: [
    // Phase 3: Add agents that react to votes
    // - HighVoteNotificationAgent (alerts on high-vote feedback)
  ],

  // ============================================================================
  // AI Analysis Domain Events
  // ============================================================================

  [EventType.SENTIMENT_ANALYZED]: [
    // Phase 2: Add these agents
    // - ThemeDetectionAgent (categorizes into themes)
    // - UrgentFeedbackAgent (alerts on negative sentiment)
  ],

  [EventType.THEME_DETECTED]: [
    // Phase 3: Add agents
  ],

  [EventType.THEME_THRESHOLD_REACHED]: [
    // Phase 2: Add this agent
    // - ProactiveSpecWriterAgent (auto-drafts specs for high-volume themes)
  ],

  // ============================================================================
  // Spec Domain Events
  // ============================================================================

  [EventType.SPEC_AUTO_DRAFTED]: [
    // Phase 2: Add this agent
    // - NotificationAgent (alerts PM to review spec)

    // Phase 3: Add this agent
    // - SpecQualityAgent (reviews spec for completeness)
  ],

  [EventType.SPEC_APPROVED]: [
    // Phase 3: Add these agents
    // - RoadmapHealthAgent (updates roadmap)
    // - NotificationAgent (alerts team)
  ],

  // ============================================================================
  // Competitive Domain Events
  // ============================================================================

  [EventType.COMPETITOR_MENTIONED]: [
    // Phase 3: Add these agents
    // - CompetitiveIntelligenceAgent (tracks competitor features)
    // - NotificationAgent (alerts on competitor mentions)
  ],

  // ============================================================================
  // User Engagement Domain Events
  // ============================================================================

  [EventType.USER_ENGAGED]: [
    // Phase 3: Add these agents
  ],

  [EventType.USER_AT_RISK]: [
    // Phase 3: Add these agents
    // - NotificationAgent (alerts team about at-risk users)
  ],
};

/**
 * Helper function to get all agents for an event type
 * @param eventType - The event type
 * @returns Array of event handlers
 */
export function getAgentsForEvent(eventType: string): EventHandler[] {
  return AGENT_REGISTRY[eventType] || [];
}

/**
 * Helper function to register a new agent handler
 * @param eventType - The event type to listen to
 * @param handler - The handler function
 */
export function registerAgent(eventType: string, handler: EventHandler): void {
  if (!AGENT_REGISTRY[eventType]) {
    AGENT_REGISTRY[eventType] = [];
  }
  AGENT_REGISTRY[eventType].push(handler);
}

/**
 * Get all event types that have registered agents
 * @returns Array of event types
 */
export function getRegisteredEventTypes(): string[] {
  return Object.keys(AGENT_REGISTRY).filter(
    eventType => AGENT_REGISTRY[eventType].length > 0
  );
}
