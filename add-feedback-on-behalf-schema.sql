-- Feedback on Behalf Feature Schema for SignalsLoop
-- Run this in your Supabase SQL Editor

-- 1. Create feedback_metadata table
CREATE TABLE IF NOT EXISTS feedback_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

  -- Admin who submitted the feedback
  submitted_by_admin_id UUID NOT NULL,
  submitted_by_admin_email VARCHAR(255),
  submitted_by_admin_name VARCHAR(255),

  -- Customer information
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_company VARCHAR(255),

  -- Priority and categorization
  priority VARCHAR(50) NOT NULL, -- 'must_have', 'important', 'nice_to_have'
  feedback_source VARCHAR(100), -- 'sales_call', 'customer_meeting', 'support_ticket', 'conference', 'email', 'other'

  -- Internal notes (private, admin-only)
  internal_note TEXT,

  -- Customer notification
  customer_notified BOOLEAN DEFAULT FALSE,
  customer_notified_at TIMESTAMP WITH TIME ZONE,

  -- Verification (optional)
  verified_by_customer BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_token VARCHAR(255) UNIQUE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_metadata_post_id ON feedback_metadata(post_id);
CREATE INDEX IF NOT EXISTS idx_feedback_metadata_admin_id ON feedback_metadata(submitted_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_feedback_metadata_customer_email ON feedback_metadata(customer_email);
CREATE INDEX IF NOT EXISTS idx_feedback_metadata_priority ON feedback_metadata(priority);
CREATE INDEX IF NOT EXISTS idx_feedback_metadata_feedback_source ON feedback_metadata(feedback_source);
CREATE INDEX IF NOT EXISTS idx_feedback_metadata_customer_company ON feedback_metadata(customer_company);
CREATE INDEX IF NOT EXISTS idx_feedback_metadata_verification_token ON feedback_metadata(verification_token);
CREATE INDEX IF NOT EXISTS idx_feedback_metadata_created_at ON feedback_metadata(created_at);

-- 3. Enable Row Level Security
ALTER TABLE feedback_metadata ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for feedback_metadata
-- Service role has full access
CREATE POLICY "Service role full access to feedback_metadata" ON feedback_metadata
  FOR ALL USING (true) WITH CHECK (true);

-- Project owners can view feedback metadata for their projects
CREATE POLICY "Project owners can view feedback metadata" ON feedback_metadata
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN projects pr ON p.project_id = pr.id
      WHERE p.id = feedback_metadata.post_id
      AND pr.owner_id = auth.uid()
    )
  );

-- Project owners can insert feedback metadata for their projects
CREATE POLICY "Project owners can insert feedback metadata" ON feedback_metadata
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN projects pr ON p.project_id = pr.id
      WHERE p.id = feedback_metadata.post_id
      AND pr.owner_id = auth.uid()
    )
  );

-- Project owners can update their feedback metadata
CREATE POLICY "Project owners can update feedback metadata" ON feedback_metadata
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN projects pr ON p.project_id = pr.id
      WHERE p.id = feedback_metadata.post_id
      AND pr.owner_id = auth.uid()
    )
  );

-- 5. Create trigger for updated_at on feedback_metadata
CREATE OR REPLACE FUNCTION public.update_feedback_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_feedback_metadata_updated_at ON feedback_metadata;
CREATE TRIGGER update_feedback_metadata_updated_at
  BEFORE UPDATE ON feedback_metadata
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_feedback_metadata_updated_at();

-- 6. Create function to get customer feedback history
CREATE OR REPLACE FUNCTION public.get_customer_feedback_history(
  p_customer_email VARCHAR(255),
  p_project_id UUID
)
RETURNS TABLE (
  post_id UUID,
  post_title VARCHAR(255),
  post_description TEXT,
  priority VARCHAR(50),
  feedback_source VARCHAR(100),
  submitted_at TIMESTAMP WITH TIME ZONE,
  submitted_by_admin_name VARCHAR(255),
  status VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS post_id,
    p.title AS post_title,
    p.description AS post_description,
    fm.priority,
    fm.feedback_source,
    fm.created_at AS submitted_at,
    fm.submitted_by_admin_name,
    p.status
  FROM feedback_metadata fm
  JOIN posts p ON fm.post_id = p.id
  WHERE fm.customer_email = p_customer_email
  AND p.project_id = p_project_id
  ORDER BY fm.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to get company feedback insights
CREATE OR REPLACE FUNCTION public.get_company_feedback_insights(
  p_customer_company VARCHAR(255),
  p_project_id UUID
)
RETURNS TABLE (
  total_feedback INTEGER,
  must_have_count INTEGER,
  important_count INTEGER,
  nice_to_have_count INTEGER,
  unique_features INTEGER,
  top_priority_feature VARCHAR(255)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_feedback,
    COUNT(*) FILTER (WHERE fm.priority = 'must_have')::INTEGER AS must_have_count,
    COUNT(*) FILTER (WHERE fm.priority = 'important')::INTEGER AS important_count,
    COUNT(*) FILTER (WHERE fm.priority = 'nice_to_have')::INTEGER AS nice_to_have_count,
    COUNT(DISTINCT fm.post_id)::INTEGER AS unique_features,
    (
      SELECT p.title
      FROM feedback_metadata fm2
      JOIN posts p ON fm2.post_id = p.id
      WHERE fm2.customer_company = p_customer_company
      AND p.project_id = p_project_id
      AND fm2.priority = 'must_have'
      ORDER BY fm2.created_at DESC
      LIMIT 1
    ) AS top_priority_feature
  FROM feedback_metadata fm
  JOIN posts p ON fm.post_id = p.id
  WHERE fm.customer_company = p_customer_company
  AND p.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create view for admin dashboard
CREATE OR REPLACE VIEW admin_feedback_on_behalf AS
SELECT
  p.id AS post_id,
  p.title AS post_title,
  p.description AS post_description,
  p.status,
  p.project_id,
  pr.name AS project_name,
  pr.slug AS project_slug,
  COUNT(fm.id) AS total_feedback_count,
  COUNT(*) FILTER (WHERE fm.priority = 'must_have') AS must_have_count,
  COUNT(*) FILTER (WHERE fm.priority = 'important') AS important_count,
  COUNT(*) FILTER (WHERE fm.priority = 'nice_to_have') AS nice_to_have_count,
  COUNT(DISTINCT fm.customer_company) FILTER (WHERE fm.customer_company IS NOT NULL) AS unique_companies,
  COUNT(DISTINCT fm.customer_email) AS unique_customers,
  p.created_at,
  p.updated_at
FROM posts p
JOIN projects pr ON p.project_id = pr.id
LEFT JOIN feedback_metadata fm ON p.id = fm.post_id
GROUP BY p.id, p.title, p.description, p.status, p.project_id, pr.name, pr.slug, p.created_at, p.updated_at;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Feedback on Behalf schema created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - feedback_metadata (new)';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - get_customer_feedback_history()';
  RAISE NOTICE '  - get_company_feedback_insights()';
  RAISE NOTICE '';
  RAISE NOTICE 'Views created:';
  RAISE NOTICE '  - admin_feedback_on_behalf';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Feedback on Behalf feature is ready!';
END $$;
