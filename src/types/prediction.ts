/**
 * Feature Success Prediction Types
 *
 * Types for predicting feature success before building
 * Includes input features, outputs, and explanation structures
 */

export type FeatureCategory =
  | 'core'
  | 'enhancement'
  | 'integration'
  | 'infrastructure'
  | 'experimental';

export type TargetSegment = 'all' | 'enterprise' | 'smb' | 'startup';

export type TechnicalComplexity = 'low' | 'medium' | 'high';

export type PredictionStrategy = 'heuristic' | 'similar_features' | 'ml_model';

/**
 * Input features extracted from PRD and related data
 */
export interface PredictionInput {
  // Feature classification
  feature_category: FeatureCategory;
  target_segment: TargetSegment;

  // Problem and solution clarity
  problem_clarity_score: number; // 0.0-1.0
  solution_specificity_score: number; // 0.0-1.0

  // Feedback signals
  feedback_volume: number;
  feedback_intensity: number; // 0.0-1.0 - How urgent/emotional
  theme_concentration: number; // 0.0-1.0 - How concentrated vs dispersed

  // Customer signals
  requester_arr_total: number; // Total ARR of requesters
  enterprise_requester_pct: number; // 0.0-1.0

  // Competitive context
  competitor_has_feature: boolean;
  competitor_advantage_months: number; // How far ahead is competitor

  // Effort and complexity
  estimated_effort_weeks: number;
  technical_complexity: TechnicalComplexity;

  // Success indicators
  has_clear_success_metric: boolean;
  addresses_churn_theme: boolean;
  addresses_expansion_theme: boolean;
}

/**
 * Explanation factor for transparency
 */
export interface ExplanationFactor {
  factor: string; // Human-readable description
  impact: string; // e.g., "+15%", "-5%"
  weight: number; // 0.0-1.0 - How much this factor matters
}

/**
 * Metadata about prediction strategy used
 */
export interface StrategyMetadata {
  similar_features_used?: string[]; // UUIDs of similar features
  historical_outcomes_count?: number;
  model_version?: string;
}

/**
 * Complete prediction output
 */
export interface PredictionOutput {
  // Predictions
  predicted_adoption_rate: number | null; // 0.0-1.0
  predicted_sentiment_impact: number | null; // -1.0 to 1.0
  predicted_revenue_impact: number | null; // Dollar amount
  predicted_churn_reduction: number | null; // 0.0-1.0

  // Confidence
  confidence_score: number; // 0.0-1.0
  confidence_interval_low: number; // 0.0-1.0
  confidence_interval_high: number; // 0.0-1.0

  // Explanation
  explanation_text: string;
  explanation_factors: ExplanationFactor[];

  // Strategy used
  prediction_strategy: PredictionStrategy;
  strategy_metadata: StrategyMetadata;

  // Similar features (for reference)
  similar_feature_ids: string[];
}

/**
 * Complete prediction record (database)
 */
export interface FeaturePrediction extends PredictionOutput {
  id: string;
  project_id: string;
  spec_id: string | null;
  feature_name: string;
  feature_description: string | null;

  // Input features
  input_features: PredictionInput;

  // Model info
  model_name: string | null;
  model_version: string | null;

  // Actual outcomes (filled later)
  actual_adoption_rate: number | null;
  actual_sentiment_impact: number | null;
  actual_revenue_impact: number | null;
  prediction_accuracy: number | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Simplified similar feature for comparison
 */
export interface SimilarFeature {
  id: string;
  feature_name: string;
  similarity_score: number; // 0.0-1.0
  input_features: Partial<PredictionInput>;

  // Actual outcomes (if available)
  actual_adoption_rate: number | null;
  actual_sentiment_impact: number | null;
}

/**
 * Request to generate a prediction
 */
export interface GeneratePredictionRequest {
  project_id: string;
  spec_id?: string;
  feature_name: string;
  feature_description?: string;

  // Optional: pre-extracted features
  // If not provided, will be extracted from spec/PRD
  input_features?: Partial<PredictionInput>;
}

/**
 * Response from prediction API
 */
export interface GeneratePredictionResponse {
  success: boolean;
  prediction: FeaturePrediction | null;
  error?: string;
}

/**
 * Prediction accuracy statistics
 */
export interface PredictionAccuracyStats {
  total_predictions: number;
  predictions_with_outcomes: number;
  avg_accuracy: number;
  strategy_performance: {
    [key in PredictionStrategy]?: {
      count: number;
      avg_accuracy: number;
    };
  };
}
