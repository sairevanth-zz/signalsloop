-- Churn Radar Migration
-- Customer health scoring and churn prediction system

-- ============================================================================
-- CUSTOMER HEALTH TABLE - Detailed health metrics for each customer
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Customer identification (if not linked to customers table)
  external_id VARCHAR(255),
  email VARCHAR(255),
  name VARCHAR(255),
  company VARCHAR(255),
  
  -- Health score (0-100)
  health_score INTEGER NOT NULL DEFAULT 50,
  previous_health_score INTEGER,
  health_grade VARCHAR(1), -- 'A', 'B', 'C', 'D', 'F'
  
  -- Risk assessment
  churn_risk VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  churn_probability DECIMAL(5,4), -- 0.0000 to 1.0000
  days_until_likely_churn INTEGER,
  
  -- Health signal scores (each 0-100)
  engagement_score INTEGER DEFAULT 50,
  sentiment_score INTEGER DEFAULT 50,
  support_score INTEGER DEFAULT 50,
  product_usage_score INTEGER DEFAULT 50,
  payment_score INTEGER DEFAULT 100,
  nps_score INTEGER,
  
  -- Raw metrics
  last_login_at TIMESTAMP WITH TIME ZONE,
  days_since_login INTEGER,
  login_frequency_7d INTEGER DEFAULT 0,
  login_frequency_30d INTEGER DEFAULT 0,
  
  feature_adoption_rate DECIMAL(5,2), -- Percentage of features used
  key_features_used TEXT[] DEFAULT '{}',
  
  support_tickets_open INTEGER DEFAULT 0,
  support_tickets_30d INTEGER DEFAULT 0,
  avg_ticket_resolution_hours DECIMAL(10,2),
  last_support_contact_at TIMESTAMP WITH TIME ZONE,
  
  feedback_count_30d INTEGER DEFAULT 0,
  avg_sentiment_30d DECIMAL(3,2),
  negative_feedback_count_30d INTEGER DEFAULT 0,
  
  payment_failures_90d INTEGER DEFAULT 0,
  last_payment_failure_at TIMESTAMP WITH TIME ZONE,
  subscription_status VARCHAR(50),
  
  -- Revenue data
  mrr DECIMAL(12,2),
  arr DECIMAL(12,2),
  lifetime_value DECIMAL(12,2),
  
  -- Account details
  plan_name VARCHAR(100),
  contract_end_date DATE,
  days_until_renewal INTEGER,
  account_age_days INTEGER,
  
  -- Calculated risk factors
  risk_factors JSONB DEFAULT '[]',
  -- Example: [{"factor": "No login in 14 days", "severity": "high", "weight": 0.3}]
  
  -- Positive signals
  positive_signals JSONB DEFAULT '[]',
  -- Example: [{"signal": "Feature adoption increasing", "strength": "medium"}]
  
  -- AI-generated summary
  health_summary TEXT,
  recommended_actions JSONB DEFAULT '[]',
  
  -- Timestamps
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT customer_health_unique UNIQUE(project_id, customer_id),
  CONSTRAINT customer_health_email_unique UNIQUE(project_id, email)
);

CREATE INDEX IF NOT EXISTS idx_customer_health_project ON customer_health(project_id);
CREATE INDEX IF NOT EXISTS idx_customer_health_score ON customer_health(project_id, health_score);
CREATE INDEX IF NOT EXISTS idx_customer_health_risk ON customer_health(project_id, churn_risk);
CREATE INDEX IF NOT EXISTS idx_customer_health_customer ON customer_health(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_health_email ON customer_health(email);

-- ============================================================================
-- CUSTOMER HEALTH HISTORY TABLE - Track health score changes over time
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_health_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_health_id UUID NOT NULL REFERENCES customer_health(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  health_score INTEGER NOT NULL,
  churn_risk VARCHAR(20),
  
  -- Breakdown at this point in time
  engagement_score INTEGER,
  sentiment_score INTEGER,
  support_score INTEGER,
  product_usage_score INTEGER,
  payment_score INTEGER,
  
  -- What triggered the change
  change_reason TEXT,
  change_factors JSONB DEFAULT '[]',
  
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_history_customer ON customer_health_history(customer_health_id);
CREATE INDEX IF NOT EXISTS idx_health_history_project ON customer_health_history(project_id);
CREATE INDEX IF NOT EXISTS idx_health_history_recorded ON customer_health_history(recorded_at DESC);

-- ============================================================================
-- CHURN ALERTS TABLE - Alerts for at-risk accounts
-- ============================================================================
CREATE TABLE IF NOT EXISTS churn_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  customer_health_id UUID NOT NULL REFERENCES customer_health(id) ON DELETE CASCADE,
  
  -- Alert details
  alert_type VARCHAR(50) NOT NULL,
  -- Types: 'health_drop', 'churn_risk_increase', 'engagement_drop', 'negative_feedback', 
  --        'support_escalation', 'payment_failure', 'contract_expiring', 'competitor_mention'
  
  severity VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'
  title VARCHAR(500) NOT NULL,
  description TEXT,
  
  -- Context
  trigger_data JSONB DEFAULT '{}',
  -- Example: {"previous_score": 75, "current_score": 45, "drop_amount": 30}
  
  -- Recommended action
  recommended_action TEXT,
  action_template_id VARCHAR(50), -- For pre-defined action templates
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'new', -- 'new', 'acknowledged', 'in_progress', 'resolved', 'dismissed'
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  
  -- Revenue impact
  revenue_at_risk DECIMAL(12,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_churn_alerts_project ON churn_alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_churn_alerts_customer ON churn_alerts(customer_health_id);
CREATE INDEX IF NOT EXISTS idx_churn_alerts_status ON churn_alerts(project_id, status);
CREATE INDEX IF NOT EXISTS idx_churn_alerts_severity ON churn_alerts(project_id, severity);
CREATE INDEX IF NOT EXISTS idx_churn_alerts_type ON churn_alerts(project_id, alert_type);
CREATE INDEX IF NOT EXISTS idx_churn_alerts_created ON churn_alerts(project_id, created_at DESC);

-- ============================================================================
-- ALERT RULES TABLE - Configurable alert triggers
-- ============================================================================
CREATE TABLE IF NOT EXISTS churn_alert_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Rule type
  rule_type VARCHAR(50) NOT NULL,
  -- Types: 'health_threshold', 'health_drop', 'inactivity', 'sentiment_drop', 
  --        'support_spike', 'payment_failure', 'contract_expiring', 'custom'
  
  -- Rule conditions (JSON)
  conditions JSONB NOT NULL,
  -- Example for health_threshold: {"threshold": 40, "comparison": "lt"}
  -- Example for health_drop: {"drop_percentage": 20, "time_period_days": 7}
  -- Example for inactivity: {"days_inactive": 14}
  
  -- Alert configuration
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  alert_title_template VARCHAR(500),
  alert_description_template TEXT,
  recommended_action_template TEXT,
  
  -- Notification settings
  notify_slack BOOLEAN DEFAULT false,
  notify_email BOOLEAN DEFAULT false,
  notification_recipients JSONB DEFAULT '[]',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_project ON churn_alert_rules(project_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON churn_alert_rules(project_id, is_active);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE customer_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_health_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE churn_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE churn_alert_rules ENABLE ROW LEVEL SECURITY;

-- Customer health policies
CREATE POLICY customer_health_select ON customer_health
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY customer_health_all ON customer_health
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

-- Health history policies
CREATE POLICY health_history_select ON customer_health_history
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

-- Churn alerts policies
CREATE POLICY churn_alerts_select ON churn_alerts
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY churn_alerts_all ON churn_alerts
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

-- Alert rules policies
CREATE POLICY alert_rules_select ON churn_alert_rules
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY alert_rules_all ON churn_alert_rules
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Grant service role access
GRANT ALL ON customer_health TO service_role;
GRANT ALL ON customer_health_history TO service_role;
GRANT ALL ON churn_alerts TO service_role;
GRANT ALL ON churn_alert_rules TO service_role;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get churn radar summary
CREATE OR REPLACE FUNCTION get_churn_radar_summary(p_project_id UUID)
RETURNS TABLE (
  total_customers BIGINT,
  healthy_customers BIGINT,
  at_risk_customers BIGINT,
  critical_customers BIGINT,
  avg_health_score INTEGER,
  total_revenue_at_risk DECIMAL(12,2),
  open_alerts BIGINT,
  critical_alerts BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_customers,
    COUNT(*) FILTER (WHERE churn_risk = 'low')::BIGINT as healthy_customers,
    COUNT(*) FILTER (WHERE churn_risk IN ('medium', 'high'))::BIGINT as at_risk_customers,
    COUNT(*) FILTER (WHERE churn_risk = 'critical')::BIGINT as critical_customers,
    AVG(health_score)::INTEGER as avg_health_score,
    SUM(CASE WHEN churn_risk IN ('high', 'critical') THEN mrr ELSE 0 END)::DECIMAL(12,2) as total_revenue_at_risk,
    (SELECT COUNT(*) FROM churn_alerts WHERE project_id = p_project_id AND status NOT IN ('resolved', 'dismissed'))::BIGINT as open_alerts,
    (SELECT COUNT(*) FROM churn_alerts WHERE project_id = p_project_id AND severity = 'critical' AND status NOT IN ('resolved', 'dismissed'))::BIGINT as critical_alerts
  FROM customer_health
  WHERE project_id = p_project_id;
END;
$$ LANGUAGE plpgsql;

-- Function to score to grade
CREATE OR REPLACE FUNCTION health_score_to_grade(score INTEGER)
RETURNS VARCHAR(1) AS $$
BEGIN
  IF score >= 80 THEN RETURN 'A';
  ELSIF score >= 60 THEN RETURN 'B';
  ELSIF score >= 40 THEN RETURN 'C';
  ELSIF score >= 20 THEN RETURN 'D';
  ELSE RETURN 'F';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to determine churn risk from score
CREATE OR REPLACE FUNCTION health_score_to_risk(score INTEGER)
RETURNS VARCHAR(20) AS $$
BEGIN
  IF score >= 70 THEN RETURN 'low';
  ELSIF score >= 50 THEN RETURN 'medium';
  ELSIF score >= 30 THEN RETURN 'high';
  ELSE RETURN 'critical';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update health grade and risk when score changes
CREATE OR REPLACE FUNCTION update_health_derived_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.health_grade := health_score_to_grade(NEW.health_score);
  NEW.churn_risk := health_score_to_risk(NEW.health_score);
  NEW.updated_at := NOW();
  
  -- Record history if score changed significantly (>= 5 points)
  IF TG_OP = 'UPDATE' AND ABS(NEW.health_score - OLD.health_score) >= 5 THEN
    INSERT INTO customer_health_history (
      customer_health_id,
      project_id,
      health_score,
      churn_risk,
      engagement_score,
      sentiment_score,
      support_score,
      product_usage_score,
      payment_score,
      change_reason
    ) VALUES (
      NEW.id,
      NEW.project_id,
      NEW.health_score,
      NEW.churn_risk,
      NEW.engagement_score,
      NEW.sentiment_score,
      NEW.support_score,
      NEW.product_usage_score,
      NEW.payment_score,
      CASE 
        WHEN NEW.health_score > OLD.health_score THEN 'Health improved'
        ELSE 'Health declined'
      END
    );
    
    -- Store previous score
    NEW.previous_health_score := OLD.health_score;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customer_health_derived_update
  BEFORE INSERT OR UPDATE ON customer_health
  FOR EACH ROW
  EXECUTE FUNCTION update_health_derived_fields();
