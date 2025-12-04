-- =============================================
-- Conversational Stakeholder Interface Tables
-- Feature E: Gen 3
-- =============================================

-- Stakeholder queries table
CREATE TABLE IF NOT EXISTS stakeholder_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Query details
  query_text TEXT NOT NULL,
  user_role TEXT CHECK (user_role IN ('ceo', 'sales', 'engineering', 'marketing', 'customer_success', 'product')),

  -- Generated response
  response_components JSONB NOT NULL,
  /* Structure:
  [
    { "type": "SummaryText", "order": 1, "props": { "content": "...", "sources": [...] } },
    { "type": "MetricCard", "order": 2, "props": { "title": "...", "value": 0.72, ... } },
    ...
  ]
  */

  -- Follow-up suggestions
  follow_up_questions JSONB DEFAULT '[]'::jsonb,

  -- Performance metrics
  generation_time_ms INTEGER,
  model_used TEXT DEFAULT 'gpt-4o',
  tokens_used INTEGER,

  -- User feedback
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stakeholder_queries_project ON stakeholder_queries(project_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_queries_user ON stakeholder_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_queries_created ON stakeholder_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stakeholder_queries_role ON stakeholder_queries(user_role);

-- Enable RLS
ALTER TABLE stakeholder_queries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own queries" ON stakeholder_queries;
CREATE POLICY "Users can view their own queries"
  ON stakeholder_queries FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own queries" ON stakeholder_queries;
CREATE POLICY "Users can insert their own queries"
  ON stakeholder_queries FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own queries" ON stakeholder_queries;
CREATE POLICY "Users can update their own queries"
  ON stakeholder_queries FOR UPDATE
  USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stakeholder_queries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_stakeholder_queries_updated_at ON stakeholder_queries;
CREATE TRIGGER update_stakeholder_queries_updated_at
  BEFORE UPDATE ON stakeholder_queries
  FOR EACH ROW
  EXECUTE FUNCTION update_stakeholder_queries_updated_at();

-- Add comment for documentation
COMMENT ON TABLE stakeholder_queries IS 'Stores conversational queries from stakeholders with dynamically generated component-based responses';
