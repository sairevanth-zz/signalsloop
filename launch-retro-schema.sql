-- ============================================================================
-- LAUNCH & RETROSPECTIVE SUITE DATABASE SCHEMA
-- SignalsLoop - Product OS Completion
-- Created: December 2024
-- ============================================================================

-- ============================================================================
-- GO/NO-GO DASHBOARD TABLES
-- ============================================================================

-- Main launch board linked to projects and features
CREATE TABLE IF NOT EXISTS launch_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  feature_id UUID, -- Optional link to ai_priorities
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'reviewing', 'decided')),
  decision TEXT CHECK (decision IN ('go', 'no_go', 'conditional')),
  decision_at TIMESTAMPTZ,
  decision_notes TEXT,
  overall_score INTEGER, -- Calculated 0-100
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE launch_boards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for launch_boards (simplified to project owner only)
CREATE POLICY "Users can view launch boards for their projects" ON launch_boards
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can create launch boards for their projects" ON launch_boards
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can update launch boards for their projects" ON launch_boards
  FOR UPDATE USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can delete launch boards for their projects" ON launch_boards
  FOR DELETE USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- Dimensions with AI + human data
CREATE TABLE IF NOT EXISTS launch_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES launch_boards(id) ON DELETE CASCADE NOT NULL,
  dimension_type TEXT NOT NULL CHECK (dimension_type IN (
    'customer_readiness', 'risk_assessment', 'competitive_timing', 'success_prediction'
  )),
  ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
  ai_insights JSONB DEFAULT '[]', -- [{text, source, positive}]
  team_notes TEXT,
  customer_quotes JSONB DEFAULT '[]', -- [{text, customer, mrr}]
  prediction_data JSONB, -- {adoption, sentiment, revenue}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, dimension_type)
);

ALTER TABLE launch_dimensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage dimensions for their boards" ON launch_dimensions
  FOR ALL USING (
    board_id IN (SELECT id FROM launch_boards WHERE project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    ))
  );

-- Risks and blockers
CREATE TABLE IF NOT EXISTS launch_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES launch_boards(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'mitigated', 'acknowledged')),
  is_ai BOOLEAN DEFAULT false,
  source TEXT, -- Devil's Advocate, QA Analysis, etc.
  mitigation TEXT,
  owner TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE launch_risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage risks for their boards" ON launch_risks
  FOR ALL USING (
    board_id IN (SELECT id FROM launch_boards WHERE project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    ))
  );

-- Stakeholder votes
CREATE TABLE IF NOT EXISTS launch_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES launch_boards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT,
  role TEXT,
  is_required BOOLEAN DEFAULT false,
  vote TEXT CHECK (vote IN ('go', 'no_go', 'conditional')),
  comment TEXT,
  voted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE launch_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage votes for their boards" ON launch_votes
  FOR ALL USING (
    board_id IN (SELECT id FROM launch_boards WHERE project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    ))
  );

-- Checklist items
CREATE TABLE IF NOT EXISTS launch_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES launch_boards(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_ai BOOLEAN DEFAULT false,
  auto_verified BOOLEAN DEFAULT false,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  owner TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE launch_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage checklist for their boards" ON launch_checklist_items
  FOR ALL USING (
    board_id IN (SELECT id FROM launch_boards WHERE project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    ))
  );

-- ============================================================================
-- RETROSPECTIVE TOOL TABLES
-- ============================================================================

-- Retro boards with period configuration
CREATE TABLE IF NOT EXISTS retro_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN (
    'sprint', 'monthly', 'quarterly', 'yearly', 'custom'
  )),
  template TEXT, -- okr_review, start_stop_continue, etc.
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  team_happiness DECIMAL(3,1),
  customer_sentiment DECIMAL(3,2),
  metrics JSONB DEFAULT '[]', -- [{label, value, trend}]
  ai_summary TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE retro_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view retro boards for their projects" ON retro_boards
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can create retro boards for their projects" ON retro_boards
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can update retro boards for their projects" ON retro_boards
  FOR UPDATE USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can delete retro boards for their projects" ON retro_boards
  FOR DELETE USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- Dynamic columns per board
CREATE TABLE IF NOT EXISTS retro_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES retro_boards(id) ON DELETE CASCADE NOT NULL,
  column_key TEXT NOT NULL, -- wins, misses, insights, next, start, stop, continue, etc.
  title TEXT NOT NULL,
  emoji TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE retro_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage columns for their boards" ON retro_columns
  FOR ALL USING (
    board_id IN (SELECT id FROM retro_boards WHERE project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    ))
  );

-- Cards with AI/human source
CREATE TABLE IF NOT EXISTS retro_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id UUID REFERENCES retro_columns(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_ai BOOLEAN DEFAULT false,
  source TEXT, -- AI: Revenue Intelligence, Outcome Attribution; Human: author name
  data_badge TEXT, -- e.g., "+$127K MRR", "+156% growth"
  is_success BOOLEAN DEFAULT false,
  is_alert BOOLEAN DEFAULT false,
  vote_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE retro_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage cards for their boards" ON retro_cards
  FOR ALL USING (
    column_id IN (SELECT id FROM retro_columns WHERE board_id IN (
      SELECT id FROM retro_boards WHERE project_id IN (
        SELECT id FROM projects WHERE owner_id = auth.uid()
      )
    ))
  );

-- Card votes (for upvoting)
CREATE TABLE IF NOT EXISTS retro_card_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES retro_cards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(card_id, user_id)
);

ALTER TABLE retro_card_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage card votes" ON retro_card_votes
  FOR ALL USING (
    card_id IN (SELECT id FROM retro_cards WHERE column_id IN (
      SELECT id FROM retro_columns WHERE board_id IN (
        SELECT id FROM retro_boards WHERE project_id IN (
          SELECT id FROM projects WHERE owner_id = auth.uid()
        )
      )
    ))
  );

-- Action items with tracking
CREATE TABLE IF NOT EXISTS retro_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES retro_boards(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  owner TEXT,
  due_date DATE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  from_card_id UUID REFERENCES retro_cards(id) ON DELETE SET NULL,
  from_source TEXT, -- "AI Insight", "Team Card"
  external_id TEXT, -- Linear/Jira issue ID
  external_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE retro_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage actions for their boards" ON retro_actions
  FOR ALL USING (
    board_id IN (SELECT id FROM retro_boards WHERE project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    ))
  );

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_launch_boards_project ON launch_boards(project_id);
CREATE INDEX IF NOT EXISTS idx_launch_boards_status ON launch_boards(status);
CREATE INDEX IF NOT EXISTS idx_launch_dimensions_board ON launch_dimensions(board_id);
CREATE INDEX IF NOT EXISTS idx_launch_risks_board ON launch_risks(board_id);
CREATE INDEX IF NOT EXISTS idx_launch_votes_board ON launch_votes(board_id);
CREATE INDEX IF NOT EXISTS idx_launch_checklist_board ON launch_checklist_items(board_id);

CREATE INDEX IF NOT EXISTS idx_retro_boards_project ON retro_boards(project_id);
CREATE INDEX IF NOT EXISTS idx_retro_boards_period ON retro_boards(period_type);
CREATE INDEX IF NOT EXISTS idx_retro_columns_board ON retro_columns(board_id);
CREATE INDEX IF NOT EXISTS idx_retro_cards_column ON retro_cards(column_id);
CREATE INDEX IF NOT EXISTS idx_retro_card_votes_card ON retro_card_votes(card_id);
CREATE INDEX IF NOT EXISTS idx_retro_actions_board ON retro_actions(board_id);

-- ============================================================================
-- TRIGGER FOR VOTE COUNT UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION update_retro_card_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE retro_cards SET vote_count = vote_count + 1 WHERE id = NEW.card_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE retro_cards SET vote_count = vote_count - 1 WHERE id = OLD.card_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_retro_card_vote_count ON retro_card_votes;
CREATE TRIGGER trigger_update_retro_card_vote_count
AFTER INSERT OR DELETE ON retro_card_votes
FOR EACH ROW EXECUTE FUNCTION update_retro_card_vote_count();

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
DROP TRIGGER IF EXISTS trigger_launch_boards_updated ON launch_boards;
CREATE TRIGGER trigger_launch_boards_updated
BEFORE UPDATE ON launch_boards
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_launch_dimensions_updated ON launch_dimensions;
CREATE TRIGGER trigger_launch_dimensions_updated
BEFORE UPDATE ON launch_dimensions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_retro_boards_updated ON retro_boards;
CREATE TRIGGER trigger_retro_boards_updated
BEFORE UPDATE ON retro_boards
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_retro_cards_updated ON retro_cards;
CREATE TRIGGER trigger_retro_cards_updated
BEFORE UPDATE ON retro_cards
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_retro_actions_updated ON retro_actions;
CREATE TRIGGER trigger_retro_actions_updated
BEFORE UPDATE ON retro_actions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
