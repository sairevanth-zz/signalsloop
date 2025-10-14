-- Vote on Behalf Feature Schema for SignalsLoop
-- Run this in your Supabase SQL Editor

-- 1. Create vote_metadata table
CREATE TABLE IF NOT EXISTS vote_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vote_id UUID NOT NULL,
  
  -- Admin who submitted the vote
  voted_by_admin_id UUID NOT NULL,
  voted_by_admin_email VARCHAR(255),
  voted_by_admin_name VARCHAR(255),
  
  -- Customer information
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_company VARCHAR(255),
  
  -- Priority and categorization
  priority VARCHAR(50) NOT NULL, -- 'must_have', 'important', 'nice_to_have'
  vote_source VARCHAR(100), -- 'sales_call', 'customer_meeting', 'support_ticket', 'conference', 'other'
  
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
CREATE INDEX IF NOT EXISTS idx_vote_metadata_vote_id ON vote_metadata(vote_id);
CREATE INDEX IF NOT EXISTS idx_vote_metadata_admin_id ON vote_metadata(voted_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_vote_metadata_customer_email ON vote_metadata(customer_email);
CREATE INDEX IF NOT EXISTS idx_vote_metadata_priority ON vote_metadata(priority);
CREATE INDEX IF NOT EXISTS idx_vote_metadata_vote_source ON vote_metadata(vote_source);
CREATE INDEX IF NOT EXISTS idx_vote_metadata_customer_company ON vote_metadata(customer_company);
CREATE INDEX IF NOT EXISTS idx_vote_metadata_verification_token ON vote_metadata(verification_token);

-- 3. Add new columns to posts table for priority vote tracking
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS must_have_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS important_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS nice_to_have_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_priority_score INTEGER DEFAULT 0;

-- 4. Create indexes on new posts columns
CREATE INDEX IF NOT EXISTS idx_posts_must_have_votes ON posts(must_have_votes);
CREATE INDEX IF NOT EXISTS idx_posts_important_votes ON posts(important_votes);
CREATE INDEX IF NOT EXISTS idx_posts_nice_to_have_votes ON posts(nice_to_have_votes);
CREATE INDEX IF NOT EXISTS idx_posts_total_priority_score ON posts(total_priority_score);

-- 5. Enable Row Level Security
ALTER TABLE vote_metadata ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for vote_metadata
-- Service role has full access
CREATE POLICY "Service role full access to vote_metadata" ON vote_metadata
  FOR ALL USING (true) WITH CHECK (true);

-- Project owners can view vote metadata for their projects
CREATE POLICY "Project owners can view vote metadata" ON vote_metadata
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM votes v
      JOIN posts p ON v.post_id = p.id
      JOIN projects pr ON p.project_id = pr.id
      WHERE v.id = vote_metadata.vote_id
      AND pr.owner_id = auth.uid()
    )
  );

-- 7. Create function to calculate priority score
CREATE OR REPLACE FUNCTION public.calculate_priority_score(
  p_must_have INTEGER,
  p_important INTEGER,
  p_nice_to_have INTEGER
)
RETURNS INTEGER AS $$
BEGIN
  -- Must Have = 10 points, Important = 5 points, Nice to Have = 2 points
  RETURN (p_must_have * 10) + (p_important * 5) + (p_nice_to_have * 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 8. Create function to update post priority counts
CREATE OR REPLACE FUNCTION public.update_post_priority_counts(p_post_id UUID)
RETURNS VOID AS $$
DECLARE
  v_must_have INTEGER;
  v_important INTEGER;
  v_nice_to_have INTEGER;
  v_total_score INTEGER;
BEGIN
  -- Count votes by priority
  SELECT 
    COALESCE(
      SUM(CASE WHEN priority = 'must_have' THEN 1 ELSE 0 END),
      0
    ),
    COALESCE(
      SUM(CASE WHEN priority = 'important' THEN 1 ELSE 0 END),
      0
    ),
    COALESCE(
      SUM(CASE WHEN priority = 'nice_to_have' THEN 1 ELSE 0 END),
      0
    )
  INTO v_must_have, v_important, v_nice_to_have
  FROM vote_metadata vm
  JOIN votes v ON vm.vote_id = v.id
  WHERE v.post_id = p_post_id;
  
  -- Calculate total priority score
  v_total_score := calculate_priority_score(v_must_have, v_important, v_nice_to_have);
  
  -- Update post
  UPDATE posts SET
    must_have_votes = v_must_have,
    important_votes = v_important,
    nice_to_have_votes = v_nice_to_have,
    total_priority_score = v_total_score,
    updated_at = NOW()
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to generate verification token
CREATE OR REPLACE FUNCTION public.generate_verification_token()
RETURNS VARCHAR(255) AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to get customer vote history
CREATE OR REPLACE FUNCTION public.get_customer_vote_history(
  p_customer_email VARCHAR(255),
  p_project_id UUID
)
RETURNS TABLE (
  post_id UUID,
  post_title VARCHAR(255),
  priority VARCHAR(50),
  vote_source VARCHAR(100),
  voted_at TIMESTAMP WITH TIME ZONE,
  voted_by_admin_name VARCHAR(255)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS post_id,
    p.title AS post_title,
    vm.priority,
    vm.vote_source,
    vm.created_at AS voted_at,
    vm.voted_by_admin_name
  FROM vote_metadata vm
  JOIN votes v ON vm.vote_id = v.id
  JOIN posts p ON v.post_id = p.id
  WHERE vm.customer_email = p_customer_email
  AND p.project_id = p_project_id
  ORDER BY vm.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create function to get company vote insights
CREATE OR REPLACE FUNCTION public.get_company_vote_insights(
  p_customer_company VARCHAR(255),
  p_project_id UUID
)
RETURNS TABLE (
  total_votes INTEGER,
  must_have_count INTEGER,
  important_count INTEGER,
  nice_to_have_count INTEGER,
  unique_features INTEGER,
  top_priority_feature VARCHAR(255)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER AS total_votes,
    COUNT(*) FILTER (WHERE vm.priority = 'must_have')::INTEGER AS must_have_count,
    COUNT(*) FILTER (WHERE vm.priority = 'important')::INTEGER AS important_count,
    COUNT(*) FILTER (WHERE vm.priority = 'nice_to_have')::INTEGER AS nice_to_have_count,
    COUNT(DISTINCT v.post_id)::INTEGER AS unique_features,
    (
      SELECT p.title 
      FROM vote_metadata vm2
      JOIN votes v2 ON vm2.vote_id = v2.id
      JOIN posts p ON v2.post_id = p.id
      WHERE vm2.customer_company = p_customer_company
      AND p.project_id = p_project_id
      AND vm2.priority = 'must_have'
      ORDER BY vm2.created_at DESC
      LIMIT 1
    ) AS top_priority_feature
  FROM vote_metadata vm
  JOIN votes v ON vm.vote_id = v.id
  JOIN posts p ON v.post_id = p.id
  WHERE vm.customer_company = p_customer_company
  AND p.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create trigger for updated_at on vote_metadata
CREATE OR REPLACE FUNCTION public.update_vote_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vote_metadata_updated_at ON vote_metadata;
CREATE TRIGGER update_vote_metadata_updated_at
  BEFORE UPDATE ON vote_metadata
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_vote_metadata_updated_at();

-- 13. Create view for admin dashboard
CREATE OR REPLACE VIEW admin_priority_votes AS
SELECT 
  p.id AS post_id,
  p.title AS post_title,
  p.status,
  p.project_id,
  COUNT(v.id) AS total_votes,
  p.must_have_votes,
  p.important_votes,
  p.nice_to_have_votes,
  p.total_priority_score,
  COUNT(DISTINCT vm.customer_company) FILTER (WHERE vm.customer_company IS NOT NULL) AS unique_companies,
  COUNT(DISTINCT vm.customer_email) AS unique_customers,
  p.created_at,
  p.updated_at
FROM posts p
LEFT JOIN votes v ON p.id = v.post_id
LEFT JOIN vote_metadata vm ON v.id = vm.vote_id
GROUP BY p.id, p.title, p.status, p.project_id, p.must_have_votes, p.important_votes, p.nice_to_have_votes, p.total_priority_score, p.created_at, p.updated_at;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Vote on Behalf schema created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created/modified:';
  RAISE NOTICE '  - vote_metadata (new)';
  RAISE NOTICE '  - posts (added priority columns)';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - calculate_priority_score()';
  RAISE NOTICE '  - update_post_priority_counts()';
  RAISE NOTICE '  - get_customer_vote_history()';
  RAISE NOTICE '  - get_company_vote_insights()';
  RAISE NOTICE '  - generate_verification_token()';
  RAISE NOTICE '';
  RAISE NOTICE 'Views created:';
  RAISE NOTICE '  - admin_priority_votes';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Vote on Behalf feature is ready!';
END $$;
