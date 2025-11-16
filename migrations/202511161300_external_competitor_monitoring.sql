-- External Competitor Monitoring (G2, Capterra, TrustRadius)
-- Migration: 202511161300_external_competitor_monitoring.sql
-- Purpose: Monitor competitor reviews from external platforms

-- ============================================================================
-- TABLES
-- ============================================================================

-- Track competitor products to monitor on external platforms
CREATE TABLE IF NOT EXISTS competitor_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Product identification
  product_name TEXT NOT NULL,
  company_name TEXT NOT NULL,

  -- Platform-specific identifiers
  g2_product_id TEXT,
  g2_url TEXT,
  capterra_product_id TEXT,
  capterra_url TEXT,
  trustradius_product_id TEXT,
  trustradius_url TEXT,

  -- Monitoring configuration
  is_active BOOLEAN DEFAULT true,
  monitoring_enabled BOOLEAN DEFAULT true,
  platforms TEXT[] DEFAULT ARRAY['g2', 'capterra', 'trustradius'],

  -- Metadata
  category TEXT,
  description TEXT,
  logo_url TEXT,

  -- Sync status
  last_synced_at TIMESTAMPTZ,
  last_sync_error TEXT,
  total_reviews_synced INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store scraped reviews from external platforms
CREATE TABLE IF NOT EXISTS competitor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_product_id UUID NOT NULL REFERENCES competitor_products(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Review identification
  platform TEXT NOT NULL CHECK (platform IN ('g2', 'capterra', 'trustradius')),
  external_review_id TEXT NOT NULL,

  -- Review content
  title TEXT,
  content TEXT NOT NULL,
  rating DECIMAL(3,2), -- e.g., 4.5
  reviewer_name TEXT,
  reviewer_role TEXT,
  reviewer_company_size TEXT,

  -- Review metadata
  published_at TIMESTAMPTZ,
  verified_reviewer BOOLEAN DEFAULT false,
  incentivized_review BOOLEAN DEFAULT false,

  -- AI-extracted data
  sentiment_score DECIMAL(3,2), -- -1 to 1
  sentiment_category TEXT CHECK (sentiment_category IN ('positive', 'negative', 'neutral', 'mixed')),
  mentioned_features TEXT[], -- Array of feature names mentioned
  pros TEXT[],
  cons TEXT[],
  use_cases TEXT[],

  -- Processing status
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  ai_extracted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure uniqueness per platform
  UNIQUE(platform, external_review_id)
);

-- Extracted features from competitor reviews
CREATE TABLE IF NOT EXISTS competitor_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_product_id UUID NOT NULL REFERENCES competitor_products(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Feature details
  feature_name TEXT NOT NULL,
  feature_category TEXT,
  description TEXT,

  -- Aggregated metrics
  mention_count INTEGER DEFAULT 0,
  positive_mentions INTEGER DEFAULT 0,
  negative_mentions INTEGER DEFAULT 0,
  avg_sentiment DECIMAL(3,2), -- Average sentiment across all mentions

  -- Associated reviews
  review_ids UUID[], -- References to competitor_reviews

  -- Detection
  first_detected_at TIMESTAMPTZ DEFAULT NOW(),
  last_mentioned_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique features per product
  UNIQUE(competitor_product_id, feature_name)
);

-- Competitor strengths (highly praised features)
CREATE TABLE IF NOT EXISTS competitor_strengths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_product_id UUID NOT NULL REFERENCES competitor_products(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Strength details
  feature_name TEXT NOT NULL,
  strength_category TEXT, -- e.g., "UI/UX", "Integration", "Performance"
  description TEXT,

  -- Metrics
  praise_count INTEGER DEFAULT 0, -- Number of reviews praising this
  avg_rating DECIMAL(3,2), -- Average rating when this is mentioned
  confidence_score DECIMAL(3,2), -- AI confidence that this is a strength

  -- Evidence
  sample_quotes TEXT[], -- Representative quotes from reviews
  review_ids UUID[], -- Supporting reviews

  -- Tracking
  first_identified_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitor weaknesses (commonly criticized features)
CREATE TABLE IF NOT EXISTS competitor_weaknesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_product_id UUID NOT NULL REFERENCES competitor_products(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Weakness details
  feature_name TEXT NOT NULL,
  weakness_category TEXT, -- e.g., "Pricing", "Support", "Missing Feature"
  description TEXT,

  -- Metrics
  complaint_count INTEGER DEFAULT 0, -- Number of reviews criticizing this
  avg_rating DECIMAL(3,2), -- Average rating when this is mentioned
  severity_score DECIMAL(3,2), -- How severe/frequent is this complaint
  confidence_score DECIMAL(3,2), -- AI confidence that this is a weakness

  -- Evidence
  sample_quotes TEXT[], -- Representative quotes from reviews
  review_ids UUID[], -- Supporting reviews

  -- Opportunity assessment
  opportunity_score DECIMAL(3,2), -- How much opportunity does this create for you
  strategic_importance TEXT CHECK (strategic_importance IN ('critical', 'high', 'medium', 'low')),

  -- Tracking
  first_identified_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts for new competitor features
CREATE TABLE IF NOT EXISTS competitor_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  competitor_product_id UUID NOT NULL REFERENCES competitor_products(id) ON DELETE CASCADE,

  -- Alert details
  alert_type TEXT NOT NULL CHECK (alert_type IN ('new_feature', 'new_strength', 'new_weakness', 'rating_change', 'review_spike')),
  title TEXT NOT NULL,
  description TEXT,

  -- Data
  feature_name TEXT,
  old_value TEXT,
  new_value TEXT,
  severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',

  -- Associated data
  review_ids UUID[],
  feature_id UUID REFERENCES competitor_features(id) ON DELETE SET NULL,

  -- Status
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  actioned BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_competitor_products_project ON competitor_products(project_id);
CREATE INDEX idx_competitor_products_active ON competitor_products(is_active) WHERE is_active = true;
CREATE INDEX idx_competitor_reviews_product ON competitor_reviews(competitor_product_id);
CREATE INDEX idx_competitor_reviews_project ON competitor_reviews(project_id);
CREATE INDEX idx_competitor_reviews_platform ON competitor_reviews(platform);
CREATE INDEX idx_competitor_reviews_published ON competitor_reviews(published_at DESC);
CREATE INDEX idx_competitor_reviews_processed ON competitor_reviews(processed) WHERE processed = false;
CREATE INDEX idx_competitor_features_product ON competitor_features(competitor_product_id);
CREATE INDEX idx_competitor_features_mentions ON competitor_features(mention_count DESC);
CREATE INDEX idx_competitor_strengths_product ON competitor_strengths(competitor_product_id);
CREATE INDEX idx_competitor_weaknesses_product ON competitor_weaknesses(competitor_product_id);
CREATE INDEX idx_competitor_alerts_project ON competitor_alerts(project_id);
CREATE INDEX idx_competitor_alerts_unread ON competitor_alerts(is_read) WHERE is_read = false;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE competitor_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_strengths ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_weaknesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_alerts ENABLE ROW LEVEL SECURITY;

-- Policies for competitor_products
CREATE POLICY competitor_products_select ON competitor_products
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY competitor_products_insert ON competitor_products
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

CREATE POLICY competitor_products_update ON competitor_products
  FOR UPDATE USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

CREATE POLICY competitor_products_delete ON competitor_products
  FOR DELETE USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- Policies for competitor_reviews
CREATE POLICY competitor_reviews_select ON competitor_reviews
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

-- Policies for competitor_features
CREATE POLICY competitor_features_select ON competitor_features
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

-- Policies for competitor_strengths
CREATE POLICY competitor_strengths_select ON competitor_strengths
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

-- Policies for competitor_weaknesses
CREATE POLICY competitor_weaknesses_select ON competitor_weaknesses
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

-- Policies for competitor_alerts
CREATE POLICY competitor_alerts_select ON competitor_alerts
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY competitor_alerts_update ON competitor_alerts
  FOR UPDATE USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Aggregated competitor product overview
CREATE OR REPLACE VIEW competitor_products_overview AS
SELECT
  cp.id,
  cp.project_id,
  cp.product_name,
  cp.company_name,
  cp.is_active,
  cp.monitoring_enabled,
  cp.platforms,
  cp.last_synced_at,

  -- Review counts
  COUNT(DISTINCT cr.id) as total_reviews,
  COUNT(DISTINCT cr.id) FILTER (WHERE cr.platform = 'g2') as g2_reviews,
  COUNT(DISTINCT cr.id) FILTER (WHERE cr.platform = 'capterra') as capterra_reviews,
  COUNT(DISTINCT cr.id) FILTER (WHERE cr.platform = 'trustradius') as trustradius_reviews,

  -- Average ratings
  AVG(cr.rating) as avg_rating,
  AVG(cr.rating) FILTER (WHERE cr.platform = 'g2') as avg_g2_rating,
  AVG(cr.rating) FILTER (WHERE cr.platform = 'capterra') as avg_capterra_rating,
  AVG(cr.rating) FILTER (WHERE cr.platform = 'trustradius') as avg_trustradius_rating,

  -- Feature counts
  COUNT(DISTINCT cf.id) as features_identified,
  COUNT(DISTINCT cs.id) as strengths_identified,
  COUNT(DISTINCT cw.id) as weaknesses_identified,

  -- Recent activity
  MAX(cr.published_at) as latest_review_date,
  COUNT(DISTINCT cr.id) FILTER (WHERE cr.published_at >= NOW() - INTERVAL '30 days') as reviews_last_30_days

FROM competitor_products cp
LEFT JOIN competitor_reviews cr ON cr.competitor_product_id = cp.id
LEFT JOIN competitor_features cf ON cf.competitor_product_id = cp.id
LEFT JOIN competitor_strengths cs ON cs.competitor_product_id = cp.id
LEFT JOIN competitor_weaknesses cw ON cw.competitor_product_id = cp.id
GROUP BY cp.id;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Get competitor product analytics
CREATE OR REPLACE FUNCTION get_competitor_product_analytics(p_product_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'product_info', (
      SELECT row_to_json(cp) FROM competitor_products cp WHERE cp.id = p_product_id
    ),
    'review_stats', (
      SELECT json_build_object(
        'total_reviews', COUNT(*),
        'avg_rating', AVG(rating),
        'sentiment_breakdown', json_build_object(
          'positive', COUNT(*) FILTER (WHERE sentiment_category = 'positive'),
          'negative', COUNT(*) FILTER (WHERE sentiment_category = 'negative'),
          'neutral', COUNT(*) FILTER (WHERE sentiment_category = 'neutral'),
          'mixed', COUNT(*) FILTER (WHERE sentiment_category = 'mixed')
        ),
        'platform_breakdown', json_build_object(
          'g2', COUNT(*) FILTER (WHERE platform = 'g2'),
          'capterra', COUNT(*) FILTER (WHERE platform = 'capterra'),
          'trustradius', COUNT(*) FILTER (WHERE platform = 'trustradius')
        )
      )
      FROM competitor_reviews WHERE competitor_product_id = p_product_id
    ),
    'top_features', (
      SELECT json_agg(row_to_json(cf))
      FROM (
        SELECT * FROM competitor_features
        WHERE competitor_product_id = p_product_id
        ORDER BY mention_count DESC
        LIMIT 10
      ) cf
    ),
    'strengths', (
      SELECT json_agg(row_to_json(cs))
      FROM (
        SELECT * FROM competitor_strengths
        WHERE competitor_product_id = p_product_id
        ORDER BY praise_count DESC
        LIMIT 10
      ) cs
    ),
    'weaknesses', (
      SELECT json_agg(row_to_json(cw))
      FROM (
        SELECT * FROM competitor_weaknesses
        WHERE competitor_product_id = p_product_id
        ORDER BY complaint_count DESC
        LIMIT 10
      ) cw
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update competitor feature metrics (call after processing reviews)
CREATE OR REPLACE FUNCTION update_competitor_feature_metrics(p_product_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Update mention counts and sentiment
  UPDATE competitor_features cf
  SET
    mention_count = (
      SELECT COUNT(*)
      FROM competitor_reviews cr
      WHERE cr.competitor_product_id = p_product_id
        AND cf.feature_name = ANY(cr.mentioned_features)
    ),
    positive_mentions = (
      SELECT COUNT(*)
      FROM competitor_reviews cr
      WHERE cr.competitor_product_id = p_product_id
        AND cf.feature_name = ANY(cr.mentioned_features)
        AND cr.sentiment_category IN ('positive', 'mixed')
    ),
    negative_mentions = (
      SELECT COUNT(*)
      FROM competitor_reviews cr
      WHERE cr.competitor_product_id = p_product_id
        AND cf.feature_name = ANY(cr.mentioned_features)
        AND cr.sentiment_category IN ('negative', 'mixed')
    ),
    last_mentioned_at = (
      SELECT MAX(cr.published_at)
      FROM competitor_reviews cr
      WHERE cr.competitor_product_id = p_product_id
        AND cf.feature_name = ANY(cr.mentioned_features)
    ),
    updated_at = NOW()
  WHERE cf.competitor_product_id = p_product_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE competitor_products IS 'Competitor products to monitor on external review platforms';
COMMENT ON TABLE competitor_reviews IS 'Scraped reviews from G2, Capterra, TrustRadius';
COMMENT ON TABLE competitor_features IS 'Features extracted from competitor reviews';
COMMENT ON TABLE competitor_strengths IS 'Highly praised features (competitive strengths)';
COMMENT ON TABLE competitor_weaknesses IS 'Commonly criticized features (competitive weaknesses)';
COMMENT ON TABLE competitor_alerts IS 'Alerts for new competitor features and changes';
