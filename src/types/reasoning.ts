/**
 * AI Reasoning Layer Types
 * Feature F: Gen 3
 * 
 * Type definitions for transparent AI reasoning capture
 * Users can click "Why?" to see what data and logic led to any AI decision
 */

/**
 * AI Features that can generate reasoning traces
 */
export type ReasoningFeature =
  | 'devils_advocate'
  | 'prediction'
  | 'prioritization'
  | 'classification'
  | 'sentiment_analysis'
  | 'theme_detection'
  | 'spec_writer'
  | 'roadmap_suggestion'
  | 'competitive_intel'
  | 'anomaly_detection'
  | 'churn_prediction'
  | 'impact_simulation'
  | 'stakeholder_response';

/**
 * Data source used as input for AI decision
 */
export interface DataSource {
  type: string; // 'feedback', 'sentiment_scores', 'competitor_data', 'themes', etc.
  count: number;
  ids?: string[];
  average?: number;
  summary?: string;
}

/**
 * Input context for AI decision
 */
export interface ReasoningInputs {
  data_sources: DataSource[];
  context?: {
    project_name?: string;
    time_range?: string;
    filters_applied?: string[];
    additional_context?: Record<string, unknown>;
  };
}

/**
 * Single step in the reasoning process
 */
export interface ReasoningStep {
  step_number: number;
  description: string;
  evidence: string[];
  conclusion: string;
  confidence: number; // 0.0 to 1.0
}

/**
 * Alternative decision that was considered
 */
export interface Alternative {
  alternative: string;
  why_rejected: string;
}

/**
 * Output of the AI decision
 */
export interface ReasoningOutputs {
  decision: string;
  confidence: number; // 0.0 to 1.0
  alternatives_considered: Alternative[];
}

/**
 * Metadata about the AI call
 */
export interface ReasoningMetadata {
  model_used: string;
  tokens_used: number;
  latency_ms: number;
  timestamp: string;
  prompt_version?: string;
}

/**
 * Complete reasoning trace for an AI decision
 */
export interface ReasoningTrace {
  id: string;
  project_id?: string;
  feature: ReasoningFeature;
  decision_type: string;
  decision_summary: string;
  inputs: ReasoningInputs;
  reasoning_steps: ReasoningStep[];
  outputs: ReasoningOutputs;
  metadata: ReasoningMetadata;
  entity_type?: string;
  entity_id?: string;
  triggered_by?: string;
  created_at: string;
}

/**
 * Request to create a new reasoning trace
 */
export interface CreateReasoningTraceRequest {
  project_id?: string;
  feature: ReasoningFeature;
  decision_type: string;
  decision_summary: string;
  inputs: ReasoningInputs;
  reasoning_steps: ReasoningStep[];
  outputs: ReasoningOutputs;
  metadata: ReasoningMetadata;
  entity_type?: string;
  entity_id?: string;
  triggered_by?: string;
}

/**
 * Response from the reasoning extraction prompt
 */
export interface ReasoningExtractionResult {
  decision_summary: string;
  reasoning_steps: ReasoningStep[];
  alternatives_considered: Alternative[];
}

/**
 * Wrapper for capturing reasoning during AI execution
 */
export interface ReasoningCaptureResult<T> {
  result: T;
  trace: ReasoningTrace;
}

/**
 * Options for capturing reasoning
 */
export interface CaptureReasoningOptions {
  projectId?: string;
  feature: ReasoningFeature;
  decisionType: string;
  entityType?: string;
  entityId?: string;
  triggeredBy?: string;
  dataSources?: DataSource[];
  context?: Record<string, unknown>;
}

/**
 * Reasoning statistics for a project
 */
export interface ReasoningStats {
  total_traces: number;
  traces_by_feature: Record<string, number>;
  avg_confidence: number;
  avg_latency_ms: number;
  most_common_decision_types: Array<{ decision_type: string; count: number }>;
}

/**
 * Props for the Why button component
 */
export interface WhyButtonProps {
  entityType: string;
  entityId: string;
  feature?: ReasoningFeature;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  className?: string;
}

/**
 * Props for the ReasoningDrawer component
 */
export interface ReasoningDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string;
  feature?: ReasoningFeature;
}
