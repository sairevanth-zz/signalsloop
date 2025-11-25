import { DomainEvent } from '@/lib/events/types';
import {
  ReleaseGenerationOptions,
  generateAutoReleaseNotes,
} from '@/lib/changelog/auto-generator';

/**
 * Manually run the release planning agent for a project
 */
export async function runReleasePlanningAgent(
  projectId: string,
  options: ReleaseGenerationOptions = {}
) {
  console.log(`[Release Planning Agent] Generating release notes for project ${projectId}`);
  return generateAutoReleaseNotes(projectId, {
    triggeredBy: 'agent',
    ...options,
  });
}

/**
 * Event-driven handler: when a feature launch is recorded, attempt to draft release notes
 */
export async function handleFeatureLaunched(event: DomainEvent): Promise<void> {
  const projectId = event.metadata.project_id;
  const suggestionId = event.payload?.suggestion_id;

  if (!projectId) {
    console.warn('[Release Planning Agent] Missing project_id in event metadata');
    return;
  }

  try {
    await generateAutoReleaseNotes(projectId, {
      triggeredBy: 'agent',
      includeSuggestionIds: suggestionId ? [suggestionId] : undefined,
      maxFeatures: 5,
    });
  } catch (error) {
    console.error('[Release Planning Agent] Failed to auto-generate release notes from event:', error);
  }
}

export type { ReleaseGenerationOptions };
