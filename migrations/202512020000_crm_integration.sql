-- CRM Integration Migration
-- Adds support for Salesforce and HubSpot integration with customer enrichment
-- Enables revenue-based prioritization of feedback and features

-- ============================================================================
-- 1. Create customer_profiles table (stores enriched customer data from CRM)
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Identity (matches with feedback author)
  email TEXT NOT NULL,
  external_customer_id TEXT, -- CRM's customer/account ID
  name TEXT,
  company_name TEXT,

  -- Revenue & Segment Data (THE KEY INSIGHT)
  mrr DECIMAL(10,2), -- Monthly Recurring Revenue
  arr DECIMAL(10,2), -- Annual Recurring Revenue
  lifetime_value DECIMAL(10,2),
  plan_tier TEXT, -- e.g., 'free', 'starter', 'pro', 'enterprise'
  segment TEXT, -- e.g., 'smb', 'mid-market', 'enterprise'

  -- Account status
  status TEXT CHECK (status IN ('active', 'churned', 'trial', 'lead')),
  health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
  churn_risk TEXT CHECK (churn_risk IN ('low', 'medium', 'high', 'critical')),

  -- CRM metadata
  crm_provider TEXT CHECK (crm_provider IN ('salesforce', 'hubspot', 'custom')),
  crm_url TEXT, -- Direct link to customer in CRM
  crm_data JSONB DEFAULT '{}'::jsonb, -- Full CRM record for debugging

  -- Contact info
  account_owner TEXT, -- Sales rep or CSM name
  account_owner_email TEXT,

  -- Company data
  industry TEXT,
  company_size TEXT,
  location TEXT,

  -- Dates
  customer_since TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one profile per email per project
  UNIQUE(project_id, email)
);

-- ============================================================================
-- 2. Extend integration_credentials to support CRM providers
-- ============================================================================
-- Update CHECK constraint to include salesforce and hubspot
ALTER TABLE integration_credentials
  DROP CONSTRAINT IF EXISTS integration_credentials_provider_check;

ALTER TABLE integration_credentials
  ADD CONSTRAINT integration_credentials_provider_check
  CHECK (provider IN ('launchdarkly', 'optimizely', 'salesforce', 'hubspot', 'custom'));

-- ============================================================================
-- 3. Create customer_sync_log table (track CRM sync history)
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Sync details
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental', 'manual', 'webhook')),
  provider TEXT NOT NULL CHECK (provider IN ('salesforce', 'hubspot', 'custom')),

  -- Results
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  customers_synced INTEGER DEFAULT 0,
  customers_created INTEGER DEFAULT 0,
  customers_updated INTEGER DEFAULT 0,
  error_message TEXT,

  -- Response data
  raw_response JSONB,

  -- Metadata
  synced_by UUID,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. Link feedback to customer profiles
-- ============================================================================
-- Add customer_profile_id to discovered_feedback
ALTER TABLE discovered_feedback
  ADD COLUMN IF NOT EXISTS customer_profile_id UUID REFERENCES customer_profiles(id) ON DELETE SET NULL;

-- Add customer enrichment fields directly to discovered_feedback for quick access
ALTER TABLE discovered_feedback
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_company TEXT,
  ADD COLUMN IF NOT EXISTS customer_segment TEXT,
  ADD COLUMN IF NOT EXISTS customer_mrr DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS customer_plan_tier TEXT;

-- ============================================================================
-- 5. Add indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_customer_profiles_project_id ON customer_profiles(project_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_email ON customer_profiles(email);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_external_id ON customer_profiles(external_customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_segment ON customer_profiles(segment);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_plan_tier ON customer_profiles(plan_tier);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_mrr ON customer_profiles(mrr DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_churn_risk ON customer_profiles(churn_risk);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_status ON customer_profiles(status);

CREATE INDEX IF NOT EXISTS idx_customer_sync_log_project_id ON customer_sync_log(project_id);
CREATE INDEX IF NOT EXISTS idx_customer_sync_log_synced_at ON customer_sync_log(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_sync_log_status ON customer_sync_log(status);

CREATE INDEX IF NOT EXISTS idx_discovered_feedback_customer_profile ON discovered_feedback(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_discovered_feedback_customer_segment ON discovered_feedback(customer_segment);
CREATE INDEX IF NOT EXISTS idx_discovered_feedback_customer_mrr ON discovered_feedback(customer_mrr DESC NULLS LAST);

-- ============================================================================
-- 6. Enable Row Level Security
-- ============================================================================
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_sync_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. RLS Policies for customer_profiles
-- ============================================================================
DROP POLICY IF EXISTS "Project owners can manage customer profiles" ON customer_profiles;
CREATE POLICY "Project owners can manage customer profiles" ON customer_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = customer_profiles.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to customer profiles" ON customer_profiles;
CREATE POLICY "Service role full access to customer profiles" ON customer_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 8. RLS Policies for customer_sync_log
-- ============================================================================
DROP POLICY IF EXISTS "Users can view sync logs for their projects" ON customer_sync_log;
CREATE POLICY "Users can view sync logs for their projects" ON customer_sync_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = customer_sync_log.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can insert sync logs" ON customer_sync_log;
CREATE POLICY "Service role can insert sync logs" ON customer_sync_log
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 9. Helper functions
-- ============================================================================

-- Enrich feedback with customer data (call after creating/updating customer profile)
CREATE OR REPLACE FUNCTION enrich_feedback_with_customer_data(
  p_project_id UUID,
  p_email TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Update discovered_feedback with customer data
  UPDATE discovered_feedback df
  SET
    customer_profile_id = cp.id,
    customer_email = cp.email,
    customer_company = cp.company_name,
    customer_segment = cp.segment,
    customer_mrr = cp.mrr,
    customer_plan_tier = cp.plan_tier
  FROM customer_profiles cp
  WHERE df.project_id = p_project_id
    AND cp.project_id = p_project_id
    AND cp.email = p_email
    AND (
      -- Match by email in author_username or author_metadata
      LOWER(df.author_username) = LOWER(p_email)
      OR LOWER(df.author_metadata->>'email') = LOWER(p_email)
    );

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get or create customer profile
CREATE OR REPLACE FUNCTION upsert_customer_profile(
  p_project_id UUID,
  p_email TEXT,
  p_external_id TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_company_name TEXT DEFAULT NULL,
  p_mrr DECIMAL DEFAULT NULL,
  p_arr DECIMAL DEFAULT NULL,
  p_plan_tier TEXT DEFAULT NULL,
  p_segment TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'active',
  p_crm_provider TEXT DEFAULT NULL,
  p_crm_url TEXT DEFAULT NULL,
  p_crm_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Upsert customer profile
  INSERT INTO customer_profiles (
    project_id,
    email,
    external_customer_id,
    name,
    company_name,
    mrr,
    arr,
    plan_tier,
    segment,
    status,
    crm_provider,
    crm_url,
    crm_data,
    last_synced_at
  ) VALUES (
    p_project_id,
    LOWER(p_email),
    p_external_id,
    p_name,
    p_company_name,
    p_mrr,
    p_arr,
    p_plan_tier,
    p_segment,
    p_status,
    p_crm_provider,
    p_crm_url,
    p_crm_data,
    NOW()
  )
  ON CONFLICT (project_id, email)
  DO UPDATE SET
    external_customer_id = COALESCE(EXCLUDED.external_customer_id, customer_profiles.external_customer_id),
    name = COALESCE(EXCLUDED.name, customer_profiles.name),
    company_name = COALESCE(EXCLUDED.company_name, customer_profiles.company_name),
    mrr = COALESCE(EXCLUDED.mrr, customer_profiles.mrr),
    arr = COALESCE(EXCLUDED.arr, customer_profiles.arr),
    plan_tier = COALESCE(EXCLUDED.plan_tier, customer_profiles.plan_tier),
    segment = COALESCE(EXCLUDED.segment, customer_profiles.segment),
    status = EXCLUDED.status,
    crm_provider = COALESCE(EXCLUDED.crm_provider, customer_profiles.crm_provider),
    crm_url = COALESCE(EXCLUDED.crm_url, customer_profiles.crm_url),
    crm_data = COALESCE(EXCLUDED.crm_data, customer_profiles.crm_data),
    last_synced_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_profile_id;

  -- Enrich related feedback
  PERFORM enrich_feedback_with_customer_data(p_project_id, LOWER(p_email));

  RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get revenue-prioritized feedback (highest MRR customers first)
CREATE OR REPLACE FUNCTION get_revenue_prioritized_feedback(
  p_project_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  feedback_id UUID,
  content TEXT,
  customer_email TEXT,
  customer_company TEXT,
  customer_mrr DECIMAL,
  customer_segment TEXT,
  customer_plan_tier TEXT,
  created_at TIMESTAMPTZ
) AS $$
  SELECT
    df.id as feedback_id,
    df.content,
    df.customer_email,
    df.customer_company,
    df.customer_mrr,
    df.customer_segment,
    df.customer_plan_tier,
    df.created_at
  FROM discovered_feedback df
  WHERE df.project_id = p_project_id
    AND df.classification = 'feature_request'
    AND df.customer_profile_id IS NOT NULL
  ORDER BY
    -- Priority: enterprise > mid-market > smb
    CASE df.customer_segment
      WHEN 'enterprise' THEN 3
      WHEN 'mid-market' THEN 2
      WHEN 'smb' THEN 1
      ELSE 0
    END DESC,
    -- Then by MRR (highest first)
    df.customer_mrr DESC NULLS LAST,
    -- Then by recency
    df.created_at DESC
  LIMIT p_limit;
$$ LANGUAGE SQL STABLE;

-- Record customer sync
CREATE OR REPLACE FUNCTION record_customer_sync(
  p_project_id UUID,
  p_sync_type TEXT,
  p_provider TEXT,
  p_status TEXT,
  p_customers_synced INTEGER DEFAULT 0,
  p_customers_created INTEGER DEFAULT 0,
  p_customers_updated INTEGER DEFAULT 0,
  p_error_message TEXT DEFAULT NULL,
  p_raw_response JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO customer_sync_log (
    project_id,
    sync_type,
    provider,
    status,
    customers_synced,
    customers_created,
    customers_updated,
    error_message,
    raw_response
  ) VALUES (
    p_project_id,
    p_sync_type,
    p_provider,
    p_status,
    p_customers_synced,
    p_customers_created,
    p_customers_updated,
    p_error_message,
    p_raw_response
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. Triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_customer_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_customer_profiles_updated_at ON customer_profiles;
CREATE TRIGGER trigger_update_customer_profiles_updated_at
  BEFORE UPDATE ON customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_profiles_updated_at();

-- Auto-enrich feedback when customer profile is created/updated
CREATE OR REPLACE FUNCTION trigger_enrich_feedback_on_customer_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM enrich_feedback_with_customer_data(NEW.project_id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_customer_profile_changed ON customer_profiles;
CREATE TRIGGER trigger_customer_profile_changed
  AFTER INSERT OR UPDATE ON customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_enrich_feedback_on_customer_change();

-- ============================================================================
-- 11. Comments
-- ============================================================================

COMMENT ON TABLE customer_profiles IS 'Enriched customer data from Salesforce/HubSpot for revenue-based prioritization';
COMMENT ON TABLE customer_sync_log IS 'Audit log of customer data synchronization from CRM systems';
COMMENT ON COLUMN customer_profiles.mrr IS 'Monthly Recurring Revenue - KEY metric for prioritization';
COMMENT ON COLUMN customer_profiles.segment IS 'Customer segment (smb/mid-market/enterprise) - used for prioritization';
COMMENT ON COLUMN discovered_feedback.customer_mrr IS 'Denormalized MRR for quick filtering without JOIN';
COMMENT ON FUNCTION get_revenue_prioritized_feedback IS 'Returns feedback sorted by customer revenue (enterprise > MRR > recency)';

-- ============================================================================
-- Migration complete
-- ============================================================================
