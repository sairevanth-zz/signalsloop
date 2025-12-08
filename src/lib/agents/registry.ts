/**
 * Agent Registry - Maps events to agent handlers
 * This is the central place where we define which agents react to which events
 *
 * Usage in Phase 2: Convert existing agents to event-driven
 * Usage in Phase 3: Add new autonomous agents
 */

import { EventType, EventHandler } from '@/lib/events/types';
// Phase 1 Agents
import { triageAgent } from './triager-agent';
// Phase 2 Agents
import { handleFeedbackCreated } from './sentiment-agent';
import { handleThemeThresholdReached } from './spec-writer-agent';
// Phase 3 Agents
import {
  handleSpecAutoDrafted,
  handleThemeThresholdReached as handleThemeNotification,
  handleHighVoteFeedback,
  handleStakeholderNotification,
} from './notification-agent';
import { handleUrgentFeedback } from './urgent-feedback-agent';
import { handleCompetitorExtraction } from './competitive-intel-agent';
import { handleUserFeedback, handleUserVote } from './user-engagement-agent';
import { handleSpecQualityReview } from './spec-quality-agent';
import { handleFeatureLaunched } from './release-planning-agent';

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
 * Phase 1: Infrastructure ✅
 * Phase 2: Event-driven agents for sentiment and spec writing ✅
 * Phase 3: New autonomous agents (notifications, competitive intel, etc.) ✅
 */
export const AGENT_REGISTRY: AgentRegistry = {
  // ============================================================================
  // Feedback Domain Events
  // ============================================================================

  [EventType.FEEDBACK_CREATED]: [
    // ✅ Phase 1: Triager Agent (runs first to categorize, prioritize, assign PM, detect duplicates)
    async (event) => {
      await triageAgent(event.payload.postId, event.metadata.project_id);
    },

    // ✅ Phase 2: Sentiment Analysis Agent
    handleFeedbackCreated,

    // ✅ Phase 3: Competitive Intelligence Agent
    handleCompetitorExtraction,

    // ✅ Phase 3: User Engagement Agent
    handleUserFeedback,
  ],

  [EventType.FEEDBACK_UPDATED]: [
    // Future: Add agents that react to updates
  ],

  [EventType.FEEDBACK_VOTED]: [
    // ✅ Phase 3: High Vote Notification Agent
    handleHighVoteFeedback,

    // ✅ Phase 3: User Engagement Agent
    handleUserVote,
  ],

  // ============================================================================
  // AI Analysis Domain Events
  // ============================================================================

  [EventType.SENTIMENT_ANALYZED]: [
    // ✅ Phase 3: Urgent Feedback Agent
    handleUrgentFeedback,

    // Future: Theme Detection Agent (categorizes into themes)
  ],

  [EventType.THEME_DETECTED]: [
    // Future: Add agents
  ],

  [EventType.THEME_THRESHOLD_REACHED]: [
    // ✅ Phase 2: Proactive Spec Writer Agent
    handleThemeThresholdReached,

    // ✅ Phase 3: Theme Notification Agent
    handleThemeNotification,

    // ✅ Phase 3: Stakeholder Notification Agent
    handleStakeholderNotification,
  ],

  // ============================================================================
  // Spec Domain Events
  // ============================================================================

  [EventType.SPEC_AUTO_DRAFTED]: [
    // ✅ Phase 3: Spec Quality Agent
    handleSpecQualityReview,

    // ✅ Phase 3: Notification Agent (alerts PM to review spec)
    handleSpecAutoDrafted,

    // ✅ Phase 3: Stakeholder Notification Agent
    handleStakeholderNotification,
  ],

  [EventType.SPEC_APPROVED]: [
    // Future: Roadmap Health Agent (updates roadmap)
    // Future: Notification Agent (alerts team)
  ],

  // ============================================================================
  // Competitive Domain Events
  // ============================================================================

  [EventType.COMPETITOR_MENTIONED]: [
    // Future: Competitive tracking and alerting
    handleStakeholderNotification,
  ],

  // ============================================================================
  // Feature Impact Domain Events
  // ============================================================================

  [EventType.FEATURE_LAUNCHED]: [
    // ✅ Release Planning Agent - draft release notes when features ship
    handleFeatureLaunched,

    // ✅ Phase 3: Stakeholder Notification Agent
    handleStakeholderNotification,
  ],

  [EventType.FEATURE_METRICS_COLLECTED]: [
    // Future: Use post-launch metrics to enrich release notes
  ],

  [EventType.FEATURE_RETROSPECTIVE_RECORDED]: [
    // Future: Feed learnings back into roadmap and release planning
  ],

  // ============================================================================
  // User Engagement Domain Events
  // ============================================================================

  [EventType.USER_ENGAGED]: [
    // Future: Power user recognition and rewards
  ],

  [EventType.USER_AT_RISK]: [
    // Future: At-risk user outreach
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
