-- Expand Vector Embeddings Beyond Feedback
-- Adds embeddings for roadmap items, competitors, personas, and product documents

-- Ensure pgvector is available
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- Base Tables (Personas & Product Docs) - lightweight defaults if missing
-- ============================================================================

CREATE TABLE IF NOT EXISTS personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  description TEXT NOT NULL,
  goals TEXT,
  pain_points TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, name)
);

CREATE INDEX IF NOT EXISTS personas_project_idx ON personas(project_id);

CREATE OR REPLACE FUNCTION update_personas_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_personas_updated_at ON personas;
CREATE TRIGGER trigger_personas_updated_at
BEFORE UPDATE ON personas
FOR EACH ROW
EXECUTE FUNCTION update_personas_updated_at();

ALTER TABLE personas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view personas for their projects" ON personas;
CREATE POLICY "Users can view personas for their projects" ON personas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = personas.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage personas for their projects" ON personas;
CREATE POLICY "Users can manage personas for their projects" ON personas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = personas.project_id
      AND projects.owner_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = personas.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to personas" ON personas;
CREATE POLICY "Service role full access to personas" ON personas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE personas IS 'User personas captured for context-aware generation and search';

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS product_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  doc_type TEXT DEFAULT 'internal' CHECK (doc_type IN ('internal', 'spec', 'support', 'runbook', 'api', 'other')),
  content TEXT NOT NULL,
  summary TEXT,
  source_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'C')
  ) STORED
);

CREATE INDEX IF NOT EXISTS product_documents_project_idx ON product_documents(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS product_documents_search_idx ON product_documents USING GIN(search_vector);

CREATE OR REPLACE FUNCTION update_product_documents_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_product_documents_updated_at ON product_documents;
CREATE TRIGGER trigger_product_documents_updated_at
BEFORE UPDATE ON product_documents
FOR EACH ROW
EXECUTE FUNCTION update_product_documents_updated_at();

ALTER TABLE product_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view product documents for their projects" ON product_documents;
CREATE POLICY "Users can view product documents for their projects" ON product_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = product_documents.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage product documents for their projects" ON product_documents;
CREATE POLICY "Users can manage product documents for their projects" ON product_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = product_documents.project_id
      AND projects.owner_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = product_documents.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to product documents" ON product_documents;
CREATE POLICY "Service role full access to product documents" ON product_documents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE product_documents IS 'Internal product documents, specs, and runbooks used for RAG';

-- ============================================================================
-- Embedding Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS roadmap_item_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_item_id UUID NOT NULL REFERENCES roadmap_suggestions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  embedding vector(1536),
  content_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(roadmap_item_id)
);

CREATE INDEX IF NOT EXISTS roadmap_item_embeddings_hnsw_idx ON roadmap_item_embeddings
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS roadmap_item_embeddings_project_idx ON roadmap_item_embeddings(project_id);
CREATE INDEX IF NOT EXISTS roadmap_item_embeddings_item_idx ON roadmap_item_embeddings(roadmap_item_id);

ALTER TABLE roadmap_item_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view roadmap embeddings for their projects" ON roadmap_item_embeddings;
CREATE POLICY "Users can view roadmap embeddings for their projects" ON roadmap_item_embeddings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = roadmap_item_embeddings.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage roadmap embeddings for their projects" ON roadmap_item_embeddings;
CREATE POLICY "Users can manage roadmap embeddings for their projects" ON roadmap_item_embeddings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = roadmap_item_embeddings.project_id
      AND projects.owner_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = roadmap_item_embeddings.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to roadmap embeddings" ON roadmap_item_embeddings;
CREATE POLICY "Service role full access to roadmap embeddings" ON roadmap_item_embeddings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE roadmap_item_embeddings IS 'Vector embeddings for roadmap suggestions';

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS competitor_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  embedding vector(1536),
  content_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(competitor_id)
);

CREATE INDEX IF NOT EXISTS competitor_embeddings_hnsw_idx ON competitor_embeddings
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS competitor_embeddings_project_idx ON competitor_embeddings(project_id);
CREATE INDEX IF NOT EXISTS competitor_embeddings_competitor_idx ON competitor_embeddings(competitor_id);

ALTER TABLE competitor_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view competitor embeddings for their projects" ON competitor_embeddings;
CREATE POLICY "Users can view competitor embeddings for their projects" ON competitor_embeddings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = competitor_embeddings.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage competitor embeddings for their projects" ON competitor_embeddings;
CREATE POLICY "Users can manage competitor embeddings for their projects" ON competitor_embeddings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = competitor_embeddings.project_id
      AND projects.owner_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = competitor_embeddings.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to competitor embeddings" ON competitor_embeddings;
CREATE POLICY "Service role full access to competitor embeddings" ON competitor_embeddings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE competitor_embeddings IS 'Vector embeddings for competitor intelligence records';

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS persona_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  embedding vector(1536),
  content_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(persona_id)
);

CREATE INDEX IF NOT EXISTS persona_embeddings_hnsw_idx ON persona_embeddings
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS persona_embeddings_project_idx ON persona_embeddings(project_id);
CREATE INDEX IF NOT EXISTS persona_embeddings_persona_idx ON persona_embeddings(persona_id);

ALTER TABLE persona_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view persona embeddings for their projects" ON persona_embeddings;
CREATE POLICY "Users can view persona embeddings for their projects" ON persona_embeddings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = persona_embeddings.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage persona embeddings for their projects" ON persona_embeddings;
CREATE POLICY "Users can manage persona embeddings for their projects" ON persona_embeddings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = persona_embeddings.project_id
      AND projects.owner_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = persona_embeddings.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to persona embeddings" ON persona_embeddings;
CREATE POLICY "Service role full access to persona embeddings" ON persona_embeddings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE persona_embeddings IS 'Vector embeddings for user personas';

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS product_doc_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_doc_id UUID NOT NULL REFERENCES product_documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  embedding vector(1536),
  content_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_doc_id)
);

CREATE INDEX IF NOT EXISTS product_doc_embeddings_hnsw_idx ON product_doc_embeddings
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS product_doc_embeddings_project_idx ON product_doc_embeddings(project_id);
CREATE INDEX IF NOT EXISTS product_doc_embeddings_doc_idx ON product_doc_embeddings(product_doc_id);

ALTER TABLE product_doc_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view product doc embeddings for their projects" ON product_doc_embeddings;
CREATE POLICY "Users can view product doc embeddings for their projects" ON product_doc_embeddings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = product_doc_embeddings.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage product doc embeddings for their projects" ON product_doc_embeddings;
CREATE POLICY "Users can manage product doc embeddings for their projects" ON product_doc_embeddings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = product_doc_embeddings.project_id
      AND projects.owner_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = product_doc_embeddings.project_id
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to product doc embeddings" ON product_doc_embeddings;
CREATE POLICY "Service role full access to product doc embeddings" ON product_doc_embeddings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE product_doc_embeddings IS 'Vector embeddings for product documents and runbooks';

-- ============================================================================
-- Multi-Context Semantic Search
-- ============================================================================

CREATE OR REPLACE FUNCTION search_context_semantic(
  query_embedding vector(1536),
  p_project_id UUID,
  match_threshold FLOAT DEFAULT 0.6,
  match_count INTEGER DEFAULT 15
)
RETURNS TABLE (
  context_type TEXT,
  context_id UUID,
  title TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'feedback'::TEXT AS context_type,
    p.id AS context_id,
    COALESCE(p.title, 'Feedback') AS title,
    COALESCE(p.description, p.content, '') AS content,
    jsonb_build_object(
      'status', p.status,
      'category', p.category,
      'upvotes', COALESCE(p.upvotes, p.vote_count, 0)
    ) AS metadata,
    1 - (fe.embedding <=> query_embedding) AS similarity
  FROM feedback_embeddings fe
  JOIN posts p ON p.id = fe.feedback_id
  WHERE fe.project_id = p_project_id
    AND 1 - (fe.embedding <=> query_embedding) >= match_threshold

  UNION ALL

  SELECT
    'roadmap'::TEXT AS context_type,
    rs.id AS context_id,
    COALESCE(rs.recommendation_text, 'Roadmap suggestion') AS title,
    LEFT(
      COALESCE(rs.why_matters, '') || '\n' ||
      COALESCE(rs.recommendation_text, '') || '\n' ||
      COALESCE(rs.implementation_strategy, '') || '\n' ||
      COALESCE(rs.user_segments_affected, ''),
      2000
    ) AS content,
    jsonb_build_object(
      'priority', rs.priority_level,
      'status', rs.status,
      'theme_id', rs.theme_id,
      'score', rs.priority_score
    ) AS metadata,
    1 - (re.embedding <=> query_embedding) AS similarity
  FROM roadmap_item_embeddings re
  JOIN roadmap_suggestions rs ON rs.id = re.roadmap_item_id
  WHERE re.project_id = p_project_id
    AND 1 - (re.embedding <=> query_embedding) >= match_threshold

  UNION ALL

  SELECT
    'competitor'::TEXT AS context_type,
    c.id AS context_id,
    c.name AS title,
    LEFT(COALESCE(c.description, ''), 2000) AS content,
    jsonb_build_object(
      'category', c.category,
      'status', c.status,
      'total_mentions', c.total_mentions
    ) AS metadata,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM competitor_embeddings ce
  JOIN competitors c ON c.id = ce.competitor_id
  WHERE ce.project_id = p_project_id
    AND 1 - (ce.embedding <=> query_embedding) >= match_threshold

  UNION ALL

  SELECT
    'persona'::TEXT AS context_type,
    p2.id AS context_id,
    p2.name AS title,
    LEFT(
      COALESCE(p2.description, '') || '\nGoals: ' || COALESCE(p2.goals, '') || '\nPain Points: ' || COALESCE(p2.pain_points, ''),
      2000
    ) AS content,
    jsonb_build_object(
      'role', p2.role
    ) AS metadata,
    1 - (pe.embedding <=> query_embedding) AS similarity
  FROM persona_embeddings pe
  JOIN personas p2 ON p2.id = pe.persona_id
  WHERE pe.project_id = p_project_id
    AND 1 - (pe.embedding <=> query_embedding) >= match_threshold

  UNION ALL

  SELECT
    'product_doc'::TEXT AS context_type,
    d.id AS context_id,
    d.title AS title,
    LEFT(d.content, 2000) AS content,
    jsonb_build_object(
      'doc_type', d.doc_type,
      'source_url', d.source_url
    ) AS metadata,
    1 - (de.embedding <=> query_embedding) AS similarity
  FROM product_doc_embeddings de
  JOIN product_documents d ON d.id = de.product_doc_id
  WHERE de.project_id = p_project_id
    AND 1 - (de.embedding <=> query_embedding) >= match_threshold

  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION search_context_semantic(vector(1536), UUID, FLOAT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_context_semantic(vector(1536), UUID, FLOAT, INTEGER) TO service_role;

COMMENT ON FUNCTION search_context_semantic IS 'Semantic search across feedback, roadmap items, competitors, personas, and product documents';
