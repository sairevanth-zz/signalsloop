'use server';

/**
 * Server Actions for Outcome Attribution
 *
 * These actions are called from the UI to manage feature outcomes.
 */

import { revalidatePath } from 'next/cache';
import {
  createOutcomeMonitor,
  shipFeatureAndCreateMonitor,
} from '@/lib/outcome-attribution/create-monitor';
import { generateOutcomeReport, getProjectOutcomeSummary } from '@/lib/outcome-attribution/generate-report';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import type { FeatureOutcome, OutcomeReport } from '@/types/outcome-attribution';

/**
 * Ship a feature and create its outcome monitor
 *
 * @param suggestionId - The roadmap suggestion ID to ship
 * @param projectId - The project ID
 * @returns The created outcome or error
 */
export async function shipFeatureAction(
  suggestionId: string,
  projectId: string
): Promise<{ success: boolean; outcome?: FeatureOutcome; error?: string }> {
  try {
    const outcome = await shipFeatureAndCreateMonitor(suggestionId, projectId);

    // Revalidate the roadmap and outcomes pages
    revalidatePath(`/dashboard/${projectId}/roadmap`);
    revalidatePath(`/dashboard/${projectId}/outcomes`);

    return { success: true, outcome };
  } catch (error) {
    console.error('[shipFeatureAction] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to ship feature',
    };
  }
}

/**
 * Get all outcomes for a project
 *
 * @param projectId - The project ID
 * @returns Array of feature outcomes
 */
export async function getProjectOutcomesAction(
  projectId: string
): Promise<{ success: boolean; outcomes?: FeatureOutcome[]; error?: string }> {
  try {
    const supabase = getSupabaseServiceRoleClient();

    const { data: outcomes, error } = await supabase
      .from('feature_outcomes_detailed')
      .select('*')
      .eq('project_id', projectId)
      .order('shipped_at', { ascending: false });

    if (error) throw error;

    return { success: true, outcomes: outcomes || [] };
  } catch (error) {
    console.error('[getProjectOutcomesAction] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch outcomes',
    };
  }
}

/**
 * Get a single outcome by ID
 *
 * @param outcomeId - The outcome ID
 * @returns The feature outcome or error
 */
export async function getOutcomeAction(
  outcomeId: string
): Promise<{ success: boolean; outcome?: FeatureOutcome; error?: string }> {
  try {
    const supabase = getSupabaseServiceRoleClient();

    const { data: outcome, error } = await supabase
      .from('feature_outcomes_detailed')
      .select('*')
      .eq('id', outcomeId)
      .single();

    if (error) throw error;

    return { success: true, outcome };
  } catch (error) {
    console.error('[getOutcomeAction] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch outcome',
    };
  }
}

/**
 * Generate a report for a feature outcome
 *
 * @param outcomeId - The outcome ID
 * @returns The outcome report or error
 */
export async function getOutcomeReportAction(
  outcomeId: string
): Promise<{ success: boolean; report?: OutcomeReport; error?: string }> {
  try {
    const report = await generateOutcomeReport(outcomeId);
    return { success: true, report };
  } catch (error) {
    console.error('[getOutcomeReportAction] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate report',
    };
  }
}

/**
 * Get summary statistics for project outcomes
 *
 * @param projectId - The project ID
 * @returns Summary statistics or error
 */
export async function getOutcomeSummaryAction(
  projectId: string
): Promise<{
  success: boolean;
  summary?: {
    total: number;
    byClassification: Record<string, number>;
    successRate: number;
    averageSentimentDelta: number;
    averageVolumeDelta: number;
  };
  error?: string;
}> {
  try {
    const summary = await getProjectOutcomeSummary(projectId);
    return { success: true, summary };
  } catch (error) {
    console.error('[getOutcomeSummaryAction] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch summary',
    };
  }
}

/**
 * Cancel an outcome monitor
 *
 * @param outcomeId - The outcome ID to cancel
 * @returns Success or error
 */
export async function cancelOutcomeMonitorAction(
  outcomeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseServiceRoleClient();

    const { data: outcome, error: fetchError } = await supabase
      .from('feature_outcomes')
      .select('id, project_id, status')
      .eq('id', outcomeId)
      .single();

    if (fetchError || !outcome) {
      throw new Error('Outcome not found');
    }

    if (outcome.status !== 'monitoring') {
      throw new Error('Can only cancel outcomes in monitoring status');
    }

    const { error: updateError } = await supabase
      .from('feature_outcomes')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', outcomeId);

    if (updateError) throw updateError;

    // Revalidate the outcomes page
    revalidatePath(`/dashboard/${outcome.project_id}/outcomes`);

    return { success: true };
  } catch (error) {
    console.error('[cancelOutcomeMonitorAction] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel monitor',
    };
  }
}
