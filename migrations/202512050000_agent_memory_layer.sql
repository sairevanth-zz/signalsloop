-- =====================================================
-- Agent Memory Layer
-- Shared vector store so agents can persist and recall context
-- =====================================================

-- Ensure pgvector is available for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Clean reinstall helpers (safe to re-run in non-prod)
DROP TABLE IF EXISTS agent_memory CASCADE;
DROP FUNCTION IF EXISTS search_agent_memory(UUID, vector(1536), TEXT[], INTEGER, SMALLINT, FLOAT);

-- =====================================================
-- 1. Agent Memory Table
-- =====================================================
CREATE TABLE agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL, -- e.g., 'spec-writer-agent', 'triager-agent'
  memory_type TEXT NOT NULL DEFAULT 'observation' CHECK (
    memory_type IN ('observation', 'decision', 'spec_context', 'alert')
  ),
  content TEXT NOT NULL, -- Human-readable summary
  embedding vector(1536), -- Supports vector search across agent memories
  importance SMALLINT NOT NULL DEFAULT 1 CHECK (importance BETWEEN 1 AND 5),
  source_id UUID, -- Optional linked entity (spec_id, post_id, etc.)
  source_type TEXT, -- e.g., 'spec', 'post', 'event'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 2. Indexes
-- =====================================================
CREATE INDEX agent_memory_project_idx ON agent_memory(project_id, created_at DESC);
CREATE INDEX agent_memory_agent_idx ON agent_memory(agent_name);
CREATE INDEX agent_memory_importance_idx ON agent_memory(importance);
CREATE INDEX agent_memory_embedding_idx ON agent_memory USING ivfflat (embedding vector_cosine_ops);

-- =====================================================
-- 3. Row Level Security
-- =====================================================
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view agent memory for their projects" ON agent_memory
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = agent_memory.project_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create agent memory for their projects" ON agent_memory
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = agent_memory.project_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update agent memory for their projects" ON agent_memory
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = agent_memory.project_id
        AND projects.owner_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = agent_memory.project_id
        AND projects.owner_id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "Service role full access to agent_memory" ON agent_memory
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- 4. Vector Search Helper
-- =====================================================
CREATE OR REPLACE FUNCTION search_agent_memory(
  p_project_id UUID,
  p_query_embedding vector(1536),
  p_agent_names TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 8,
  p_min_importance SMALLINT DEFAULT 1,
  p_similarity_threshold FLOAT DEFAULT 0.60
)
RETURNS TABLE (
  id UUID,
  agent_name TEXT,
  memory_type TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    am.id,
    am.agent_name,
    am.memory_type,
    am.content,
    am.metadata,
    1 - (am.embedding <=> p_query_embedding) AS similarity,
    am.created_at
  FROM agent_memory am
  WHERE am.project_id = p_project_id
    AND am.embedding IS NOT NULL
    AND (p_agent_names IS NULL OR am.agent_name = ANY(p_agent_names))
    AND am.importance >= p_min_importance
    AND 1 - (am.embedding <=> p_query_embedding) >= p_similarity_threshold
  ORDER BY am.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION search_agent_memory(UUID, vector(1536), TEXT[], INTEGER, SMALLINT, FLOAT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_agent_memory(UUID, vector(1536), TEXT[], INTEGER, SMALLINT, FLOAT) TO service_role;

-- =====================================================
-- 5. Documentation
-- =====================================================
COMMENT ON TABLE agent_memory IS 'Shared vectorized memory for autonomous agents (context, decisions, summaries)';
COMMENT ON COLUMN agent_memory.agent_name IS 'Name of the agent that created the memory entry';
COMMENT ON COLUMN agent_memory.memory_type IS 'Memory category: observation, decision, spec_context, alert';
COMMENT ON COLUMN agent_memory.embedding IS 'Vector embedding of the memory content for similarity search';
COMMENT ON FUNCTION search_agent_memory IS 'Find relevant agent memory entries using vector similarity';
