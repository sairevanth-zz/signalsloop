-- Universal Feedback Inbox Migration
-- Creates tables for unified feedback collection from multiple sources

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CUSTOMERS TABLE - Unified customer view across all sources
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Primary identity
  email VARCHAR(255),
  name VARCHAR(255),
  company VARCHAR(255),
  avatar_url TEXT,
  
  -- Source identities (link all their accounts)
  -- Example: {"slack": "U123ABC", "intercom": "user_456", "discord": "user#1234"}
  identities JSONB DEFAULT '{}',
  
  -- Aggregated metrics
  total_feedback_count INTEGER DEFAULT 0,
  average_sentiment DECIMAL(3,2) DEFAULT 0,
  last_feedback_at TIMESTAMP WITH TIME ZONE,
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- CRM enrichment (from HubSpot/Salesforce)
  crm_id VARCHAR(255),
  crm_source VARCHAR(50), -- 'hubspot', 'salesforce'
  mrr DECIMAL(12,2),
  arr DECIMAL(12,2),
  plan_name VARCHAR(100),
  customer_since TIMESTAMP WITH TIME ZONE,
  
  -- Health indicators
  health_score INTEGER, -- 0-100, calculated separately
  churn_risk VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT customers_project_email_unique UNIQUE(project_id, email)
);

-- Indexes for customers
CREATE INDEX IF NOT EXISTS idx_customers_project_id ON customers(project_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_health_score ON customers(project_id, health_score);
CREATE INDEX IF NOT EXISTS idx_customers_churn_risk ON customers(project_id, churn_risk);
CREATE INDEX IF NOT EXISTS idx_customers_identities ON customers USING GIN(identities);

-- ============================================================================
-- FEEDBACK INTEGRATIONS TABLE - Configuration for each connected source
-- ============================================================================
CREATE TABLE IF NOT EXISTS feedback_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Integration type
  integration_type VARCHAR(50) NOT NULL, 
  -- Values: 'slack', 'discord', 'intercom', 'zendesk', 'email_gmail', 'email_outlook',
  --         'twitter', 'g2', 'app_store', 'play_store', 'reddit', 'producthunt',
  --         'hackernews', 'typeform', 'widget'
  
  -- Display info
  display_name VARCHAR(255),
  icon_url TEXT,
  
  -- Credentials (encrypted in practice)
  credentials JSONB DEFAULT '{}',
  -- Example for Intercom: {"access_token": "xxx", "workspace_id": "yyy"}
  -- Example for Gmail: {"refresh_token": "xxx", "email": "inbox@company.com"}
  
  -- Configuration
  config JSONB DEFAULT '{}',
  -- Example: {"channels": ["feedback", "support"], "keywords": ["bug", "feature"]}
  
  -- Sync settings
  sync_enabled BOOLEAN DEFAULT true,
  sync_frequency_minutes INTEGER DEFAULT 15,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status VARCHAR(20), -- 'success', 'failed', 'partial'
  last_sync_error TEXT,
  last_sync_items_count INTEGER DEFAULT 0,
  
  -- Stats
  total_items_synced INTEGER DEFAULT 0,
  total_items_this_month INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_connected BOOLEAN DEFAULT false,
  connection_verified_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT feedback_integrations_unique UNIQUE(project_id, integration_type)
);

-- Indexes for feedback_integrations
CREATE INDEX IF NOT EXISTS idx_feedback_integrations_project ON feedback_integrations(project_id);
CREATE INDEX IF NOT EXISTS idx_feedback_integrations_type ON feedback_integrations(integration_type);
CREATE INDEX IF NOT EXISTS idx_feedback_integrations_active ON feedback_integrations(project_id, is_active);

-- ============================================================================
-- UNIFIED FEEDBACK ITEMS TABLE - All feedback from all sources
-- ============================================================================
CREATE TABLE IF NOT EXISTS unified_feedback_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES feedback_integrations(id) ON DELETE SET NULL,
  
  -- Source identification
  source_type VARCHAR(50) NOT NULL,
  source_id VARCHAR(500), -- Original ID in source system (can be long for URLs)
  source_url TEXT, -- Link back to original
  source_channel VARCHAR(255), -- e.g., Slack channel name, email inbox, subreddit
  source_thread_id VARCHAR(255), -- For threaded conversations
  
  -- Content
  title TEXT,
  content TEXT NOT NULL,
  content_html TEXT, -- Preserved formatting if available
  content_plain TEXT, -- Stripped text for search
  language VARCHAR(10) DEFAULT 'en',
  
  -- Author information
  author_id VARCHAR(255),
  author_name VARCHAR(255),
  author_email VARCHAR(255),
  author_username VARCHAR(255),
  author_avatar_url TEXT,
  author_metadata JSONB DEFAULT '{}', -- Platform-specific author info
  
  -- Customer linking
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  -- AI Classification
  category VARCHAR(50), -- 'bug', 'feature_request', 'praise', 'complaint', 'question', 'churn_risk', 'other'
  category_confidence DECIMAL(3,2),
  sentiment_score DECIMAL(3,2), -- -1 to +1
  sentiment_label VARCHAR(20), -- 'positive', 'negative', 'neutral', 'mixed'
  urgency_score INTEGER CHECK (urgency_score BETWEEN 1 AND 5), -- 1-5
  urgency_reason TEXT,
  
  -- AI-generated tags
  tags TEXT[] DEFAULT '{}',
  ai_summary TEXT, -- One-line AI summary
  
  -- Deduplication
  content_hash VARCHAR(64), -- SHA-256 for exact duplicate detection
  embedding vector(1536), -- For semantic similarity (if pgvector enabled)
  duplicate_of UUID REFERENCES unified_feedback_items(id) ON DELETE SET NULL,
  duplicate_confidence DECIMAL(3,2),
  is_duplicate BOOLEAN DEFAULT false,
  
  -- Engagement metrics from source
  engagement_metrics JSONB DEFAULT '{}',
  -- Example: {"likes": 10, "replies": 3, "shares": 2, "upvotes": 50}
  engagement_score INTEGER DEFAULT 0, -- Normalized score
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'new', 
  -- Values: 'new', 'read', 'starred', 'replied', 'archived', 'converted', 'spam'
  starred BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  read_by UUID REFERENCES auth.users(id),
  
  -- Reply tracking
  replied_at TIMESTAMP WITH TIME ZONE,
  replied_by UUID REFERENCES auth.users(id),
  reply_content TEXT,
  reply_sent_via VARCHAR(50), -- Where reply was sent
  
  -- Conversion tracking (when converted to a formal feedback post)
  converted_to_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  converted_at TIMESTAMP WITH TIME ZONE,
  converted_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  original_created_at TIMESTAMP WITH TIME ZONE NOT NULL, -- When created in source
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE, -- When AI processing completed
  
  -- Search
  search_vector tsvector
);

-- Indexes for unified_feedback_items
CREATE INDEX IF NOT EXISTS idx_ufi_project_id ON unified_feedback_items(project_id);
CREATE INDEX IF NOT EXISTS idx_ufi_source_type ON unified_feedback_items(project_id, source_type);
CREATE INDEX IF NOT EXISTS idx_ufi_status ON unified_feedback_items(project_id, status);
CREATE INDEX IF NOT EXISTS idx_ufi_category ON unified_feedback_items(project_id, category);
CREATE INDEX IF NOT EXISTS idx_ufi_sentiment ON unified_feedback_items(project_id, sentiment_score);
CREATE INDEX IF NOT EXISTS idx_ufi_urgency ON unified_feedback_items(project_id, urgency_score DESC);
CREATE INDEX IF NOT EXISTS idx_ufi_customer ON unified_feedback_items(customer_id);
CREATE INDEX IF NOT EXISTS idx_ufi_source_id ON unified_feedback_items(project_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_ufi_content_hash ON unified_feedback_items(project_id, content_hash);
CREATE INDEX IF NOT EXISTS idx_ufi_original_created ON unified_feedback_items(project_id, original_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ufi_imported ON unified_feedback_items(project_id, imported_at DESC);
CREATE INDEX IF NOT EXISTS idx_ufi_starred ON unified_feedback_items(project_id, starred) WHERE starred = true;
CREATE INDEX IF NOT EXISTS idx_ufi_search ON unified_feedback_items USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_ufi_tags ON unified_feedback_items USING GIN(tags);

-- Full-text search trigger
CREATE OR REPLACE FUNCTION update_ufi_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content_plain, NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.author_name, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ufi_search_vector_update
  BEFORE INSERT OR UPDATE ON unified_feedback_items
  FOR EACH ROW
  EXECUTE FUNCTION update_ufi_search_vector();

-- ============================================================================
-- SYNC LOGS TABLE - Track sync operations
-- ============================================================================
CREATE TABLE IF NOT EXISTS inbox_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES feedback_integrations(id) ON DELETE CASCADE,
  
  sync_type VARCHAR(20) NOT NULL, -- 'scheduled', 'manual', 'webhook'
  status VARCHAR(20) NOT NULL, -- 'started', 'completed', 'failed'
  
  items_found INTEGER DEFAULT 0,
  items_imported INTEGER DEFAULT 0,
  items_duplicates INTEGER DEFAULT 0,
  items_errors INTEGER DEFAULT 0,
  
  error_message TEXT,
  error_details JSONB,
  
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_project ON inbox_sync_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_integration ON inbox_sync_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON inbox_sync_logs(started_at DESC);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update customer stats when feedback is added
CREATE OR REPLACE FUNCTION update_customer_feedback_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    UPDATE customers SET
      total_feedback_count = (
        SELECT COUNT(*) FROM unified_feedback_items 
        WHERE customer_id = NEW.customer_id AND is_duplicate = false
      ),
      average_sentiment = (
        SELECT AVG(sentiment_score) FROM unified_feedback_items 
        WHERE customer_id = NEW.customer_id AND sentiment_score IS NOT NULL AND is_duplicate = false
      ),
      last_feedback_at = NEW.original_created_at,
      updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_stats_on_feedback
  AFTER INSERT ON unified_feedback_items
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_feedback_stats();

-- Function to resolve customer by email
CREATE OR REPLACE FUNCTION resolve_or_create_customer(
  p_project_id UUID,
  p_email VARCHAR(255),
  p_name VARCHAR(255) DEFAULT NULL,
  p_source_type VARCHAR(50) DEFAULT NULL,
  p_source_id VARCHAR(255) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_customer_id UUID;
  v_identities JSONB;
BEGIN
  -- Try to find existing customer by email
  SELECT id, identities INTO v_customer_id, v_identities
  FROM customers
  WHERE project_id = p_project_id AND email = p_email
  LIMIT 1;
  
  IF v_customer_id IS NOT NULL THEN
    -- Update identities if new source provided
    IF p_source_type IS NOT NULL AND p_source_id IS NOT NULL THEN
      v_identities := COALESCE(v_identities, '{}'::JSONB) || jsonb_build_object(p_source_type, p_source_id);
      UPDATE customers SET identities = v_identities, updated_at = NOW()
      WHERE id = v_customer_id;
    END IF;
    RETURN v_customer_id;
  END IF;
  
  -- Create new customer
  v_identities := CASE 
    WHEN p_source_type IS NOT NULL AND p_source_id IS NOT NULL 
    THEN jsonb_build_object(p_source_type, p_source_id)
    ELSE '{}'::JSONB
  END;
  
  INSERT INTO customers (project_id, email, name, identities)
  VALUES (p_project_id, p_email, p_name, v_identities)
  RETURNING id INTO v_customer_id;
  
  RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get inbox stats
CREATE OR REPLACE FUNCTION get_inbox_stats(p_project_id UUID)
RETURNS TABLE (
  total_items BIGINT,
  new_items BIGINT,
  unread_items BIGINT,
  starred_items BIGINT,
  items_today BIGINT,
  items_this_week BIGINT,
  avg_sentiment DECIMAL(3,2),
  by_category JSONB,
  by_source JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_items,
    COUNT(*) FILTER (WHERE status = 'new')::BIGINT as new_items,
    COUNT(*) FILTER (WHERE read_at IS NULL)::BIGINT as unread_items,
    COUNT(*) FILTER (WHERE starred = true)::BIGINT as starred_items,
    COUNT(*) FILTER (WHERE imported_at >= CURRENT_DATE)::BIGINT as items_today,
    COUNT(*) FILTER (WHERE imported_at >= CURRENT_DATE - INTERVAL '7 days')::BIGINT as items_this_week,
    AVG(sentiment_score)::DECIMAL(3,2) as avg_sentiment,
    (
      SELECT jsonb_object_agg(category, cnt)
      FROM (
        SELECT category, COUNT(*)::INTEGER as cnt
        FROM unified_feedback_items
        WHERE project_id = p_project_id AND is_duplicate = false AND category IS NOT NULL
        GROUP BY category
      ) cat_counts
    ) as by_category,
    (
      SELECT jsonb_object_agg(source_type, cnt)
      FROM (
        SELECT source_type, COUNT(*)::INTEGER as cnt
        FROM unified_feedback_items
        WHERE project_id = p_project_id AND is_duplicate = false
        GROUP BY source_type
      ) source_counts
    ) as by_source
  FROM unified_feedback_items
  WHERE project_id = p_project_id AND is_duplicate = false;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_feedback_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_sync_logs ENABLE ROW LEVEL SECURITY;

-- Customers policies
CREATE POLICY customers_select ON customers
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY customers_insert ON customers
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY customers_update ON customers
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

-- Feedback integrations policies
CREATE POLICY integrations_select ON feedback_integrations
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY integrations_all ON feedback_integrations
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Unified feedback items policies
CREATE POLICY ufi_select ON unified_feedback_items
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY ufi_insert ON unified_feedback_items
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY ufi_update ON unified_feedback_items
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

-- Sync logs policies
CREATE POLICY sync_logs_select ON inbox_sync_logs
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

-- Grant service role full access for background jobs
GRANT ALL ON customers TO service_role;
GRANT ALL ON feedback_integrations TO service_role;
GRANT ALL ON unified_feedback_items TO service_role;
GRANT ALL ON inbox_sync_logs TO service_role;
