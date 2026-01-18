-- =====================================================
-- Experimentation Engine Schema Extension
-- Extends experiments table with variants, assignments, and tracking
-- =====================================================

-- =====================================================
-- EXPERIMENT VARIANTS
-- Stores different variations of an experiment
-- =====================================================
CREATE TABLE IF NOT EXISTS experiment_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'control',
  variant_key TEXT NOT NULL, -- 'control', 'treatment_a', 'treatment_b', etc.
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}', -- Variant-specific configuration
  traffic_percentage INTEGER NOT NULL DEFAULT 50 CHECK (traffic_percentage >= 0 AND traffic_percentage <= 100),
  is_control BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(experiment_id, variant_key)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_experiment_variants_experiment_id ON experiment_variants(experiment_id);

-- =====================================================
-- EXPERIMENT ASSIGNMENTS
-- Tracks which visitor is assigned to which variant
-- =====================================================
CREATE TABLE IF NOT EXISTS experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES experiment_variants(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL, -- Cookie-based anonymous ID
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional logged-in user
  assigned_at TIMESTAMPTZ DEFAULT now(),
  context JSONB DEFAULT '{}', -- Device, browser, geo, etc.
  UNIQUE(experiment_id, visitor_id)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_experiment_id ON experiment_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_visitor_id ON experiment_assignments(visitor_id);
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_variant_id ON experiment_assignments(variant_id);

-- =====================================================
-- EXPERIMENT EVENTS
-- Tracks conversions and goal completions
-- =====================================================
CREATE TABLE IF NOT EXISTS experiment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES experiment_variants(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES experiment_assignments(id) ON DELETE SET NULL,
  visitor_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'pageview', 'click', 'conversion', 'custom'
  event_name TEXT NOT NULL, -- Goal name or event identifier
  event_value DECIMAL(15, 4), -- Revenue, score, etc.
  event_properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_experiment_events_experiment_id ON experiment_events(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_events_variant_id ON experiment_events(variant_id);
CREATE INDEX IF NOT EXISTS idx_experiment_events_event_type ON experiment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_experiment_events_created_at ON experiment_events(created_at);

-- =====================================================
-- EXPERIMENT GOALS
-- Defines what success looks like for an experiment
-- =====================================================
CREATE TABLE IF NOT EXISTS experiment_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal_type TEXT NOT NULL, -- 'pageview', 'click', 'form_submit', 'custom', 'revenue'
  target_selector TEXT, -- CSS selector for click goals
  target_url TEXT, -- URL pattern for pageview goals
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experiment_goals_experiment_id ON experiment_goals(experiment_id);

-- =====================================================
-- EXPERIMENT RESULTS (Aggregated)
-- Pre-computed results for faster dashboard loading
-- =====================================================
CREATE TABLE IF NOT EXISTS experiment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES experiment_variants(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES experiment_goals(id) ON DELETE CASCADE,
  visitors INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  conversion_rate DECIMAL(10, 6) DEFAULT 0,
  total_revenue DECIMAL(15, 4) DEFAULT 0,
  confidence_level DECIMAL(10, 6) DEFAULT 0,
  lift_percentage DECIMAL(10, 4) DEFAULT 0,
  is_winner BOOLEAN DEFAULT FALSE,
  is_significant BOOLEAN DEFAULT FALSE,
  computed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(experiment_id, variant_id, goal_id)
);

CREATE INDEX IF NOT EXISTS idx_experiment_results_experiment_id ON experiment_results(experiment_id);

-- =====================================================
-- ADD COLUMNS TO EXISTING EXPERIMENTS TABLE
-- =====================================================
DO $$ 
BEGIN
  -- Add experiment_type if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'experiments' AND column_name = 'experiment_mode') THEN
    ALTER TABLE experiments ADD COLUMN experiment_mode TEXT DEFAULT 'ab_test' 
      CHECK (experiment_mode IN ('ab_test', 'multivariate', 'feature_flag', 'personalization'));
  END IF;

  -- Add traffic allocation
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'experiments' AND column_name = 'traffic_allocation') THEN
    ALTER TABLE experiments ADD COLUMN traffic_allocation INTEGER DEFAULT 100 
      CHECK (traffic_allocation >= 0 AND traffic_allocation <= 100);
  END IF;

  -- Add targeting rules
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'experiments' AND column_name = 'targeting_rules') THEN
    ALTER TABLE experiments ADD COLUMN targeting_rules JSONB DEFAULT '{}';
  END IF;

  -- Add schedule fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'experiments' AND column_name = 'scheduled_start') THEN
    ALTER TABLE experiments ADD COLUMN scheduled_start TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'experiments' AND column_name = 'scheduled_end') THEN
    ALTER TABLE experiments ADD COLUMN scheduled_end TIMESTAMPTZ;
  END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE experiment_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_results ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users via projects
CREATE POLICY "Users can view experiment variants for their projects" ON experiment_variants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM experiments e
      JOIN projects p ON e.project_id = p.id
      WHERE e.id = experiment_variants.experiment_id
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage experiment variants for their projects" ON experiment_variants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM experiments e
      JOIN projects p ON e.project_id = p.id
      WHERE e.id = experiment_variants.experiment_id
      AND p.owner_id = auth.uid()
    )
  );

-- Public read for assignments and events (needed for tracking)
CREATE POLICY "Public can read assignments for running experiments" ON experiment_assignments
  FOR SELECT USING (true);

CREATE POLICY "Public can insert assignments" ON experiment_assignments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can insert events" ON experiment_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view experiment events for their projects" ON experiment_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM experiments e
      JOIN projects p ON e.project_id = p.id
      WHERE e.id = experiment_events.experiment_id
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage experiment goals for their projects" ON experiment_goals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM experiments e
      JOIN projects p ON e.project_id = p.id
      WHERE e.id = experiment_goals.experiment_id
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view experiment results for their projects" ON experiment_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM experiments e
      JOIN projects p ON e.project_id = p.id
      WHERE e.id = experiment_results.experiment_id
      AND p.owner_id = auth.uid()
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get experiment variant for a visitor
CREATE OR REPLACE FUNCTION get_experiment_variant(
  p_experiment_id UUID,
  p_visitor_id TEXT
) RETURNS TABLE(variant_id UUID, variant_key TEXT, config JSONB) AS $$
DECLARE
  v_existing_assignment experiment_assignments%ROWTYPE;
  v_variant experiment_variants%ROWTYPE;
  v_random_val DECIMAL;
  v_cumulative DECIMAL := 0;
BEGIN
  -- Check for existing assignment
  SELECT * INTO v_existing_assignment
  FROM experiment_assignments ea
  WHERE ea.experiment_id = p_experiment_id
  AND ea.visitor_id = p_visitor_id;

  IF FOUND THEN
    -- Return existing variant
    RETURN QUERY
    SELECT ev.id, ev.variant_key, ev.config
    FROM experiment_variants ev
    WHERE ev.id = v_existing_assignment.variant_id;
    RETURN;
  END IF;

  -- Assign new variant based on traffic split
  v_random_val := random() * 100;
  
  FOR v_variant IN (
    SELECT * FROM experiment_variants ev
    WHERE ev.experiment_id = p_experiment_id
    ORDER BY ev.variant_key
  ) LOOP
    v_cumulative := v_cumulative + v_variant.traffic_percentage;
    IF v_random_val <= v_cumulative THEN
      -- Create assignment
      INSERT INTO experiment_assignments (experiment_id, variant_id, visitor_id)
      VALUES (p_experiment_id, v_variant.id, p_visitor_id);
      
      RETURN QUERY SELECT v_variant.id, v_variant.variant_key, v_variant.config;
      RETURN;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to compute experiment results
CREATE OR REPLACE FUNCTION compute_experiment_results(p_experiment_id UUID)
RETURNS VOID AS $$
DECLARE
  v_control_rate DECIMAL := 0;
BEGIN
  -- Delete old results for this experiment
  DELETE FROM experiment_results WHERE experiment_id = p_experiment_id;
  
  -- Compute and insert new results
  INSERT INTO experiment_results (
    experiment_id, variant_id, goal_id, visitors, conversions, 
    conversion_rate, computed_at
  )
  SELECT 
    p_experiment_id,
    ev.variant_id,
    NULL as goal_id,
    COUNT(DISTINCT ea.visitor_id) as visitors,
    COUNT(DISTINCT ev.visitor_id) as conversions,
    CASE 
      WHEN COUNT(DISTINCT ea.visitor_id) > 0 
      THEN ROUND(COUNT(DISTINCT ev.visitor_id)::DECIMAL / COUNT(DISTINCT ea.visitor_id), 6)
      ELSE 0 
    END as conversion_rate,
    now()
  FROM experiment_assignments ea
  LEFT JOIN experiment_events ev ON ea.variant_id = ev.variant_id AND ea.visitor_id = ev.visitor_id
  WHERE ea.experiment_id = p_experiment_id
  GROUP BY ev.variant_id;
  
  -- Mark control baseline
  SELECT conversion_rate INTO v_control_rate
  FROM experiment_results er
  JOIN experiment_variants ev ON er.variant_id = ev.id
  WHERE er.experiment_id = p_experiment_id AND ev.is_control = true;
  
  -- Calculate lift percentages
  UPDATE experiment_results
  SET lift_percentage = CASE 
    WHEN v_control_rate > 0 THEN ((conversion_rate - v_control_rate) / v_control_rate) * 100
    ELSE 0
  END
  WHERE experiment_id = p_experiment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
