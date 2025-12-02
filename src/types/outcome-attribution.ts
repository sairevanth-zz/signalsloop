/**
 * Outcome Attribution Types
 * Type definitions for the Outcome Attribution Loop feature
 */

import { z } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Possible outcome classifications after feature ships
 */
export type OutcomeClassification =
  | 'success'
  | 'partial_success'
  | 'no_impact'
  | 'negative_impact'
  | 'pending';

/**
 * Status of the outcome monitoring
 */
export type OutcomeMonitorStatus = 'monitoring' | 'completed' | 'cancelled';

// ============================================================================
// Database Models
// ============================================================================

/**
 * Feature outcome record from database
 */
export interface FeatureOutcome {
  id: string;
  project_id: string;
  suggestion_id: string;

  // Timestamps
  shipped_at: string;
  monitor_start: string;
  monitor_end: string;

  // Pre-ship metrics
  pre_ship_sentiment: number | null;
  pre_ship_theme_volume: number | null;
  pre_ship_churn_risk: number | null;

  // Post-ship metrics
  post_ship_sentiment: number | null;
  post_ship_theme_volume: number | null;
  post_ship_churn_risk: number | null;

  // Calculated deltas (generated columns)
  sentiment_delta: number | null;
  theme_volume_delta: number | null;

  // AI classification
  outcome_classification: OutcomeClassification | null;
  classification_confidence: number | null;
  classification_reasoning: ClassificationReasoning | null;

  // Linked data
  related_themes: string[];
  related_feedback_ids: string[];
  sample_feedback: SampleFeedback[];

  // Status
  status: OutcomeMonitorStatus;
  notification_sent: boolean;
  notification_sent_at: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Extended feature outcome with related details
 */
export interface FeatureOutcomeDetailed extends FeatureOutcome {
  priority_score: number;
  priority_level: string;
  theme_name: string;
  mention_count: number;
  theme_avg_sentiment: number;
  project_name: string;
  owner_id: string;
  monitor_status: 'active' | 'expired' | 'completed' | 'cancelled';
  days_remaining: number;
}

// ============================================================================
// Classification Types
// ============================================================================

/**
 * AI-generated classification reasoning
 */
export interface ClassificationReasoning {
  summary: string;
  key_factors: KeyFactor[];
  recommendations: string[];
  confidence_explanation: string;
}

/**
 * Individual factor that influenced the classification
 */
export interface KeyFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  evidence: string;
}

/**
 * Sample feedback for classification
 */
export interface SampleFeedback {
  id: string;
  title: string;
  description: string;
  sentiment_score: number | null;
  created_at: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request to create an outcome monitor
 */
export interface CreateOutcomeMonitorRequest {
  suggestionId: string;
  projectId: string;
}

/**
 * Response from creating an outcome monitor
 */
export interface CreateOutcomeMonitorResponse {
  success: boolean;
  outcome?: FeatureOutcome;
  error?: string;
}

/**
 * Pre-ship metrics calculated at ship time
 */
export interface PreShipMetrics {
  sentiment: number;
  themeVolume: number;
  churnRisk: number;
  relatedThemes: string[];
  relatedFeedbackIds: string[];
  sampleFeedback: SampleFeedback[];
}

/**
 * Post-ship metrics update
 */
export interface PostShipMetrics {
  sentiment: number;
  themeVolume: number;
  churnRisk: number;
}

/**
 * Classification result from AI
 */
export interface ClassificationResult {
  classification: OutcomeClassification;
  confidence: number;
  reasoning: ClassificationReasoning;
}

// ============================================================================
// Cron Job Response Types
// ============================================================================

/**
 * Response from metrics update cron job
 */
export interface MetricsUpdateResult {
  success: boolean;
  processed: number;
  failed: number;
  results: {
    outcomeId: string;
    success: boolean;
    error?: string;
  }[];
}

/**
 * Response from classification cron job
 */
export interface ClassificationJobResult {
  success: boolean;
  classified: number;
  failed: number;
  results: {
    outcomeId: string;
    classification: OutcomeClassification | null;
    success: boolean;
    error?: string;
  }[];
}

// ============================================================================
// Report Types
// ============================================================================

/**
 * Outcome report for a feature
 */
export interface OutcomeReport {
  outcome: FeatureOutcomeDetailed;
  metrics: {
    sentimentChange: {
      before: number;
      after: number;
      delta: number;
      trend: 'improving' | 'declining' | 'stable';
    };
    volumeChange: {
      before: number;
      after: number;
      delta: number;
      trend: 'decreasing' | 'increasing' | 'stable';
    };
    churnChange: {
      before: number;
      after: number;
      delta: number;
      trend: 'improving' | 'declining' | 'stable';
    };
  };
  insights: string[];
  recommendations: string[];
  generatedAt: string;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const CreateOutcomeMonitorSchema = z.object({
  suggestionId: z.string().uuid('Invalid suggestion ID'),
  projectId: z.string().uuid('Invalid project ID'),
});

export const UpdateMetricsSchema = z.object({
  outcomeId: z.string().uuid('Invalid outcome ID'),
  sentiment: z.number().min(-1).max(1),
  themeVolume: z.number().int().min(0),
  churnRisk: z.number().min(0).max(1),
});

export const ClassificationResponseSchema = z.object({
  classification: z.enum([
    'success',
    'partial_success',
    'no_impact',
    'negative_impact',
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
  key_factors: z.array(z.string()),
  recommendations: z.array(z.string()),
});

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Metric trend indicator
 */
export type MetricTrend = 'improving' | 'declining' | 'stable';

/**
 * Calculate trend from delta
 */
export function calculateTrend(
  delta: number,
  threshold: number = 0.05,
  invertForImprovement: boolean = false
): MetricTrend {
  if (Math.abs(delta) < threshold) return 'stable';
  const improving = invertForImprovement ? delta < 0 : delta > 0;
  return improving ? 'improving' : 'declining';
}
