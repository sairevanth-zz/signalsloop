-- Spec Writer Agent Migration
-- Creates tables for AI-generated Product Requirements Documents (PRDs)

-- ============================================================================
-- 0. Enable pgvector extension for vector similarity search
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 1. Drop existing objects if they exist (for clean migration)
-- ============================================================================
DROP TABLE IF EXISTS spec_context_sources CASCADE;
DROP TABLE IF EXISTS spec_embeddings CASCADE;
DROP TABLE IF EXISTS spec_versions CASCADE;
DROP TABLE IF EXISTS specs CASCADE;
DROP FUNCTION IF EXISTS update_specs_timestamp() CASCADE;

-- ============================================================================
-- 2. Create specs table for storing generated PRDs
-- ============================================================================
CREATE TABLE specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Content
  title VARCHAR(500) NOT NULL,
  input_idea TEXT, -- Original one-line idea
  content TEXT NOT NULL, -- Generated/edited PRD content (Markdown)

  -- Metadata
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'archived')),
  template VARCHAR(100) DEFAULT 'standard', -- Which template was used

  -- AI Generation metadata
  generation_model VARCHAR(100) DEFAULT 'gpt-4o',
  generation_tokens INTEGER,
  generation_time_ms INTEGER,
  context_sources JSONB DEFAULT '[]', -- Array of source IDs used for RAG

  -- Feedback linkage
  linked_feedback_ids UUID[] DEFAULT '{}', -- Feedback items this spec addresses

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  -- Search
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) STORED
);

-- ============================================================================
-- 3. Create indexes for performance
-- ============================================================================

-- Index for full-text search
CREATE INDEX specs_search_idx ON specs USING GIN(search_vector);

-- Index for project lookups
CREATE INDEX specs_project_idx ON specs(project_id, created_at DESC);

-- Index for user's specs
CREATE INDEX specs_user_idx ON specs(created_by, created_at DESC);

-- Index for status filtering
CREATE INDEX specs_status_idx ON specs(status, created_at DESC);

-- Index for feedback linkage (GIN index for array contains operations)
CREATE INDEX specs_feedback_ids_idx ON specs USING GIN(linked_feedback_ids);

-- ============================================================================
-- 4. Create spec_versions for history tracking
-- ============================================================================
CREATE TABLE spec_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_id UUID NOT NULL REFERENCES specs(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  change_summary VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX spec_versions_spec_idx ON spec_versions(spec_id, version_number DESC);

-- ============================================================================
-- 5. Create spec_embeddings for similarity search (RAG)
-- ============================================================================
CREATE TABLE spec_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_id UUID NOT NULL REFERENCES specs(id) ON DELETE CASCADE,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  content_hash VARCHAR(64), -- To detect if re-embedding needed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX spec_embeddings_idx ON spec_embeddings USING ivfflat (embedding vector_cosine_ops);

-- ============================================================================
-- 6. Create spec_context_sources (stores what was retrieved during generation)
-- ============================================================================
CREATE TABLE spec_context_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_id UUID NOT NULL REFERENCES specs(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL, -- 'feedback', 'past_spec', 'competitor', 'persona'
  source_id UUID NOT NULL,
  relevance_score FLOAT,
  content_preview TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX spec_context_sources_spec_idx ON spec_context_sources(spec_id);
CREATE INDEX spec_context_sources_type_idx ON spec_context_sources(source_type);

-- ============================================================================
-- 7. Enable Row Level Security
-- ============================================================================
ALTER TABLE specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE spec_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE spec_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE spec_context_sources ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8. RLS Policies for specs
-- ============================================================================

-- Users can view specs from their projects
CREATE POLICY "Users can view specs for their projects" ON specs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = specs.project_id AND projects.owner_id = auth.uid()
    )
  );

-- Users can create specs in their projects
CREATE POLICY "Users can create specs in their projects" ON specs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = specs.project_id AND projects.owner_id = auth.uid()
    )
  );

-- Users can update specs in their projects
CREATE POLICY "Users can update specs in their projects" ON specs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = specs.project_id AND projects.owner_id = auth.uid()
    )
  );

-- Users can delete specs in their projects
CREATE POLICY "Users can delete specs in their projects" ON specs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = specs.project_id AND projects.owner_id = auth.uid()
    )
  );

-- Service role full access to specs
CREATE POLICY "Service role full access to specs" ON specs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 9. RLS Policies for spec_versions
-- ============================================================================

CREATE POLICY "Users can view spec versions for their projects" ON spec_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM specs
      JOIN projects ON specs.project_id = projects.id
      WHERE specs.id = spec_versions.spec_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create spec versions for their projects" ON spec_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM specs
      JOIN projects ON specs.project_id = projects.id
      WHERE specs.id = spec_versions.spec_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Service role full access to spec_versions
CREATE POLICY "Service role full access to spec_versions" ON spec_versions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 10. RLS Policies for spec_embeddings
-- ============================================================================

CREATE POLICY "Users can view spec embeddings for their projects" ON spec_embeddings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM specs
      JOIN projects ON specs.project_id = projects.id
      WHERE specs.id = spec_embeddings.spec_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create spec embeddings for their projects" ON spec_embeddings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM specs
      JOIN projects ON specs.project_id = projects.id
      WHERE specs.id = spec_embeddings.spec_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Service role full access to spec_embeddings
CREATE POLICY "Service role full access to spec_embeddings" ON spec_embeddings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 11. RLS Policies for spec_context_sources
-- ============================================================================

CREATE POLICY "Users can view context sources for their projects" ON spec_context_sources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM specs
      JOIN projects ON specs.project_id = projects.id
      WHERE specs.id = spec_context_sources.spec_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create context sources for their projects" ON spec_context_sources
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM specs
      JOIN projects ON specs.project_id = projects.id
      WHERE specs.id = spec_context_sources.spec_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Service role full access to spec_context_sources
CREATE POLICY "Service role full access to spec_context_sources" ON spec_context_sources
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 12. Create trigger for updated_at timestamp
-- ============================================================================
CREATE FUNCTION update_specs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_specs_timestamp_trigger
  BEFORE UPDATE ON specs
  FOR EACH ROW
  EXECUTE FUNCTION update_specs_timestamp();

-- ============================================================================
-- 13. Add comments for documentation
-- ============================================================================
COMMENT ON TABLE specs IS 'AI-generated Product Requirements Documents (PRDs) from the Spec Writer agent';
COMMENT ON COLUMN specs.title IS 'Title of the spec/feature';
COMMENT ON COLUMN specs.input_idea IS 'Original one-line idea provided by user';
COMMENT ON COLUMN specs.content IS 'Full PRD content in Markdown format';
COMMENT ON COLUMN specs.status IS 'Spec status: draft, review, approved, archived';
COMMENT ON COLUMN specs.template IS 'Template used for generation: standard, feature-launch, bug-fix, api-spec';
COMMENT ON COLUMN specs.generation_model IS 'AI model used for generation (e.g., gpt-4o)';
COMMENT ON COLUMN specs.generation_tokens IS 'Total tokens used during generation';
COMMENT ON COLUMN specs.generation_time_ms IS 'Time taken to generate spec in milliseconds';
COMMENT ON COLUMN specs.context_sources IS 'JSONB array of context source metadata used during RAG';
COMMENT ON COLUMN specs.linked_feedback_ids IS 'Array of feedback item UUIDs this spec addresses';
COMMENT ON COLUMN specs.search_vector IS 'Full-text search vector for title and content';

COMMENT ON TABLE spec_versions IS 'Version history for spec edits';
COMMENT ON TABLE spec_embeddings IS 'Vector embeddings for spec similarity search (RAG)';
COMMENT ON TABLE spec_context_sources IS 'Sources retrieved during spec generation (feedback, past specs, competitors, personas)';

-- ============================================================================
-- 14. Create vector search functions for RAG
-- ============================================================================

-- Function to search for similar specs using vector similarity
CREATE OR REPLACE FUNCTION search_similar_specs(
  p_project_id UUID,
  p_query_embedding vector(1536),
  p_limit INTEGER DEFAULT 10,
  p_similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  spec_id UUID,
  title VARCHAR(500),
  preview TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS spec_id,
    s.title,
    LEFT(s.content, 500) AS preview,
    1 - (se.embedding <=> p_query_embedding) AS similarity,
    s.created_at
  FROM spec_embeddings se
  JOIN specs s ON s.id = se.spec_id
  WHERE s.project_id = p_project_id
    AND 1 - (se.embedding <=> p_query_embedding) >= p_similarity_threshold
    AND s.status != 'archived' -- Exclude archived specs
  ORDER BY se.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search for similar feedback using vector similarity
CREATE OR REPLACE FUNCTION search_similar_feedback(
  p_project_id UUID,
  p_query_embedding vector(1536),
  p_limit INTEGER DEFAULT 10,
  p_similarity_threshold FLOAT DEFAULT 0.65
)
RETURNS TABLE (
  post_id UUID,
  content TEXT,
  votes INTEGER,
  segment VARCHAR(50),
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS post_id,
    p.content,
    COALESCE(p.upvotes, 0) AS votes,
    p.classification AS segment,
    1 - (pe.embedding <=> p_query_embedding) AS similarity
  FROM posts_embeddings pe
  JOIN posts p ON p.id = pe.post_id
  WHERE p.project_id = p_project_id
    AND 1 - (pe.embedding <=> p_query_embedding) >= p_similarity_threshold
  ORDER BY pe.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on search functions
GRANT EXECUTE ON FUNCTION search_similar_specs(UUID, vector(1536), INTEGER, FLOAT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_similar_specs(UUID, vector(1536), INTEGER, FLOAT) TO service_role;
GRANT EXECUTE ON FUNCTION search_similar_feedback(UUID, vector(1536), INTEGER, FLOAT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_similar_feedback(UUID, vector(1536), INTEGER, FLOAT) TO service_role;

-- Add comments for functions
COMMENT ON FUNCTION search_similar_specs IS 'Search for similar specs using vector similarity (for RAG context retrieval)';
COMMENT ON FUNCTION search_similar_feedback IS 'Search for similar feedback using vector similarity (for RAG context retrieval)';
