-- Ask SignalsLoop Anything - AI Chat Interface Migration
-- Creates tables for ChatGPT-style chat interface for querying product feedback

-- ============================================================================
-- 0. Enable pgvector extension for vector similarity search
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 1. Drop existing objects if they exist (for clean migration)
-- ============================================================================
DROP TABLE IF EXISTS ask_analytics CASCADE;
DROP TABLE IF EXISTS feedback_embeddings CASCADE;
DROP TABLE IF EXISTS ask_messages CASCADE;
DROP TABLE IF EXISTS ask_conversations CASCADE;
DROP FUNCTION IF EXISTS search_feedback_semantic(vector, UUID, FLOAT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS update_ask_conversations_timestamp() CASCADE;

-- ============================================================================
-- 2. Create ask_conversations table for chat conversations
-- ============================================================================
CREATE TABLE ask_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Conversation metadata
  title TEXT, -- Auto-generated from first message or user-defined
  is_pinned BOOLEAN DEFAULT false,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. Create indexes for ask_conversations
-- ============================================================================
CREATE INDEX ask_conversations_user_idx ON ask_conversations(user_id, last_message_at DESC);
CREATE INDEX ask_conversations_project_idx ON ask_conversations(project_id, last_message_at DESC);
CREATE INDEX ask_conversations_pinned_idx ON ask_conversations(user_id, is_pinned, last_message_at DESC) WHERE is_pinned = true;

-- ============================================================================
-- 4. Create ask_messages table for individual chat messages
-- ============================================================================
CREATE TABLE ask_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ask_conversations(id) ON DELETE CASCADE,

  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- Message classification and metadata
  query_type TEXT CHECK (query_type IN ('feedback', 'sentiment', 'competitive', 'themes', 'metrics', 'actions', 'general')),
  sources JSONB DEFAULT '[]', -- Array of source references (feedback IDs, etc.)
  metadata JSONB DEFAULT '{}', -- Additional metadata (tokens used, model, etc.)

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. Create indexes for ask_messages
-- ============================================================================
CREATE INDEX ask_messages_conversation_idx ON ask_messages(conversation_id, created_at DESC);
CREATE INDEX ask_messages_query_type_idx ON ask_messages(query_type) WHERE query_type IS NOT NULL;
CREATE INDEX ask_messages_sources_idx ON ask_messages USING GIN(sources);

-- ============================================================================
-- 6. Create feedback_embeddings table for vector similarity search
-- ============================================================================
CREATE TABLE feedback_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Vector embedding
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  content_hash TEXT, -- To detect if re-embedding needed

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one embedding per feedback item
  UNIQUE(feedback_id)
);

-- ============================================================================
-- 7. Create HNSW index for fast vector similarity search
-- ============================================================================
-- HNSW index for cosine similarity search (faster than ivfflat for < 1M vectors)
CREATE INDEX feedback_embeddings_hnsw_idx ON feedback_embeddings
  USING hnsw (embedding vector_cosine_ops);

-- Additional indexes for filtering
CREATE INDEX feedback_embeddings_project_idx ON feedback_embeddings(project_id);
CREATE INDEX feedback_embeddings_feedback_idx ON feedback_embeddings(feedback_id);

-- ============================================================================
-- 8. Create ask_analytics table for tracking query performance
-- ============================================================================
CREATE TABLE ask_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES ask_messages(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Query information
  query_text TEXT NOT NULL,
  query_type TEXT,

  -- User feedback
  response_rating INTEGER CHECK (response_rating BETWEEN 1 AND 5),
  feedback_text TEXT,

  -- Performance metrics
  tokens_used INTEGER,
  latency_ms INTEGER,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. Create indexes for ask_analytics
-- ============================================================================
CREATE INDEX ask_analytics_message_idx ON ask_analytics(message_id);
CREATE INDEX ask_analytics_project_idx ON ask_analytics(project_id, created_at DESC);
CREATE INDEX ask_analytics_rating_idx ON ask_analytics(response_rating) WHERE response_rating IS NOT NULL;

-- ============================================================================
-- 10. Enable Row Level Security
-- ============================================================================
ALTER TABLE ask_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ask_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ask_analytics ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 11. RLS Policies for ask_conversations
-- ============================================================================

-- Users can view their own conversations
CREATE POLICY "Users can view their own conversations" ON ask_conversations
  FOR SELECT USING (user_id = auth.uid());

-- Users can create conversations for projects they own
CREATE POLICY "Users can create conversations in their projects" ON ask_conversations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = ask_conversations.project_id
      AND projects.owner_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Users can update their own conversations
CREATE POLICY "Users can update their own conversations" ON ask_conversations
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own conversations
CREATE POLICY "Users can delete their own conversations" ON ask_conversations
  FOR DELETE USING (user_id = auth.uid());

-- Service role full access
CREATE POLICY "Service role full access to ask_conversations" ON ask_conversations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 12. RLS Policies for ask_messages
-- ============================================================================

-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations" ON ask_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ask_conversations
      WHERE ask_conversations.id = ask_messages.conversation_id
      AND ask_conversations.user_id = auth.uid()
    )
  );

-- Users can create messages in their conversations
CREATE POLICY "Users can create messages in their conversations" ON ask_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM ask_conversations
      WHERE ask_conversations.id = ask_messages.conversation_id
      AND ask_conversations.user_id = auth.uid()
    )
  );

-- Users can update messages in their conversations
CREATE POLICY "Users can update messages in their conversations" ON ask_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM ask_conversations
      WHERE ask_conversations.id = ask_messages.conversation_id
      AND ask_conversations.user_id = auth.uid()
    )
  );

-- Users can delete messages in their conversations
CREATE POLICY "Users can delete messages in their conversations" ON ask_messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM ask_conversations
      WHERE ask_conversations.id = ask_messages.conversation_id
      AND ask_conversations.user_id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "Service role full access to ask_messages" ON ask_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 13. RLS Policies for feedback_embeddings
-- ============================================================================

-- Users can view embeddings for their projects
CREATE POLICY "Users can view embeddings for their projects" ON feedback_embeddings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = feedback_embeddings.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Users can create embeddings for their projects
CREATE POLICY "Users can create embeddings for their projects" ON feedback_embeddings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = feedback_embeddings.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Users can update embeddings for their projects
CREATE POLICY "Users can update embeddings for their projects" ON feedback_embeddings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = feedback_embeddings.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Users can delete embeddings for their projects
CREATE POLICY "Users can delete embeddings for their projects" ON feedback_embeddings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = feedback_embeddings.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "Service role full access to feedback_embeddings" ON feedback_embeddings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 14. RLS Policies for ask_analytics
-- ============================================================================

-- Users can view analytics for their projects
CREATE POLICY "Users can view analytics for their projects" ON ask_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = ask_analytics.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Users can create analytics for their projects
CREATE POLICY "Users can create analytics for their projects" ON ask_analytics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = ask_analytics.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "Service role full access to ask_analytics" ON ask_analytics
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 15. Create trigger for updated_at timestamp
-- ============================================================================
CREATE FUNCTION update_ask_conversations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ask_conversations_timestamp_trigger
  BEFORE UPDATE ON ask_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_ask_conversations_timestamp();

-- ============================================================================
-- 16. Create semantic search function for feedback
-- ============================================================================

-- Function to search for similar feedback using vector similarity
CREATE OR REPLACE FUNCTION search_feedback_semantic(
  query_embedding vector(1536),
  p_project_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  feedback_id UUID,
  content TEXT,
  title TEXT,
  status TEXT,
  category TEXT,
  upvotes INTEGER,
  created_at TIMESTAMPTZ,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS feedback_id,
    p.description AS content,
    p.title,
    p.status,
    p.category,
    COALESCE(p.upvotes, 0) AS upvotes,
    p.created_at,
    1 - (fe.embedding <=> query_embedding) AS similarity
  FROM feedback_embeddings fe
  JOIN posts p ON p.id = fe.feedback_id
  WHERE fe.project_id = p_project_id
    AND 1 - (fe.embedding <=> query_embedding) >= match_threshold
  ORDER BY fe.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on search function
GRANT EXECUTE ON FUNCTION search_feedback_semantic(vector(1536), UUID, FLOAT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_feedback_semantic(vector(1536), UUID, FLOAT, INTEGER) TO service_role;

-- ============================================================================
-- 17. Add comments for documentation
-- ============================================================================
COMMENT ON TABLE ask_conversations IS 'Chat conversations for Ask SignalsLoop Anything feature';
COMMENT ON COLUMN ask_conversations.title IS 'Conversation title (auto-generated or user-defined)';
COMMENT ON COLUMN ask_conversations.is_pinned IS 'Whether conversation is pinned for quick access';
COMMENT ON COLUMN ask_conversations.last_message_at IS 'Timestamp of last message for sorting';

COMMENT ON TABLE ask_messages IS 'Individual messages within chat conversations';
COMMENT ON COLUMN ask_messages.role IS 'Message sender role: user, assistant, or system';
COMMENT ON COLUMN ask_messages.content IS 'Message content text';
COMMENT ON COLUMN ask_messages.query_type IS 'Classification of query type for analytics';
COMMENT ON COLUMN ask_messages.sources IS 'JSONB array of source references used in response';
COMMENT ON COLUMN ask_messages.metadata IS 'Additional metadata (tokens, model, etc.)';

COMMENT ON TABLE feedback_embeddings IS 'Vector embeddings of feedback items for semantic search';
COMMENT ON COLUMN feedback_embeddings.embedding IS 'OpenAI text-embedding-3-small vector (1536 dimensions)';
COMMENT ON COLUMN feedback_embeddings.content_hash IS 'Hash of content to detect when re-embedding is needed';

COMMENT ON TABLE ask_analytics IS 'Analytics and performance metrics for AI chat queries';
COMMENT ON COLUMN ask_analytics.response_rating IS 'User rating of response quality (1-5)';
COMMENT ON COLUMN ask_analytics.tokens_used IS 'Number of tokens consumed by query';
COMMENT ON COLUMN ask_analytics.latency_ms IS 'Response latency in milliseconds';

COMMENT ON FUNCTION search_feedback_semantic IS 'Semantic search for feedback using vector similarity (cosine distance)';
