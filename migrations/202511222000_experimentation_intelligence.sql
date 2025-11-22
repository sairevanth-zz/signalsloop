-- Experimentation Intelligence Migration
-- Creates tables for AI-powered experiment design, tracking, and learning repository
-- Part of Phase 3: Stakeholder Management & Experimentation Intelligence

-- ============================================================================
-- 1. Create experiments table
-- ============================================================================
CREATE TABLE IF NOT EXISTS experiments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,

  -- Hypothesis
  hypothesis TEXT NOT NULL,
  expected_outcome TEXT,

  -- Design
  experiment_type TEXT NOT NULL CHECK (experiment_type IN ('ab_test', 'multivariate', 'feature_flag', 'other')),
  control_description TEXT,
  treatment_description TEXT,
  variants JSONB DEFAULT '[]'::jsonb, -- For multivariate tests: [{ name: 'variant_a', description: '...' }]

  -- Metrics
  primary_metric TEXT NOT NULL,
  secondary_metrics JSONB DEFAULT '[]'::jsonb, -- Array of metric names
  success_criteria TEXT,

  -- Statistical parameters
  sample_size_target INTEGER,
  minimum_detectable_effect DECIMAL,
  statistical_power DECIMAL DEFAULT 0.8,
  confidence_level DECIMAL DEFAULT 0.95,

  -- Execution
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'running', 'paused', 'completed', 'cancelled')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  actual_end_date TIMESTAMPTZ,

  -- Integration
  feature_flag_key TEXT, -- Reference to LaunchDarkly/Optimizely/etc
  feature_flag_provider TEXT, -- 'launchdarkly', 'optimizely', 'custom', etc
  related_roadmap_item_id UUID, -- Can link to roadmap_items if that table exists

  -- AI-generated design metadata
  ai_generated BOOLEAN DEFAULT false,
  design_prompt TEXT, -- Original feature idea/prompt that generated this design

  -- Metadata
  created_by UUID, -- Can reference profiles/users table if it exists
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. Create experiment_results table
-- ============================================================================
CREATE TABLE IF NOT EXISTS experiment_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,

  -- Metric identification
  metric_name TEXT NOT NULL,
  variant TEXT NOT NULL, -- 'control', 'treatment', or custom variant name

  -- Sample statistics
  sample_size INTEGER NOT NULL,
  mean_value DECIMAL,
  std_dev DECIMAL,
  median_value DECIMAL,
  conversion_rate DECIMAL, -- For binary metrics

  -- Statistical analysis
  p_value DECIMAL,
  confidence_interval JSONB, -- { lower: X, upper: Y }
  statistical_significance BOOLEAN DEFAULT false,
  effect_size DECIMAL, -- Cohen's d or similar
  relative_improvement DECIMAL, -- Percentage improvement over control

  -- Raw data reference (optional)
  data_source TEXT, -- Where the data came from
  query_used TEXT, -- SQL or other query used to get the data

  -- Timestamps
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate results for same metric/variant combination
  UNIQUE(experiment_id, metric_name, variant, measured_at)
);

-- ============================================================================
-- 3. Create experiment_learnings table
-- ============================================================================
CREATE TABLE IF NOT EXISTS experiment_learnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,

  -- Learning classification
  learning_type TEXT NOT NULL CHECK (learning_type IN ('insight', 'recommendation', 'mistake', 'success', 'hypothesis_invalidated', 'hypothesis_validated')),

  -- Learning content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb, -- Categorization tags

  -- Impact assessment
  impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 10),
  applicable_to JSONB DEFAULT '[]'::jsonb, -- Where this learning applies: ['pricing', 'onboarding', 'features', etc]

  -- AI extraction metadata
  ai_generated BOOLEAN DEFAULT false,
  extraction_confidence DECIMAL, -- 0-1 score of how confident AI is in this learning

  -- Metadata
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. Create experiment_embeddings table (for semantic search)
-- ============================================================================
CREATE TABLE IF NOT EXISTS experiment_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,

  -- Content that was embedded
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'full_experiment' CHECK (content_type IN ('full_experiment', 'hypothesis', 'learnings', 'results')),

  -- Vector embedding (1536 dimensions for OpenAI text-embedding-3-small)
  embedding vector(1536) NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. Create experiment_snapshots table (track changes over time)
-- ============================================================================
CREATE TABLE IF NOT EXISTS experiment_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,

  -- Snapshot data
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('daily', 'milestone', 'manual')),
  results_snapshot JSONB NOT NULL, -- Capture all results at this point in time
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. Create indexes for performance
-- ============================================================================

-- Experiments indexes
CREATE INDEX IF NOT EXISTS idx_experiments_project_id ON experiments(project_id);
CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status);
CREATE INDEX IF NOT EXISTS idx_experiments_created_at ON experiments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_experiments_type ON experiments(experiment_type);
CREATE INDEX IF NOT EXISTS idx_experiments_feature_flag ON experiments(feature_flag_key);

-- Experiment results indexes
CREATE INDEX IF NOT EXISTS idx_experiment_results_experiment_id ON experiment_results(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_results_metric ON experiment_results(metric_name);
CREATE INDEX IF NOT EXISTS idx_experiment_results_variant ON experiment_results(variant);
CREATE INDEX IF NOT EXISTS idx_experiment_results_measured_at ON experiment_results(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_experiment_results_significance ON experiment_results(statistical_significance);

-- Experiment learnings indexes
CREATE INDEX IF NOT EXISTS idx_experiment_learnings_experiment_id ON experiment_learnings(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_learnings_type ON experiment_learnings(learning_type);
CREATE INDEX IF NOT EXISTS idx_experiment_learnings_impact ON experiment_learnings(impact_score DESC);
CREATE INDEX IF NOT EXISTS idx_experiment_learnings_tags ON experiment_learnings USING gin(tags);

-- Experiment embeddings indexes
CREATE INDEX IF NOT EXISTS idx_experiment_embeddings_experiment_id ON experiment_embeddings(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_embeddings_type ON experiment_embeddings(content_type);

-- Vector index for semantic search (HNSW for fast approximate nearest neighbor search)
CREATE INDEX IF NOT EXISTS idx_experiment_embeddings_vector
  ON experiment_embeddings USING hnsw (embedding vector_cosine_ops);

-- Experiment snapshots indexes
CREATE INDEX IF NOT EXISTS idx_experiment_snapshots_experiment_id ON experiment_snapshots(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_snapshots_created_at ON experiment_snapshots(created_at DESC);

-- ============================================================================
-- 7. Enable Row Level Security
-- ============================================================================
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8. RLS Policies for experiments
-- ============================================================================

DROP POLICY IF EXISTS "Project owners can view experiments" ON experiments;
CREATE POLICY "Project owners can view experiments" ON experiments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = experiments.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Project owners can insert experiments" ON experiments;
CREATE POLICY "Project owners can insert experiments" ON experiments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = experiments.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Project owners can update experiments" ON experiments;
CREATE POLICY "Project owners can update experiments" ON experiments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = experiments.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Project owners can delete experiments" ON experiments;
CREATE POLICY "Project owners can delete experiments" ON experiments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = experiments.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 9. RLS Policies for experiment_results
-- ============================================================================

DROP POLICY IF EXISTS "Users can view results for their experiments" ON experiment_results;
CREATE POLICY "Users can view results for their experiments" ON experiment_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM experiments e
      JOIN projects p ON p.id = e.project_id
      WHERE e.id = experiment_results.experiment_id
      AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert experiment results" ON experiment_results;
CREATE POLICY "System can insert experiment results" ON experiment_results
  FOR INSERT WITH CHECK (true); -- Service role only

DROP POLICY IF EXISTS "Users can update results for their experiments" ON experiment_results;
CREATE POLICY "Users can update results for their experiments" ON experiment_results
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM experiments e
      JOIN projects p ON p.id = e.project_id
      WHERE e.id = experiment_results.experiment_id
      AND p.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 10. RLS Policies for experiment_learnings
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage learnings for their experiments" ON experiment_learnings;
CREATE POLICY "Users can manage learnings for their experiments" ON experiment_learnings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM experiments e
      JOIN projects p ON p.id = e.project_id
      WHERE e.id = experiment_learnings.experiment_id
      AND p.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 11. RLS Policies for experiment_embeddings
-- ============================================================================

DROP POLICY IF EXISTS "Users can view embeddings for their experiments" ON experiment_embeddings;
CREATE POLICY "Users can view embeddings for their experiments" ON experiment_embeddings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM experiments e
      JOIN projects p ON p.id = e.project_id
      WHERE e.id = experiment_embeddings.experiment_id
      AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can manage experiment embeddings" ON experiment_embeddings;
CREATE POLICY "System can manage experiment embeddings" ON experiment_embeddings
  FOR ALL WITH CHECK (true); -- Service role only

-- ============================================================================
-- 12. RLS Policies for experiment_snapshots
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage snapshots for their experiments" ON experiment_snapshots;
CREATE POLICY "Users can manage snapshots for their experiments" ON experiment_snapshots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM experiments e
      JOIN projects p ON p.id = e.project_id
      WHERE e.id = experiment_snapshots.experiment_id
      AND p.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 13. Helper functions
-- ============================================================================

-- Function to search experiments semantically
CREATE OR REPLACE FUNCTION search_experiments_semantic(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  p_project_id uuid DEFAULT NULL
)
RETURNS TABLE (
  experiment_id uuid,
  experiment_name text,
  hypothesis text,
  description text,
  status text,
  similarity float
) AS $$
  SELECT
    e.id,
    e.name,
    e.hypothesis,
    e.description,
    e.status,
    1 - (ee.embedding <=> query_embedding) as similarity
  FROM experiment_embeddings ee
  JOIN experiments e ON e.id = ee.experiment_id
  WHERE 1 - (ee.embedding <=> query_embedding) > match_threshold
    AND (p_project_id IS NULL OR e.project_id = p_project_id)
    AND ee.content_type = 'full_experiment'
  ORDER BY similarity DESC
  LIMIT match_count;
$$ LANGUAGE SQL STABLE;

-- Function to get experiment with all related data
CREATE OR REPLACE FUNCTION get_experiment_full(p_experiment_id UUID)
RETURNS JSON AS $$
  SELECT json_build_object(
    'experiment', row_to_json(e.*),
    'results', (
      SELECT COALESCE(json_agg(row_to_json(r.*)), '[]'::json)
      FROM experiment_results r
      WHERE r.experiment_id = p_experiment_id
      ORDER BY r.measured_at DESC
    ),
    'learnings', (
      SELECT COALESCE(json_agg(row_to_json(l.*)), '[]'::json)
      FROM experiment_learnings l
      WHERE l.experiment_id = p_experiment_id
      ORDER BY l.impact_score DESC NULLS LAST, l.created_at DESC
    ),
    'snapshots', (
      SELECT COALESCE(json_agg(row_to_json(s.*)), '[]'::json)
      FROM (
        SELECT *
        FROM experiment_snapshots s
        WHERE s.experiment_id = p_experiment_id
        ORDER BY s.created_at DESC
        LIMIT 10
      ) s
    )
  )
  FROM experiments e
  WHERE e.id = p_experiment_id;
$$ LANGUAGE SQL STABLE;

-- Function to get experiments by status for a project
CREATE OR REPLACE FUNCTION get_project_experiments_by_status(
  p_project_id UUID,
  p_status TEXT DEFAULT NULL
)
RETURNS JSON AS $$
  SELECT COALESCE(json_agg(
    json_build_object(
      'experiment', row_to_json(e.*),
      'result_count', (
        SELECT COUNT(*)
        FROM experiment_results r
        WHERE r.experiment_id = e.id
      ),
      'significant_results', (
        SELECT COUNT(*)
        FROM experiment_results r
        WHERE r.experiment_id = e.id
        AND r.statistical_significance = true
      ),
      'learning_count', (
        SELECT COUNT(*)
        FROM experiment_learnings l
        WHERE l.experiment_id = e.id
      )
    )
    ORDER BY e.created_at DESC
  ), '[]'::json)
  FROM experiments e
  WHERE e.project_id = p_project_id
    AND (p_status IS NULL OR e.status = p_status);
$$ LANGUAGE SQL STABLE;

-- Function to calculate statistical significance (t-test)
CREATE OR REPLACE FUNCTION calculate_experiment_significance(
  p_experiment_id UUID,
  p_metric_name TEXT
)
RETURNS TABLE (
  metric_name text,
  control_mean decimal,
  treatment_mean decimal,
  p_value decimal,
  is_significant boolean,
  improvement_percent decimal
) AS $$
DECLARE
  v_control_mean decimal;
  v_control_std decimal;
  v_control_n integer;
  v_treatment_mean decimal;
  v_treatment_std decimal;
  v_treatment_n integer;
  v_pooled_std_err decimal;
  v_t_statistic decimal;
  v_p_value decimal;
  v_is_significant boolean;
  v_improvement decimal;
BEGIN
  -- Get control stats
  SELECT mean_value, std_dev, sample_size
  INTO v_control_mean, v_control_std, v_control_n
  FROM experiment_results
  WHERE experiment_id = p_experiment_id
    AND metric_name = p_metric_name
    AND variant = 'control'
  LIMIT 1;

  -- Get treatment stats
  SELECT mean_value, std_dev, sample_size
  INTO v_treatment_mean, v_treatment_std, v_treatment_n
  FROM experiment_results
  WHERE experiment_id = p_experiment_id
    AND metric_name = p_metric_name
    AND variant = 'treatment'
  LIMIT 1;

  -- Check if we have data
  IF v_control_mean IS NULL OR v_treatment_mean IS NULL THEN
    RETURN;
  END IF;

  -- Calculate pooled standard error (Welch's t-test)
  v_pooled_std_err := sqrt(
    (power(v_control_std, 2) / v_control_n) +
    (power(v_treatment_std, 2) / v_treatment_n)
  );

  -- Calculate t-statistic
  v_t_statistic := (v_treatment_mean - v_control_mean) / v_pooled_std_err;

  -- Simplified p-value calculation (approximate)
  -- For production, use proper statistical library
  v_p_value := CASE
    WHEN abs(v_t_statistic) > 2.576 THEN 0.01  -- 99% confidence
    WHEN abs(v_t_statistic) > 1.96 THEN 0.05   -- 95% confidence
    WHEN abs(v_t_statistic) > 1.645 THEN 0.10  -- 90% confidence
    ELSE 0.20
  END;

  v_is_significant := v_p_value < 0.05;

  -- Calculate improvement percentage
  v_improvement := CASE
    WHEN v_control_mean = 0 THEN NULL
    ELSE ((v_treatment_mean - v_control_mean) / v_control_mean * 100)
  END;

  -- Return results
  metric_name := p_metric_name;
  control_mean := v_control_mean;
  treatment_mean := v_treatment_mean;
  p_value := v_p_value;
  is_significant := v_is_significant;
  improvement_percent := v_improvement;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 14. Triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_experiments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_experiments_updated_at ON experiments;
CREATE TRIGGER trigger_update_experiments_updated_at
  BEFORE UPDATE ON experiments
  FOR EACH ROW
  EXECUTE FUNCTION update_experiments_updated_at();

-- ============================================================================
-- 15. Comments for documentation
-- ============================================================================

COMMENT ON TABLE experiments IS 'Product experiments and A/B tests with AI-powered design assistance';
COMMENT ON TABLE experiment_results IS 'Statistical results from experiment measurements';
COMMENT ON TABLE experiment_learnings IS 'Key learnings and insights extracted from experiments';
COMMENT ON TABLE experiment_embeddings IS 'Vector embeddings for semantic search over experiment knowledge base';
COMMENT ON TABLE experiment_snapshots IS 'Point-in-time snapshots of experiment progress';

COMMENT ON COLUMN experiments.hypothesis IS 'If/Then hypothesis statement for the experiment';
COMMENT ON COLUMN experiments.experiment_type IS 'Type: ab_test, multivariate, feature_flag, or other';
COMMENT ON COLUMN experiments.minimum_detectable_effect IS 'Smallest effect size worth detecting (as decimal, e.g., 0.05 for 5%)';
COMMENT ON COLUMN experiments.statistical_power IS 'Probability of detecting true effect (typically 0.8)';
COMMENT ON COLUMN experiment_results.statistical_significance IS 'Whether result reached p < 0.05';
COMMENT ON COLUMN experiment_learnings.learning_type IS 'Classification: insight, recommendation, mistake, success, hypothesis_validated/invalidated';

-- ============================================================================
-- Migration complete
-- ============================================================================
