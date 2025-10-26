-- Dev Database Sync Script
-- Use this in Supabase SQL editor to align new environments with production schema.

------------------------------------------------------------
-- Priority voting + vote metadata (copied from prod setup)
------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.discord_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL,
  guild_name TEXT,
  channel_id TEXT,
  channel_name TEXT,
  webhook_id TEXT NOT NULL,
  webhook_token TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  application_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS discord_integrations_project_id_idx
  ON public.discord_integrations(project_id);

CREATE TABLE IF NOT EXISTS public.discord_integration_states (
  state TEXT PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID,
  redirect_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS discord_integration_states_project_id_idx
  ON public.discord_integration_states(project_id);

CREATE TABLE IF NOT EXISTS public.vote_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vote_id UUID NOT NULL,
  voted_by_admin_id UUID NOT NULL,
  voted_by_admin_email VARCHAR(255),
  voted_by_admin_name VARCHAR(255),
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_company VARCHAR(255),
  priority VARCHAR(50) NOT NULL,
  vote_source VARCHAR(100),
  internal_note TEXT,
  customer_notified BOOLEAN DEFAULT FALSE,
  customer_notified_at TIMESTAMPTZ,
  verified_by_customer BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verification_token VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vote_metadata_vote_id ON public.vote_metadata(vote_id);
CREATE INDEX IF NOT EXISTS idx_vote_metadata_admin_id ON public.vote_metadata(voted_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_vote_metadata_customer_email ON public.vote_metadata(customer_email);
CREATE INDEX IF NOT EXISTS idx_vote_metadata_priority ON public.vote_metadata(priority);
CREATE INDEX IF NOT EXISTS idx_vote_metadata_vote_source ON public.vote_metadata(vote_source);
CREATE INDEX IF NOT EXISTS idx_vote_metadata_customer_company ON public.vote_metadata(customer_company);
CREATE INDEX IF NOT EXISTS idx_vote_metadata_verification_token ON public.vote_metadata(verification_token);

ALTER TABLE public.vote_metadata ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vote_metadata'
      AND policyname = 'Service role full access to vote_metadata'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Service role full access to vote_metadata" ON public.vote_metadata
        FOR ALL USING (true) WITH CHECK (true);
    $pol$;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vote_metadata'
      AND policyname = 'Project owners can view vote metadata'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Project owners can view vote metadata" ON public.vote_metadata
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM votes v
            JOIN posts p ON v.post_id = p.id
            JOIN projects pr ON p.project_id = pr.id
            WHERE v.id = vote_metadata.vote_id
            AND pr.owner_id = auth.uid()
          )
        );
    $pol$;
  END IF;
END;
$$;

------------------------------------------------------------
-- Ensure votes table has required columns/indexes
------------------------------------------------------------

ALTER TABLE public.votes
  ADD COLUMN IF NOT EXISTS voter_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS voter_email TEXT,
  ADD COLUMN IF NOT EXISTS anonymous_id TEXT,
  ADD COLUMN IF NOT EXISTS priority VARCHAR(50)
    CHECK (priority IN ('must_have', 'important', 'nice_to_have'))
    DEFAULT 'important';

UPDATE public.votes
SET priority = COALESCE(priority, 'important')
WHERE priority IS NULL;

CREATE INDEX IF NOT EXISTS idx_votes_voter_hash ON public.votes(voter_hash);
CREATE INDEX IF NOT EXISTS idx_votes_post_voter ON public.votes(post_id, voter_hash);
CREATE INDEX IF NOT EXISTS idx_votes_anonymous_id ON public.votes(anonymous_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'votes'
      AND indexname = 'idx_votes_post_anonymous_unique'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_votes_post_anonymous_unique ON public.votes(post_id, anonymous_id) WHERE anonymous_id IS NOT NULL';
  END IF;
END;
$$;

------------------------------------------------------------
-- Add priority columns to posts
------------------------------------------------------------

ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS must_have_votes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS important_votes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nice_to_have_votes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_priority_score INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_posts_must_have_votes ON public.posts(must_have_votes);
CREATE INDEX IF NOT EXISTS idx_posts_important_votes ON public.posts(important_votes);
CREATE INDEX IF NOT EXISTS idx_posts_nice_to_have_votes ON public.posts(nice_to_have_votes);
CREATE INDEX IF NOT EXISTS idx_posts_total_priority_score ON public.posts(total_priority_score);

------------------------------------------------------------
-- Priority score helper functions
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.calculate_priority_score(
  p_must_have INTEGER,
  p_important INTEGER,
  p_nice_to_have INTEGER
) RETURNS INTEGER AS $$
BEGIN
  RETURN (p_must_have * 10) + (p_important * 5) + (p_nice_to_have * 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.update_post_priority_counts(p_post_id UUID)
RETURNS VOID AS $$
DECLARE
  v_must_have INTEGER;
  v_important INTEGER;
  v_nice_to_have INTEGER;
  v_total_score INTEGER;
BEGIN
  SELECT 
    COALESCE(
      SUM(
        CASE
          WHEN COALESCE(v.priority, vm.priority) = 'must_have' THEN 1
          ELSE 0
        END
      ),
      0
    ),
    COALESCE(
      SUM(
        CASE
          WHEN COALESCE(v.priority, vm.priority) = 'important' THEN 1
          ELSE 0
        END
      ),
      0
    ),
    COALESCE(
      SUM(
        CASE
          WHEN COALESCE(v.priority, vm.priority) = 'nice_to_have' THEN 1
          ELSE 0
        END
      ),
      0
    )
  INTO v_must_have, v_important, v_nice_to_have
  FROM votes v
  LEFT JOIN vote_metadata vm ON vm.vote_id = v.id
  WHERE v.post_id = p_post_id;
  
  v_total_score := calculate_priority_score(v_must_have, v_important, v_nice_to_have);
  
  UPDATE posts SET
    must_have_votes = v_must_have,
    important_votes = v_important,
    nice_to_have_votes = v_nice_to_have,
    total_priority_score = v_total_score,
    updated_at = NOW()
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: recompute counts for existing posts
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM posts LOOP
    PERFORM update_post_priority_counts(rec.id);
  END LOOP;
END $$;

------------------------------------------------------------
-- Fix participants helper function cast issues
------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_post_participants(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.get_post_participants(
  p_post_id UUID,
  p_search_term TEXT DEFAULT NULL
) RETURNS TABLE (
  email TEXT,
  name TEXT,
  participation_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH all_participants AS (
    SELECT
      p.author_email::TEXT as email,
      p.author_name::TEXT as name,
      1::BIGINT as count
    FROM posts p
    WHERE p.id = p_post_id
      AND p.author_email IS NOT NULL

    UNION ALL

    SELECT
      c.author_email::TEXT as email,
      c.author_name::TEXT as name,
      COUNT(*)::BIGINT as count
    FROM comments c
    WHERE c.post_id = p_post_id
      AND c.author_email IS NOT NULL
    GROUP BY c.author_email, c.author_name
  )
  SELECT
    ap.email,
    MAX(ap.name) as name,
    SUM(ap.count) as participation_count
  FROM all_participants ap
  WHERE ap.email IS NOT NULL
    AND (
      p_search_term IS NULL
      OR ap.email ILIKE '%' || p_search_term || '%'
      OR ap.name ILIKE '%' || p_search_term || '%'
    )
  GROUP BY ap.email
  ORDER BY participation_count DESC, name ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_post_participants(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_participants(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_post_participants(UUID, TEXT) TO service_role;
