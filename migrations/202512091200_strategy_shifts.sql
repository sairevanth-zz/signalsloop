-- Strategy Shifts for Autonomous Product OS
-- Stores strategy recommendations and their status

-- Drop existing table if it exists (for clean migration)
DROP TABLE IF EXISTS strategy_shifts CASCADE;

-- Strategy Shifts table
CREATE TABLE strategy_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Shift details
  type TEXT NOT NULL CHECK (type IN ('pause', 'accelerate', 'pivot', 'deprioritize', 'experiment')),
  target_feature TEXT NOT NULL,
  action TEXT NOT NULL,
  rationale TEXT NOT NULL,
  
  -- Evidence
  signals JSONB NOT NULL DEFAULT '[]',
  expected_impact TEXT,
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'rejected', 'auto_applied', 'expired')),
  
  -- Linked experiment (if auto-created)
  experiment_id UUID,
  
  -- Review tracking
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Auto-expiration
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_strategy_shifts_project_status 
  ON strategy_shifts(project_id, status);
CREATE INDEX idx_strategy_shifts_created 
  ON strategy_shifts(created_at DESC);
CREATE INDEX idx_strategy_shifts_expires 
  ON strategy_shifts(expires_at) WHERE status = 'proposed';

-- RLS
ALTER TABLE strategy_shifts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their project shifts" ON strategy_shifts;
DROP POLICY IF EXISTS "Users can create shifts for their projects" ON strategy_shifts;
DROP POLICY IF EXISTS "Users can update their project shifts" ON strategy_shifts;
DROP POLICY IF EXISTS "Service role full access to strategy_shifts" ON strategy_shifts;

-- Policy: Users can view shifts for projects they own
CREATE POLICY "Users can view their project shifts"
  ON strategy_shifts FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can insert shifts for projects they own
CREATE POLICY "Users can create shifts for their projects"
  ON strategy_shifts FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can update shifts for projects they own
CREATE POLICY "Users can update their project shifts"
  ON strategy_shifts FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Service role bypass for cron jobs
CREATE POLICY "Service role full access to strategy_shifts"
  ON strategy_shifts FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS trigger_strategy_shifts_updated_at ON strategy_shifts;
DROP FUNCTION IF EXISTS update_strategy_shifts_updated_at();

-- Updated_at trigger
CREATE FUNCTION update_strategy_shifts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_strategy_shifts_updated_at
  BEFORE UPDATE ON strategy_shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_strategy_shifts_updated_at();

