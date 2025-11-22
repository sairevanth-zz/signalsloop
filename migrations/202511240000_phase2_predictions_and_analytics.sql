-- =====================================================
-- Phase 2: Predictive & Proactive Features
-- Database Migration
-- =====================================================
-- This migration adds tables for:
-- 1. Sentiment Forecasting
-- 2. Churn Risk Prediction
-- 3. Anomaly Detection
-- 4. Weekly Insights Reports
-- =====================================================

-- =====================================================
-- 1. SENTIMENT FORECASTS
-- =====================================================
-- Stores time-series predictions of sentiment trends
CREATE TABLE IF NOT EXISTS sentiment_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Forecast metadata
  forecast_date TIMESTAMPTZ NOT NULL, -- When this forecast was generated
  forecast_horizon INTEGER NOT NULL, -- Days into the future (7, 14, 30)
  target_date TIMESTAMPTZ NOT NULL, -- The date being predicted

  -- Predictions
  predicted_sentiment_score DECIMAL(3, 2) NOT NULL, -- -1.00 to 1.00
  confidence_lower DECIMAL(3, 2) NOT NULL, -- Lower bound of confidence interval
  confidence_upper DECIMAL(3, 2) NOT NULL, -- Upper bound of confidence interval
  confidence_level DECIMAL(3, 2) DEFAULT 0.95, -- Confidence level (e.g., 95%)

  -- Model information
  model_name VARCHAR(100) NOT NULL, -- e.g., 'gpt-4o', 'claude-sonnet-4'
  model_version VARCHAR(50),
  training_window_days INTEGER, -- How many days of historical data used

  -- Features used for prediction
  feature_volume INTEGER, -- Number of feedback items in training window
  feature_avg_sentiment DECIMAL(3, 2), -- Average historical sentiment
  feature_sentiment_volatility DECIMAL(5, 4), -- Standard deviation
  feature_trend_direction VARCHAR(20), -- 'improving', 'declining', 'stable'

  -- Accuracy tracking (filled in after target_date passes)
  actual_sentiment_score DECIMAL(3, 2), -- Actual observed sentiment
  prediction_error DECIMAL(5, 4), -- Absolute error
  is_accurate BOOLEAN, -- Was prediction within confidence interval?

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes
  CONSTRAINT sentiment_forecasts_score_range CHECK (predicted_sentiment_score BETWEEN -1 AND 1),
  CONSTRAINT sentiment_forecasts_confidence_range CHECK (
    confidence_lower BETWEEN -1 AND 1 AND
    confidence_upper BETWEEN -1 AND 1 AND
    confidence_lower <= confidence_upper
  )
);

CREATE INDEX idx_sentiment_forecasts_project ON sentiment_forecasts(project_id);
CREATE INDEX idx_sentiment_forecasts_target_date ON sentiment_forecasts(target_date);
CREATE INDEX idx_sentiment_forecasts_forecast_date ON sentiment_forecasts(forecast_date DESC);
CREATE INDEX idx_sentiment_forecasts_accuracy ON sentiment_forecasts(is_accurate) WHERE is_accurate IS NOT NULL;

-- =====================================================
-- 2. CHURN RISK PREDICTIONS
-- =====================================================
-- Stores predictions of customer churn risk based on feedback patterns
CREATE TABLE IF NOT EXISTS churn_risk_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- User identification (optional - can be null for anonymous users)
  user_identifier VARCHAR(255), -- Email, user ID, or other identifier from feedback
  user_segment VARCHAR(100), -- e.g., 'enterprise', 'pro', 'free'

  -- Prediction
  prediction_date TIMESTAMPTZ NOT NULL,
  churn_probability DECIMAL(5, 4) NOT NULL, -- 0.0000 to 1.0000
  risk_level VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  confidence_score DECIMAL(3, 2) NOT NULL, -- 0.00 to 1.00

  -- Risk factors (JSON for flexibility)
  risk_factors JSONB NOT NULL DEFAULT '[]', -- Array of {factor, weight, impact}
  -- Example: [
  --   {"factor": "declining_sentiment", "weight": 0.35, "impact": "high"},
  --   {"factor": "reduced_engagement", "weight": 0.25, "impact": "medium"},
  --   {"factor": "unresolved_issues", "weight": 0.20, "impact": "high"}
  -- ]

  -- Supporting data
  recent_sentiment_avg DECIMAL(3, 2), -- Average sentiment last 30 days
  sentiment_trend VARCHAR(20), -- 'improving', 'declining', 'stable'
  feedback_frequency_change DECIMAL(5, 2), -- % change in feedback frequency
  critical_issues_count INTEGER DEFAULT 0,
  days_since_last_positive INTEGER,
  days_since_last_negative INTEGER,

  -- Model information
  model_name VARCHAR(100) NOT NULL,
  model_version VARCHAR(50),

  -- Outcome tracking (filled in later)
  actual_churned BOOLEAN, -- Did user actually churn?
  churn_date TIMESTAMPTZ, -- When did they churn?
  prediction_accuracy_score DECIMAL(3, 2), -- How accurate was this prediction?

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT churn_risk_probability_range CHECK (churn_probability BETWEEN 0 AND 1),
  CONSTRAINT churn_risk_confidence_range CHECK (confidence_score BETWEEN 0 AND 1)
);

CREATE INDEX idx_churn_risk_project ON churn_risk_predictions(project_id);
CREATE INDEX idx_churn_risk_level ON churn_risk_predictions(risk_level, prediction_date DESC);
CREATE INDEX idx_churn_risk_user ON churn_risk_predictions(user_identifier);
CREATE INDEX idx_churn_risk_date ON churn_risk_predictions(prediction_date DESC);

-- =====================================================
-- 3. ANOMALY DETECTIONS
-- =====================================================
-- Stores detected anomalies in feedback patterns
CREATE TABLE IF NOT EXISTS anomaly_detections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Anomaly metadata
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  anomaly_type VARCHAR(50) NOT NULL, -- 'sentiment_spike', 'volume_spike', 'topic_emergence', 'silence_period'
  severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'

  -- Anomaly details
  metric_name VARCHAR(100) NOT NULL, -- e.g., 'sentiment_score', 'feedback_volume', 'negative_ratio'
  expected_value DECIMAL(10, 4), -- What was expected
  actual_value DECIMAL(10, 4), -- What was observed
  deviation_score DECIMAL(10, 4), -- How many standard deviations from normal
  statistical_significance DECIMAL(5, 4), -- p-value or confidence score

  -- Time window
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  comparison_period_days INTEGER DEFAULT 30, -- How many days of historical data compared

  -- Related data
  affected_posts_count INTEGER DEFAULT 0,
  related_post_ids UUID[], -- Array of post IDs that contributed to anomaly
  related_topics TEXT[], -- Topics involved in the anomaly

  -- AI Analysis
  ai_summary TEXT, -- LLM-generated explanation of the anomaly
  potential_causes JSONB DEFAULT '[]', -- AI-suggested causes
  recommended_actions JSONB DEFAULT '[]', -- AI-suggested actions

  -- Model information
  detection_method VARCHAR(100) NOT NULL, -- 'statistical', 'ml', 'llm_analysis'
  model_name VARCHAR(100), -- If AI was used

  -- User response
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID, -- User who acknowledged
  acknowledged_at TIMESTAMPTZ,
  user_notes TEXT,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'investigating', 'resolved', 'false_positive'

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_anomaly_project ON anomaly_detections(project_id);
CREATE INDEX idx_anomaly_detected_at ON anomaly_detections(detected_at DESC);
CREATE INDEX idx_anomaly_severity ON anomaly_detections(severity, detected_at DESC);
CREATE INDEX idx_anomaly_type ON anomaly_detections(anomaly_type);
CREATE INDEX idx_anomaly_status ON anomaly_detections(status) WHERE status = 'active';

-- =====================================================
-- 4. INSIGHT REPORTS
-- =====================================================
-- Stores AI-generated weekly insight reports (using Claude)
CREATE TABLE IF NOT EXISTS insight_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Report metadata
  report_type VARCHAR(50) NOT NULL, -- 'weekly', 'monthly', 'ad_hoc', 'milestone'
  report_period_start TIMESTAMPTZ NOT NULL,
  report_period_end TIMESTAMPTZ NOT NULL,

  -- Report content (AI-generated)
  executive_summary TEXT NOT NULL, -- High-level summary for PMs
  key_insights JSONB NOT NULL DEFAULT '[]', -- Array of insight objects
  -- Example: [
  --   {
  --     "insight": "Payment flow complaints increased 300% this week",
  --     "category": "usability",
  --     "impact": "high",
  --     "supporting_data": {...},
  --     "recommendation": "Investigate checkout UX immediately"
  --   }
  -- ]

  -- Metrics summary
  total_feedback_analyzed INTEGER NOT NULL,
  sentiment_trend VARCHAR(20), -- 'improving', 'declining', 'stable'
  sentiment_change_pct DECIMAL(5, 2), -- % change from previous period
  top_themes JSONB DEFAULT '[]', -- Top 5 themes with counts

  -- Highlights
  biggest_wins TEXT[], -- Positive highlights
  critical_issues TEXT[], -- Issues requiring immediate attention
  emerging_trends TEXT[], -- New patterns detected

  -- Predictions & recommendations
  forecasted_sentiment_next_week DECIMAL(3, 2),
  churn_risk_alerts INTEGER DEFAULT 0, -- Number of users at risk
  recommended_actions JSONB DEFAULT '[]', -- Prioritized action items

  -- AI Model information
  model_name VARCHAR(100) NOT NULL, -- 'claude-sonnet-4' for insights
  model_version VARCHAR(50),
  generation_time_ms INTEGER, -- How long it took to generate
  token_usage_input INTEGER,
  token_usage_output INTEGER,

  -- User interaction
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  read_by UUID,
  user_rating INTEGER, -- 1-5 stars, how useful was this report?
  user_feedback TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_insight_reports_project ON insight_reports(project_id);
CREATE INDEX idx_insight_reports_period ON insight_reports(report_period_end DESC);
CREATE INDEX idx_insight_reports_type ON insight_reports(report_type);
CREATE INDEX idx_insight_reports_unread ON insight_reports(is_read) WHERE is_read = FALSE;

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE sentiment_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE churn_risk_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS sentiment_forecasts_select_policy ON sentiment_forecasts;
DROP POLICY IF EXISTS sentiment_forecasts_insert_policy ON sentiment_forecasts;
DROP POLICY IF EXISTS sentiment_forecasts_update_policy ON sentiment_forecasts;
DROP POLICY IF EXISTS sentiment_forecasts_delete_policy ON sentiment_forecasts;

DROP POLICY IF EXISTS churn_risk_select_policy ON churn_risk_predictions;
DROP POLICY IF EXISTS churn_risk_insert_policy ON churn_risk_predictions;
DROP POLICY IF EXISTS churn_risk_update_policy ON churn_risk_predictions;
DROP POLICY IF EXISTS churn_risk_delete_policy ON churn_risk_predictions;

DROP POLICY IF EXISTS anomaly_detections_select_policy ON anomaly_detections;
DROP POLICY IF EXISTS anomaly_detections_insert_policy ON anomaly_detections;
DROP POLICY IF EXISTS anomaly_detections_update_policy ON anomaly_detections;
DROP POLICY IF EXISTS anomaly_detections_delete_policy ON anomaly_detections;

DROP POLICY IF EXISTS insight_reports_select_policy ON insight_reports;
DROP POLICY IF EXISTS insight_reports_insert_policy ON insight_reports;
DROP POLICY IF EXISTS insight_reports_update_policy ON insight_reports;
DROP POLICY IF EXISTS insight_reports_delete_policy ON insight_reports;

-- Sentiment Forecasts policies
CREATE POLICY sentiment_forecasts_select_policy ON sentiment_forecasts
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY sentiment_forecasts_insert_policy ON sentiment_forecasts
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY sentiment_forecasts_update_policy ON sentiment_forecasts
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY sentiment_forecasts_delete_policy ON sentiment_forecasts
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Churn Risk Predictions policies
CREATE POLICY churn_risk_select_policy ON churn_risk_predictions
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY churn_risk_insert_policy ON churn_risk_predictions
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY churn_risk_update_policy ON churn_risk_predictions
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY churn_risk_delete_policy ON churn_risk_predictions
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Anomaly Detections policies
CREATE POLICY anomaly_detections_select_policy ON anomaly_detections
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY anomaly_detections_insert_policy ON anomaly_detections
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY anomaly_detections_update_policy ON anomaly_detections
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY anomaly_detections_delete_policy ON anomaly_detections
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Insight Reports policies
CREATE POLICY insight_reports_select_policy ON insight_reports
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY insight_reports_insert_policy ON insight_reports
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY insight_reports_update_policy ON insight_reports
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY insight_reports_delete_policy ON insight_reports
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to get latest sentiment forecast for a project
CREATE OR REPLACE FUNCTION get_latest_sentiment_forecast(p_project_id UUID, p_horizon INTEGER DEFAULT 7)
RETURNS TABLE (
  forecast_date TIMESTAMPTZ,
  target_date TIMESTAMPTZ,
  predicted_sentiment DECIMAL,
  confidence_lower DECIMAL,
  confidence_upper DECIMAL,
  trend_direction VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sf.forecast_date,
    sf.target_date,
    sf.predicted_sentiment_score,
    sf.confidence_lower,
    sf.confidence_upper,
    sf.feature_trend_direction
  FROM sentiment_forecasts sf
  WHERE sf.project_id = p_project_id
    AND sf.forecast_horizon = p_horizon
  ORDER BY sf.forecast_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active anomalies for a project
CREATE OR REPLACE FUNCTION get_active_anomalies(p_project_id UUID)
RETURNS TABLE (
  id UUID,
  anomaly_type VARCHAR,
  severity VARCHAR,
  detected_at TIMESTAMPTZ,
  ai_summary TEXT,
  recommended_actions JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ad.id,
    ad.anomaly_type,
    ad.severity,
    ad.detected_at,
    ad.ai_summary,
    ad.recommended_actions
  FROM anomaly_detections ad
  WHERE ad.project_id = p_project_id
    AND ad.status = 'active'
  ORDER BY ad.severity DESC, ad.detected_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get latest insight report
CREATE OR REPLACE FUNCTION get_latest_insight_report(p_project_id UUID)
RETURNS TABLE (
  id UUID,
  report_period_start TIMESTAMPTZ,
  report_period_end TIMESTAMPTZ,
  executive_summary TEXT,
  key_insights JSONB,
  recommended_actions JSONB,
  sentiment_trend VARCHAR,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ir.id,
    ir.report_period_start,
    ir.report_period_end,
    ir.executive_summary,
    ir.key_insights,
    ir.recommended_actions,
    ir.sentiment_trend,
    ir.created_at
  FROM insight_reports ir
  WHERE ir.project_id = p_project_id
    AND ir.report_type = 'weekly'
  ORDER BY ir.report_period_end DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get daily sentiment aggregates for forecasting
CREATE OR REPLACE FUNCTION get_daily_sentiment_aggregates(
  p_project_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  date TEXT,
  avg_sentiment DECIMAL,
  feedback_count INTEGER,
  positive_count INTEGER,
  negative_count INTEGER,
  neutral_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(p.created_at)::TEXT as date,
    COALESCE(AVG(sa.sentiment_score), 0)::DECIMAL as avg_sentiment,
    COUNT(p.id)::INTEGER as feedback_count,
    SUM(CASE WHEN sa.sentiment_category = 'positive' THEN 1 ELSE 0 END)::INTEGER as positive_count,
    SUM(CASE WHEN sa.sentiment_category = 'negative' THEN 1 ELSE 0 END)::INTEGER as negative_count,
    SUM(CASE WHEN sa.sentiment_category IN ('neutral', 'mixed') THEN 1 ELSE 0 END)::INTEGER as neutral_count
  FROM posts p
  LEFT JOIN sentiment_analysis sa ON sa.post_id = p.id
  WHERE p.project_id = p_project_id
    AND p.created_at >= p_start_date
    AND p.created_at <= p_end_date
  GROUP BY DATE(p.created_at)
  ORDER BY DATE(p.created_at) ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sentiment_forecasts_updated_at
  BEFORE UPDATE ON sentiment_forecasts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_churn_risk_predictions_updated_at
  BEFORE UPDATE ON churn_risk_predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_anomaly_detections_updated_at
  BEFORE UPDATE ON anomaly_detections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insight_reports_updated_at
  BEFORE UPDATE ON insight_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Migration Complete
-- =====================================================
