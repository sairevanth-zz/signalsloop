-- =====================================================
-- Feature C: Predictive Feature Success Engine
-- Database Migration
-- =====================================================
-- Creates tables for predicting feature success before building
-- Uses historical outcomes to forecast adoption, sentiment impact, and revenue
-- =====================================================

-- =====================================================
-- FEATURE PREDICTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS feature_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Link to spec/PRD if exists
  spec_id UUID REFERENCES specs(id) ON DELETE CASCADE,

  -- Feature metadata
  feature_name TEXT NOT NULL,
  feature_description TEXT,

  -- Prediction outputs
  predicted_adoption_rate DECIMAL(5, 4), -- 0.0000 to 1.0000 (0-100%)
  predicted_sentiment_impact DECIMAL(3, 2), -- -1.00 to 1.00
  predicted_revenue_impact DECIMAL(12, 2), -- Dollar amount
  predicted_churn_reduction DECIMAL(5, 4), -- 0.0000 to 1.0000 (0-100%)

  -- Confidence and uncertainty
  confidence_score DECIMAL(3, 2) NOT NULL, -- 0.00 to 1.00
  confidence_interval_low DECIMAL(3, 2),
  confidence_interval_high DECIMAL(3, 2),

  -- Input features used for prediction
  input_features JSONB NOT NULL DEFAULT '{}',
  /* Structure:
  {
    "feedback_volume": 47,
    "theme_intensity": 0.82,
    "requester_segment": "enterprise",
    "requester_arr": 234000,
    "competitor_has_feature": true,
    "estimated_effort_weeks": 4,
    "similar_feature_count": 12,
    "similar_feature_avg_adoption": 0.64,
    "feature_category": "core|enhancement|integration|infrastructure|experimental",
    "target_segment": "all|enterprise|smb|startup",
    "problem_clarity_score": 0.85,
    "solution_specificity_score": 0.90,
    "feedback_intensity": 0.75,
    "theme_concentration": 0.80,
    "enterprise_requester_pct": 0.60,
    "competitor_advantage_months": 6,
    "technical_complexity": "low|medium|high",
    "has_clear_success_metric": true,
    "addresses_churn_theme": true,
    "addresses_expansion_theme": false
  }
  */

  -- Explanation and factors
  explanation_text TEXT NOT NULL,
  explanation_factors JSONB NOT NULL DEFAULT '[]',
  /* Structure:
  [
    {
      "factor": "High feedback volume from enterprise customers",
      "impact": "+15%",
      "weight": 0.25
    },
    {
      "factor": "Addresses top churn-related theme",
      "impact": "+20%",
      "weight": 0.30
    }
  ]
  */

  -- Strategy used (cold/warm/hot)
  prediction_strategy TEXT NOT NULL CHECK (prediction_strategy IN ('heuristic', 'similar_features', 'ml_model')),
  strategy_metadata JSONB DEFAULT '{}',
  /* Structure:
  {
    "similar_features_used": ["uuid1", "uuid2"],
    "historical_outcomes_count": 15,
    "model_version": "v1.0"
  }
  */

  -- Similar features used for comparison
  similar_feature_ids UUID[] DEFAULT '{}',

  -- Actual outcome (filled after ship)
  actual_adoption_rate DECIMAL(5, 4),
  actual_sentiment_impact DECIMAL(3, 2),
  actual_revenue_impact DECIMAL(12, 2),
  prediction_accuracy DECIMAL(3, 2), -- How close was the prediction?

  -- Model information
  model_name VARCHAR(100), -- e.g., 'gpt-4o', 'xgboost-v1'
  model_version VARCHAR(50),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT feature_predictions_confidence_range CHECK (confidence_score BETWEEN 0 AND 1),
  CONSTRAINT feature_predictions_adoption_range CHECK (
    predicted_adoption_rate IS NULL OR
    (predicted_adoption_rate BETWEEN 0 AND 1)
  ),
  CONSTRAINT feature_predictions_sentiment_range CHECK (
    predicted_sentiment_impact IS NULL OR
    (predicted_sentiment_impact BETWEEN -1 AND 1)
  )
);

-- Indexes for efficient querying
CREATE INDEX idx_feature_predictions_project ON feature_predictions(project_id);
CREATE INDEX idx_feature_predictions_spec ON feature_predictions(spec_id);
CREATE INDEX idx_feature_predictions_created ON feature_predictions(created_at DESC);
CREATE INDEX idx_feature_predictions_strategy ON feature_predictions(prediction_strategy);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE feature_predictions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS feature_predictions_select_policy ON feature_predictions;
DROP POLICY IF EXISTS feature_predictions_insert_policy ON feature_predictions;
DROP POLICY IF EXISTS feature_predictions_update_policy ON feature_predictions;
DROP POLICY IF EXISTS feature_predictions_delete_policy ON feature_predictions;

-- Feature Predictions policies
CREATE POLICY feature_predictions_select_policy ON feature_predictions
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY feature_predictions_insert_policy ON feature_predictions
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY feature_predictions_update_policy ON feature_predictions
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY feature_predictions_delete_policy ON feature_predictions
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get prediction for a spec
CREATE OR REPLACE FUNCTION get_prediction_for_spec(p_spec_id UUID)
RETURNS TABLE (
  id UUID,
  predicted_adoption_rate DECIMAL,
  predicted_sentiment_impact DECIMAL,
  confidence_score DECIMAL,
  explanation_text TEXT,
  explanation_factors JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fp.id,
    fp.predicted_adoption_rate,
    fp.predicted_sentiment_impact,
    fp.confidence_score,
    fp.explanation_text,
    fp.explanation_factors,
    fp.created_at
  FROM feature_predictions fp
  WHERE fp.spec_id = p_spec_id
  ORDER BY fp.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get historical predictions for accuracy analysis
CREATE OR REPLACE FUNCTION get_prediction_accuracy_stats(p_project_id UUID)
RETURNS TABLE (
  total_predictions INTEGER,
  predictions_with_outcomes INTEGER,
  avg_accuracy DECIMAL,
  strategy_performance JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_predictions,
    COUNT(CASE WHEN actual_adoption_rate IS NOT NULL THEN 1 END)::INTEGER as predictions_with_outcomes,
    AVG(prediction_accuracy)::DECIMAL as avg_accuracy,
    jsonb_object_agg(
      prediction_strategy,
      jsonb_build_object(
        'count', COUNT(*),
        'avg_accuracy', AVG(prediction_accuracy)
      )
    ) as strategy_performance
  FROM feature_predictions
  WHERE project_id = p_project_id
  GROUP BY project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_feature_predictions_updated_at
  BEFORE UPDATE ON feature_predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Migration Complete
-- =====================================================
