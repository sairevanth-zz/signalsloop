-- Win/Loss Decoder (Deal Autopsy) Migration
-- Real-time deal analysis with AI-powered autopsies
-- Identifies loss patterns, competitor insights, and provides actionable recommendations

-- ============================================================================
-- 1. Create enum types
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE deal_status AS ENUM ('won', 'lost', 'open');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE deal_stage AS ENUM ('prospecting', 'qualification', 'proposal', 'negotiation', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE loss_reason_category AS ENUM ('pricing', 'features', 'competitor', 'timing', 'budget', 'fit', 'process', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. Create deals table
-- ============================================================================

CREATE TABLE IF NOT EXISTS deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Deal identification
  name TEXT NOT NULL,
  external_id TEXT, -- CRM deal ID for syncing

  -- Deal details
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  stage deal_stage DEFAULT 'prospecting',
  status deal_status DEFAULT 'open',

  -- Competitive context
  competitor TEXT,
  competitor_product TEXT,

  -- Notes and context
  notes TEXT,
  close_reason TEXT, -- User-provided or CRM reason

  -- Contact information
  contact_name TEXT,
  contact_email TEXT,
  contact_company TEXT,

  -- Source tracking
  source TEXT DEFAULT 'manual', -- 'manual', 'csv', 'webhook', 'api'

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional custom fields

  -- Timestamps
  closed_at TIMESTAMP WITH TIME ZONE,
  expected_close_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_amount CHECK (amount >= 0),
  CONSTRAINT closed_requires_timestamp CHECK (
    (status = 'open') OR (status IN ('won', 'lost') AND closed_at IS NOT NULL)
  )
);

-- ============================================================================
-- 3. Create deal_autopsies table
-- ============================================================================

CREATE TABLE IF NOT EXISTS deal_autopsies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,

  -- Analysis summary
  summary TEXT NOT NULL, -- Executive summary of the deal outcome
  primary_reason loss_reason_category,
  primary_reason_detail TEXT, -- Specific reason within the category

  -- Structured insights
  objections JSONB DEFAULT '[]'::jsonb, -- Array of objection objects
  competitor_signals JSONB DEFAULT '[]'::jsonb, -- Competitive intelligence extracted
  key_themes TEXT[] DEFAULT ARRAY[]::TEXT[], -- Main themes from notes

  -- Recommendations
  recommendations TEXT NOT NULL, -- Markdown formatted recommendations
  action_items TEXT[] DEFAULT ARRAY[]::TEXT[], -- Specific next steps

  -- Similar deals
  similar_open_deal_ids UUID[] DEFAULT ARRAY[]::UUID[], -- At-risk open deals
  similar_lost_deal_ids UUID[] DEFAULT ARRAY[]::UUID[], -- Historical similar losses

  -- AI metadata
  confidence NUMERIC(3, 2) DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  ai_model TEXT DEFAULT 'gpt-4o-mini',
  processing_time_ms INTEGER,

  -- Timestamps
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  regenerated_count INTEGER DEFAULT 0,
  last_regenerated_at TIMESTAMP WITH TIME ZONE,

  -- Ensure one autopsy per deal (can be regenerated)
  UNIQUE(deal_id)
);

-- ============================================================================
-- 4. Create deal_battlecards table (competitor pattern tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS deal_battlecards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Competitor identification
  competitor_name TEXT NOT NULL,
  competitor_product TEXT,

  -- Win/Loss stats
  total_deals_competing INTEGER DEFAULT 0,
  deals_won INTEGER DEFAULT 0,
  deals_lost INTEGER DEFAULT 0,
  win_rate NUMERIC(5, 2) DEFAULT 0, -- Percentage

  -- Revenue tracking
  total_revenue_at_stake NUMERIC(12, 2) DEFAULT 0,
  revenue_won NUMERIC(12, 2) DEFAULT 0,
  revenue_lost NUMERIC(12, 2) DEFAULT 0,

  -- Pattern analysis
  common_objections TEXT[] DEFAULT ARRAY[]::TEXT[],
  common_win_factors TEXT[] DEFAULT ARRAY[]::TEXT[],
  common_loss_factors TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Insights
  strengths TEXT[] DEFAULT ARRAY[]::TEXT[], -- Their strengths vs us
  weaknesses TEXT[] DEFAULT ARRAY[]::TEXT[], -- Their weaknesses vs us
  recommended_positioning TEXT, -- How to position against them

  -- Metadata
  last_analyzed_at TIMESTAMP WITH TIME ZONE,
  deal_ids UUID[] DEFAULT ARRAY[]::UUID[], -- Related deals

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(project_id, competitor_name)
);

-- ============================================================================
-- 5. Create deal_digest_subscriptions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS deal_digest_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Subscription details
  channel TEXT NOT NULL CHECK (channel IN ('email', 'slack')),
  destination TEXT NOT NULL, -- email address or slack channel ID

  -- Digest preferences
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'immediate')),
  include_won BOOLEAN DEFAULT false,
  include_lost BOOLEAN DEFAULT true,
  include_at_risk BOOLEAN DEFAULT true,
  min_deal_amount NUMERIC(12, 2) DEFAULT 0,

  -- Status
  active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(project_id, channel, destination)
);

-- ============================================================================
-- 6. Create indexes for performance
-- ============================================================================

-- Deals indexes
CREATE INDEX IF NOT EXISTS idx_deals_project_id ON deals(project_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_closed_at ON deals(closed_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_competitor ON deals(competitor) WHERE competitor IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_external_id ON deals(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_amount ON deals(amount DESC);
CREATE INDEX IF NOT EXISTS idx_deals_project_status ON deals(project_id, status);
CREATE INDEX IF NOT EXISTS idx_deals_project_closed ON deals(project_id, closed_at DESC NULLS LAST);

-- Deal autopsies indexes
CREATE INDEX IF NOT EXISTS idx_deal_autopsies_deal_id ON deal_autopsies(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_autopsies_primary_reason ON deal_autopsies(primary_reason) WHERE primary_reason IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deal_autopsies_generated_at ON deal_autopsies(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_autopsies_confidence ON deal_autopsies(confidence DESC);

-- Battlecards indexes
CREATE INDEX IF NOT EXISTS idx_battlecards_project_id ON deal_battlecards(project_id);
CREATE INDEX IF NOT EXISTS idx_battlecards_competitor ON deal_battlecards(competitor_name);
CREATE INDEX IF NOT EXISTS idx_battlecards_win_rate ON deal_battlecards(win_rate DESC);
CREATE INDEX IF NOT EXISTS idx_battlecards_revenue_lost ON deal_battlecards(revenue_lost DESC);

-- Digest subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_digest_subs_project_id ON deal_digest_subscriptions(project_id);
CREATE INDEX IF NOT EXISTS idx_digest_subs_active ON deal_digest_subscriptions(active) WHERE active = true;

-- ============================================================================
-- 7. Enable Row Level Security
-- ============================================================================

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_autopsies ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_battlecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_digest_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8. RLS Policies for deals
-- ============================================================================

DROP POLICY IF EXISTS "Users can view deals for their projects" ON deals;
CREATE POLICY "Users can view deals for their projects" ON deals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = deals.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert deals for their projects" ON deals;
CREATE POLICY "Users can insert deals for their projects" ON deals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = deals.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update deals for their projects" ON deals;
CREATE POLICY "Users can update deals for their projects" ON deals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = deals.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete deals for their projects" ON deals;
CREATE POLICY "Users can delete deals for their projects" ON deals
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = deals.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert deals" ON deals;
CREATE POLICY "System can insert deals" ON deals
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update deals" ON deals;
CREATE POLICY "System can update deals" ON deals
  FOR UPDATE USING (true);

-- ============================================================================
-- 9. RLS Policies for deal_autopsies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view autopsies for their projects" ON deal_autopsies;
CREATE POLICY "Users can view autopsies for their projects" ON deal_autopsies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deals d
      JOIN projects p ON p.id = d.project_id
      WHERE d.id = deal_autopsies.deal_id AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert autopsies" ON deal_autopsies;
CREATE POLICY "System can insert autopsies" ON deal_autopsies
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update autopsies" ON deal_autopsies;
CREATE POLICY "System can update autopsies" ON deal_autopsies
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete autopsies for their projects" ON deal_autopsies;
CREATE POLICY "Users can delete autopsies for their projects" ON deal_autopsies
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM deals d
      JOIN projects p ON p.id = d.project_id
      WHERE d.id = deal_autopsies.deal_id AND p.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 10. RLS Policies for deal_battlecards
-- ============================================================================

DROP POLICY IF EXISTS "Users can view battlecards for their projects" ON deal_battlecards;
CREATE POLICY "Users can view battlecards for their projects" ON deal_battlecards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = deal_battlecards.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can manage battlecards" ON deal_battlecards;
CREATE POLICY "System can manage battlecards" ON deal_battlecards
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can update battlecards for their projects" ON deal_battlecards;
CREATE POLICY "Users can update battlecards for their projects" ON deal_battlecards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = deal_battlecards.project_id AND projects.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 11. RLS Policies for deal_digest_subscriptions
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage digests for their projects" ON deal_digest_subscriptions;
CREATE POLICY "Users can manage digests for their projects" ON deal_digest_subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = deal_digest_subscriptions.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can manage digest subscriptions" ON deal_digest_subscriptions;
CREATE POLICY "System can manage digest subscriptions" ON deal_digest_subscriptions
  FOR ALL USING (true);

-- ============================================================================
-- 12. Create triggers for updated_at timestamps
-- ============================================================================

DROP TRIGGER IF EXISTS update_deals_timestamp ON deals;
CREATE TRIGGER update_deals_timestamp
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_hunter_timestamp();

DROP TRIGGER IF EXISTS update_battlecards_timestamp ON deal_battlecards;
CREATE TRIGGER update_battlecards_timestamp
  BEFORE UPDATE ON deal_battlecards
  FOR EACH ROW
  EXECUTE FUNCTION update_hunter_timestamp();

DROP TRIGGER IF EXISTS update_digest_subs_timestamp ON deal_digest_subscriptions;
CREATE TRIGGER update_digest_subs_timestamp
  BEFORE UPDATE ON deal_digest_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_hunter_timestamp();

-- ============================================================================
-- 13. Create helper functions
-- ============================================================================

-- Function to get deal overview stats
CREATE OR REPLACE FUNCTION get_deals_overview(p_project_id UUID, p_days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  total_deals BIGINT,
  open_deals BIGINT,
  won_deals BIGINT,
  lost_deals BIGINT,
  win_rate NUMERIC,
  total_revenue NUMERIC,
  revenue_won NUMERIC,
  revenue_lost NUMERIC,
  revenue_in_pipeline NUMERIC,
  top_loss_reasons JSONB,
  top_competitors JSONB,
  recent_losses BIGINT,
  avg_deal_size NUMERIC
) AS $$
DECLARE
  v_total_deals BIGINT;
  v_open_deals BIGINT;
  v_won_deals BIGINT;
  v_lost_deals BIGINT;
  v_win_rate NUMERIC;
  v_total_revenue NUMERIC;
  v_revenue_won NUMERIC;
  v_revenue_lost NUMERIC;
  v_revenue_in_pipeline NUMERIC;
  v_top_loss_reasons JSONB;
  v_top_competitors JSONB;
  v_recent_losses BIGINT;
  v_avg_deal_size NUMERIC;
BEGIN
  -- Count deals by status
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'open'),
    COUNT(*) FILTER (WHERE status = 'won'),
    COUNT(*) FILTER (WHERE status = 'lost')
  INTO v_total_deals, v_open_deals, v_won_deals, v_lost_deals
  FROM deals
  WHERE project_id = p_project_id;

  -- Calculate win rate
  IF (v_won_deals + v_lost_deals) > 0 THEN
    v_win_rate := ROUND((v_won_deals::NUMERIC / (v_won_deals + v_lost_deals)::NUMERIC * 100), 2);
  ELSE
    v_win_rate := 0;
  END IF;

  -- Calculate revenue metrics
  SELECT
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(amount) FILTER (WHERE status = 'won'), 0),
    COALESCE(SUM(amount) FILTER (WHERE status = 'lost'), 0),
    COALESCE(SUM(amount) FILTER (WHERE status = 'open'), 0),
    COALESCE(AVG(amount), 0)
  INTO v_total_revenue, v_revenue_won, v_revenue_lost, v_revenue_in_pipeline, v_avg_deal_size
  FROM deals
  WHERE project_id = p_project_id;

  -- Get top loss reasons
  SELECT COALESCE(jsonb_agg(reason_data ORDER BY count DESC), '[]'::jsonb)
  INTO v_top_loss_reasons
  FROM (
    SELECT
      jsonb_build_object(
        'reason', COALESCE(da.primary_reason::TEXT, 'unknown'),
        'count', COUNT(*),
        'revenue_lost', COALESCE(SUM(d.amount), 0)
      ) as reason_data,
      COUNT(*) as count
    FROM deals d
    LEFT JOIN deal_autopsies da ON da.deal_id = d.id
    WHERE d.project_id = p_project_id
      AND d.status = 'lost'
      AND d.closed_at >= NOW() - (p_days_back || ' days')::INTERVAL
    GROUP BY da.primary_reason
    LIMIT 5
  ) reasons;

  -- Get top competitors
  SELECT COALESCE(jsonb_agg(comp_data ORDER BY count DESC), '[]'::jsonb)
  INTO v_top_competitors
  FROM (
    SELECT
      jsonb_build_object(
        'competitor', competitor,
        'count', COUNT(*),
        'lost_count', COUNT(*) FILTER (WHERE status = 'lost'),
        'won_count', COUNT(*) FILTER (WHERE status = 'won'),
        'revenue_lost', COALESCE(SUM(amount) FILTER (WHERE status = 'lost'), 0)
      ) as comp_data,
      COUNT(*) as count
    FROM deals
    WHERE project_id = p_project_id
      AND competitor IS NOT NULL
      AND closed_at >= NOW() - (p_days_back || ' days')::INTERVAL
    GROUP BY competitor
    LIMIT 5
  ) competitors;

  -- Count recent losses
  SELECT COUNT(*)
  INTO v_recent_losses
  FROM deals
  WHERE project_id = p_project_id
    AND status = 'lost'
    AND closed_at >= NOW() - (p_days_back || ' days')::INTERVAL;

  RETURN QUERY SELECT
    v_total_deals,
    v_open_deals,
    v_won_deals,
    v_lost_deals,
    v_win_rate,
    v_total_revenue,
    v_revenue_won,
    v_revenue_lost,
    v_revenue_in_pipeline,
    v_top_loss_reasons,
    v_top_competitors,
    v_recent_losses,
    v_avg_deal_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update battlecard stats when deal closes
CREATE OR REPLACE FUNCTION update_battlecard_stats(p_deal_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal RECORD;
  v_battlecard_id UUID;
BEGIN
  -- Get deal details
  SELECT * INTO v_deal
  FROM deals
  WHERE id = p_deal_id;

  -- Skip if no competitor or still open
  IF v_deal.competitor IS NULL OR v_deal.status = 'open' THEN
    RETURN;
  END IF;

  -- Get or create battlecard
  INSERT INTO deal_battlecards (project_id, competitor_name, competitor_product)
  VALUES (v_deal.project_id, v_deal.competitor, v_deal.competitor_product)
  ON CONFLICT (project_id, competitor_name)
  DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_battlecard_id;

  -- Update stats
  UPDATE deal_battlecards bc
  SET
    total_deals_competing = (
      SELECT COUNT(*)::INTEGER
      FROM deals
      WHERE project_id = bc.project_id
        AND competitor = bc.competitor_name
        AND status IN ('won', 'lost')
    ),
    deals_won = (
      SELECT COUNT(*)::INTEGER
      FROM deals
      WHERE project_id = bc.project_id
        AND competitor = bc.competitor_name
        AND status = 'won'
    ),
    deals_lost = (
      SELECT COUNT(*)::INTEGER
      FROM deals
      WHERE project_id = bc.project_id
        AND competitor = bc.competitor_name
        AND status = 'lost'
    ),
    total_revenue_at_stake = (
      SELECT COALESCE(SUM(amount), 0)
      FROM deals
      WHERE project_id = bc.project_id
        AND competitor = bc.competitor_name
        AND status IN ('won', 'lost')
    ),
    revenue_won = (
      SELECT COALESCE(SUM(amount), 0)
      FROM deals
      WHERE project_id = bc.project_id
        AND competitor = bc.competitor_name
        AND status = 'won'
    ),
    revenue_lost = (
      SELECT COALESCE(SUM(amount), 0)
      FROM deals
      WHERE project_id = bc.project_id
        AND competitor = bc.competitor_name
        AND status = 'lost'
    ),
    deal_ids = (
      SELECT ARRAY_AGG(id)
      FROM deals
      WHERE project_id = bc.project_id
        AND competitor = bc.competitor_name
        AND status IN ('won', 'lost')
    ),
    last_analyzed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_battlecard_id;

  -- Update win rate
  UPDATE deal_battlecards
  SET win_rate = CASE
    WHEN (deals_won + deals_lost) > 0
    THEN ROUND((deals_won::NUMERIC / (deals_won + deals_lost)::NUMERIC * 100), 2)
    ELSE 0
  END
  WHERE id = v_battlecard_id;
END;
$$;

-- Trigger to update battlecards when deals change
CREATE OR REPLACE FUNCTION trigger_update_battlecard()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update when deal status changes to won/lost
  IF (TG_OP = 'UPDATE' AND OLD.status = 'open' AND NEW.status IN ('won', 'lost')) OR
     (TG_OP = 'INSERT' AND NEW.status IN ('won', 'lost')) THEN
    PERFORM update_battlecard_stats(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_battlecard_on_deal_close ON deals;
CREATE TRIGGER update_battlecard_on_deal_close
  AFTER INSERT OR UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_battlecard();

-- Function to find similar deals (for at-risk identification)
CREATE OR REPLACE FUNCTION find_similar_deals(
  p_deal_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  similar_deal_id UUID,
  similarity_score NUMERIC,
  deal_name TEXT,
  deal_amount NUMERIC,
  deal_status deal_status,
  competitor TEXT
) AS $$
DECLARE
  v_deal RECORD;
BEGIN
  -- Get the reference deal
  SELECT * INTO v_deal
  FROM deals
  WHERE id = p_deal_id;

  -- Find similar deals based on:
  -- 1. Same competitor
  -- 2. Similar amount (+/- 50%)
  -- 3. Similar stage
  RETURN QUERY
  SELECT
    d.id as similar_deal_id,
    (
      -- Competitor match: 40 points
      CASE WHEN d.competitor = v_deal.competitor THEN 40 ELSE 0 END +
      -- Amount similarity: 30 points max
      CASE
        WHEN d.amount BETWEEN v_deal.amount * 0.5 AND v_deal.amount * 1.5
        THEN 30 - (ABS(d.amount - v_deal.amount) / v_deal.amount * 10)
        ELSE 0
      END +
      -- Stage similarity: 20 points
      CASE WHEN d.stage = v_deal.stage THEN 20 ELSE 0 END +
      -- Notes similarity (basic text matching): 10 points
      CASE
        WHEN v_deal.notes IS NOT NULL AND d.notes IS NOT NULL
        THEN 10 * (
          SELECT COUNT(*)::NUMERIC / GREATEST(
            array_length(string_to_array(lower(v_deal.notes), ' '), 1),
            array_length(string_to_array(lower(d.notes), ' '), 1)
          )
          FROM unnest(string_to_array(lower(v_deal.notes), ' ')) AS word
          WHERE word = ANY(string_to_array(lower(d.notes), ' '))
        )
        ELSE 0
      END
    )::NUMERIC as similarity_score,
    d.name as deal_name,
    d.amount as deal_amount,
    d.status as deal_status,
    d.competitor
  FROM deals d
  WHERE d.id != p_deal_id
    AND d.project_id = v_deal.project_id
  ORDER BY similarity_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 14. Create views
-- ============================================================================

-- View for win/loss dashboard
CREATE OR REPLACE VIEW deals_dashboard_view AS
SELECT
  d.id,
  d.project_id,
  d.name,
  d.amount,
  d.stage,
  d.status,
  d.competitor,
  d.contact_name,
  d.contact_company,
  d.closed_at,
  d.created_at,
  da.id as autopsy_id,
  da.summary as autopsy_summary,
  da.primary_reason,
  da.confidence as autopsy_confidence,
  da.generated_at as autopsy_generated_at,
  CASE
    WHEN d.status = 'lost' AND da.id IS NULL THEN true
    ELSE false
  END as needs_autopsy,
  EXTRACT(EPOCH FROM (d.closed_at - d.created_at)) / 86400 as days_to_close
FROM deals d
LEFT JOIN deal_autopsies da ON da.deal_id = d.id;

-- Grant access to views and functions
GRANT SELECT ON deals_dashboard_view TO authenticated;
GRANT SELECT ON deals_dashboard_view TO service_role;

GRANT EXECUTE ON FUNCTION get_deals_overview(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_deals_overview(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION update_battlecard_stats(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION find_similar_deals(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION find_similar_deals(UUID, INTEGER) TO service_role;

-- ============================================================================
-- 15. Add comments for documentation
-- ============================================================================

COMMENT ON TABLE deals IS 'CRM deals with win/loss tracking for competitive analysis';
COMMENT ON TABLE deal_autopsies IS 'AI-generated post-mortem analysis for closed deals';
COMMENT ON TABLE deal_battlecards IS 'Competitor battle cards built from deal patterns';
COMMENT ON TABLE deal_digest_subscriptions IS 'Email/Slack subscription settings for deal digests';

COMMENT ON COLUMN deals.status IS 'Deal outcome: won (closed-won), lost (closed-lost), open (in pipeline)';
COMMENT ON COLUMN deals.competitor IS 'Primary competitor in this deal (if any)';
COMMENT ON COLUMN deals.external_id IS 'External CRM ID for bi-directional sync';

COMMENT ON COLUMN deal_autopsies.summary IS '1-page executive summary of why deal was won/lost';
COMMENT ON COLUMN deal_autopsies.primary_reason IS 'Main category of loss: pricing, features, competitor, timing, etc.';
COMMENT ON COLUMN deal_autopsies.objections IS 'Array of objection objects with category, description, and frequency';
COMMENT ON COLUMN deal_autopsies.competitor_signals IS 'Competitive intelligence extracted from deal notes';
COMMENT ON COLUMN deal_autopsies.similar_open_deal_ids IS 'Open deals at risk based on similarity analysis';

COMMENT ON COLUMN deal_battlecards.win_rate IS 'Win rate percentage against this competitor';
COMMENT ON COLUMN deal_battlecards.common_objections IS 'Most frequent objections when competing against them';
COMMENT ON COLUMN deal_battlecards.recommended_positioning IS 'AI-recommended positioning strategy';
