-- ============================================================================
-- Phase 1: Event Infrastructure - Combined Migration
-- ============================================================================
-- This migration combines all Phase 1 event infrastructure components:
-- 1. Events table
-- 2. Posts triggers (feedback events)
-- 3. Sentiment triggers
-- 4. Theme triggers
-- 5. Spec triggers
--
-- Apply this via Supabase Dashboard → SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. CREATE EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,                    -- Event type (e.g., 'feedback.created', 'sentiment.analyzed')
  aggregate_type TEXT NOT NULL,          -- Entity type (e.g., 'post', 'spec', 'theme')
  aggregate_id UUID NOT NULL,            -- ID of the entity this event relates to
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Event data
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- Event metadata (user_id, project_id, correlation_id, etc.)
  version INTEGER NOT NULL DEFAULT 1,    -- Event schema version for evolution
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying events by type (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

-- Index for querying all events for a specific aggregate
CREATE INDEX IF NOT EXISTS idx_events_aggregate ON events(aggregate_type, aggregate_id);

-- Index for time-based queries and event replay
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

-- Composite index for project-scoped event queries
CREATE INDEX IF NOT EXISTS idx_events_project_type ON events((metadata->>'project_id'), type, created_at DESC);

-- Enable Supabase Realtime for live event subscriptions
ALTER TABLE events REPLICA IDENTITY FULL;

-- Add comments for documentation
COMMENT ON TABLE events IS 'Domain events for event-driven architecture. All state changes publish events here.';
COMMENT ON COLUMN events.type IS 'Event type in domain.action format (e.g., feedback.created, sentiment.analyzed)';
COMMENT ON COLUMN events.aggregate_type IS 'Type of entity this event relates to (e.g., post, spec, theme)';
COMMENT ON COLUMN events.aggregate_id IS 'UUID of the entity this event relates to';
COMMENT ON COLUMN events.payload IS 'Event-specific data as JSON';
COMMENT ON COLUMN events.metadata IS 'Event metadata including user_id, project_id, timestamp, correlation_id for tracing';
COMMENT ON COLUMN events.version IS 'Schema version for backward compatibility during event schema evolution';

-- ============================================================================
-- 2. POSTS TABLE TRIGGERS (Feedback Events)
-- ============================================================================

-- Function to publish feedback.created event
CREATE OR REPLACE FUNCTION publish_feedback_created_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO events (
    type,
    aggregate_type,
    aggregate_id,
    payload,
    metadata,
    version
  ) VALUES (
    'feedback.created',
    'post',
    NEW.id,
    jsonb_build_object(
      'title', NEW.title,
      'content', NEW.content,
      'category', NEW.category,
      'vote_count', NEW.vote_count,
      'status', NEW.status
    ),
    jsonb_build_object(
      'project_id', NEW.project_id::text,
      'user_id', NEW.user_id::text,
      'timestamp', NOW()::text,
      'source', 'database_trigger'
    ),
    1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_feedback_created ON posts;
CREATE TRIGGER trigger_feedback_created
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION publish_feedback_created_event();

-- Function to publish feedback.updated event
CREATE OR REPLACE FUNCTION publish_feedback_updated_event()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.title != NEW.title OR
     OLD.content != NEW.content OR
     OLD.category != NEW.category OR
     OLD.status != NEW.status THEN

    INSERT INTO events (
      type,
      aggregate_type,
      aggregate_id,
      payload,
      metadata,
      version
    ) VALUES (
      'feedback.updated',
      'post',
      NEW.id,
      jsonb_build_object(
        'title', NEW.title,
        'content', NEW.content,
        'category', NEW.category,
        'status', NEW.status,
        'changes', jsonb_build_object(
          'title_changed', OLD.title != NEW.title,
          'content_changed', OLD.content != NEW.content,
          'category_changed', OLD.category != NEW.category,
          'status_changed', OLD.status != NEW.status
        )
      ),
      jsonb_build_object(
        'project_id', NEW.project_id::text,
        'user_id', NEW.user_id::text,
        'timestamp', NOW()::text,
        'source', 'database_trigger'
      ),
      1
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_feedback_updated ON posts;
CREATE TRIGGER trigger_feedback_updated
  AFTER UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION publish_feedback_updated_event();

-- Function to publish feedback.voted event
CREATE OR REPLACE FUNCTION publish_feedback_voted_event()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.vote_count != NEW.vote_count THEN
    INSERT INTO events (
      type,
      aggregate_type,
      aggregate_id,
      payload,
      metadata,
      version
    ) VALUES (
      'feedback.voted',
      'post',
      NEW.id,
      jsonb_build_object(
        'vote_count', NEW.vote_count,
        'previous_vote_count', OLD.vote_count,
        'vote_delta', NEW.vote_count - OLD.vote_count
      ),
      jsonb_build_object(
        'project_id', NEW.project_id::text,
        'timestamp', NOW()::text,
        'source', 'database_trigger'
      ),
      1
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_feedback_voted ON posts;
CREATE TRIGGER trigger_feedback_voted
  AFTER UPDATE OF vote_count ON posts
  FOR EACH ROW
  EXECUTE FUNCTION publish_feedback_voted_event();

COMMENT ON FUNCTION publish_feedback_created_event() IS 'Publishes feedback.created event when new feedback is submitted';
COMMENT ON FUNCTION publish_feedback_updated_event() IS 'Publishes feedback.updated event when feedback content is modified';
COMMENT ON FUNCTION publish_feedback_voted_event() IS 'Publishes feedback.voted event when vote count changes';

-- ============================================================================
-- 3. SENTIMENT ANALYSIS TABLE TRIGGERS
-- ============================================================================

-- Function to publish sentiment.analyzed event
CREATE OR REPLACE FUNCTION publish_sentiment_analyzed_event()
RETURNS TRIGGER AS $$
DECLARE
  v_post posts%ROWTYPE;
BEGIN
  SELECT * INTO v_post FROM posts WHERE id = NEW.post_id;

  INSERT INTO events (
    type,
    aggregate_type,
    aggregate_id,
    payload,
    metadata,
    version
  ) VALUES (
    'sentiment.analyzed',
    'sentiment_analysis',
    NEW.id,
    jsonb_build_object(
      'post_id', NEW.post_id::text,
      'sentiment_score', NEW.sentiment_score,
      'sentiment_category', NEW.sentiment_category,
      'key_themes', NEW.key_themes,
      'emotional_intensity', NEW.emotional_intensity,
      'post_title', v_post.title
    ),
    jsonb_build_object(
      'project_id', v_post.project_id::text,
      'user_id', v_post.user_id::text,
      'timestamp', NOW()::text,
      'source', 'database_trigger',
      'correlation_id', NEW.post_id::text
    ),
    1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sentiment_analyzed ON sentiment_analysis;
CREATE TRIGGER trigger_sentiment_analyzed
  AFTER INSERT ON sentiment_analysis
  FOR EACH ROW
  EXECUTE FUNCTION publish_sentiment_analyzed_event();

COMMENT ON FUNCTION publish_sentiment_analyzed_event() IS 'Publishes sentiment.analyzed event when AI analyzes feedback sentiment';

-- ============================================================================
-- 4. THEMES TABLE TRIGGERS
-- ============================================================================

-- Function to publish theme.detected event
CREATE OR REPLACE FUNCTION publish_theme_detected_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO events (
    type,
    aggregate_type,
    aggregate_id,
    payload,
    metadata,
    version
  ) VALUES (
    'theme.detected',
    'theme',
    NEW.id,
    jsonb_build_object(
      'theme_name', NEW.theme_name,
      'description', NEW.description,
      'frequency', NEW.frequency,
      'avg_sentiment', NEW.avg_sentiment,
      'is_emerging', NEW.is_emerging
    ),
    jsonb_build_object(
      'project_id', NEW.project_id::text,
      'timestamp', NOW()::text,
      'source', 'database_trigger'
    ),
    1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_theme_detected ON themes;
CREATE TRIGGER trigger_theme_detected
  AFTER INSERT ON themes
  FOR EACH ROW
  EXECUTE FUNCTION publish_theme_detected_event();

-- Function to publish theme.threshold_reached event
CREATE OR REPLACE FUNCTION publish_theme_threshold_reached_event()
RETURNS TRIGGER AS $$
DECLARE
  v_threshold INTEGER := 20;
BEGIN
  IF OLD.frequency < v_threshold AND NEW.frequency >= v_threshold THEN
    INSERT INTO events (
      type,
      aggregate_type,
      aggregate_id,
      payload,
      metadata,
      version
    ) VALUES (
      'theme.threshold_reached',
      'theme',
      NEW.id,
      jsonb_build_object(
        'theme_name', NEW.theme_name,
        'description', NEW.description,
        'frequency', NEW.frequency,
        'threshold', v_threshold,
        'avg_sentiment', NEW.avg_sentiment,
        'is_emerging', NEW.is_emerging
      ),
      jsonb_build_object(
        'project_id', NEW.project_id::text,
        'timestamp', NOW()::text,
        'source', 'database_trigger',
        'priority', 'high'
      ),
      1
    );
    RAISE NOTICE 'Theme threshold reached: % (% feedback items)', NEW.theme_name, NEW.frequency;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_theme_threshold_reached ON themes;
CREATE TRIGGER trigger_theme_threshold_reached
  AFTER UPDATE OF frequency ON themes
  FOR EACH ROW
  EXECUTE FUNCTION publish_theme_threshold_reached_event();

COMMENT ON FUNCTION publish_theme_detected_event() IS 'Publishes theme.detected event when AI identifies a new theme';
COMMENT ON FUNCTION publish_theme_threshold_reached_event() IS 'Publishes theme.threshold_reached event when theme hits 20+ feedback items (triggers spec generation)';

-- ============================================================================
-- 5. SPECS TABLE TRIGGERS
-- ============================================================================

-- Function to publish spec.auto_drafted event
CREATE OR REPLACE FUNCTION publish_spec_auto_drafted_event()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.auto_generated = TRUE THEN
    INSERT INTO events (
      type,
      aggregate_type,
      aggregate_id,
      payload,
      metadata,
      version
    ) VALUES (
      'spec.auto_drafted',
      'spec',
      NEW.id,
      jsonb_build_object(
        'title', NEW.title,
        'input_idea', NEW.input_idea,
        'status', NEW.status,
        'linked_feedback_count', array_length(NEW.linked_feedback_ids, 1),
        'linked_feedback_ids', NEW.linked_feedback_ids,
        'generation_model', NEW.generation_model,
        'generation_tokens', NEW.generation_tokens
      ),
      jsonb_build_object(
        'project_id', NEW.project_id::text,
        'user_id', NEW.created_by::text,
        'timestamp', NOW()::text,
        'source', 'database_trigger',
        'priority', 'high'
      ),
      1
    );
    RAISE NOTICE 'Spec auto-drafted: % (% linked feedback items)', NEW.title, array_length(NEW.linked_feedback_ids, 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_spec_auto_drafted ON specs;
CREATE TRIGGER trigger_spec_auto_drafted
  AFTER INSERT ON specs
  FOR EACH ROW
  EXECUTE FUNCTION publish_spec_auto_drafted_event();

-- Function to publish spec.approved event
CREATE OR REPLACE FUNCTION publish_spec_approved_event()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
    INSERT INTO events (
      type,
      aggregate_type,
      aggregate_id,
      payload,
      metadata,
      version
    ) VALUES (
      'spec.approved',
      'spec',
      NEW.id,
      jsonb_build_object(
        'title', NEW.title,
        'auto_generated', NEW.auto_generated,
        'linked_feedback_count', array_length(NEW.linked_feedback_ids, 1),
        'linked_feedback_ids', NEW.linked_feedback_ids
      ),
      jsonb_build_object(
        'project_id', NEW.project_id::text,
        'user_id', NEW.created_by::text,
        'timestamp', NOW()::text,
        'source', 'database_trigger',
        'priority', 'high'
      ),
      1
    );
    RAISE NOTICE 'Spec approved: %', NEW.title;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_spec_approved ON specs;
CREATE TRIGGER trigger_spec_approved
  AFTER UPDATE OF status ON specs
  FOR EACH ROW
  EXECUTE FUNCTION publish_spec_approved_event();

COMMENT ON FUNCTION publish_spec_auto_drafted_event() IS 'Publishes spec.auto_drafted event when Proactive Spec Writer generates a new spec';
COMMENT ON FUNCTION publish_spec_approved_event() IS 'Publishes spec.approved event when PM approves a spec';

-- ============================================================================
-- 6. ENABLE REALTIME
-- ============================================================================

-- Enable Realtime on events table for live subscriptions
-- This allows agents to subscribe to events in real-time via Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE events;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Phase 1: Event Infrastructure Migration Complete!';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Events table created';
  RAISE NOTICE '✅ Feedback triggers installed (created, updated, voted)';
  RAISE NOTICE '✅ Sentiment triggers installed (analyzed)';
  RAISE NOTICE '✅ Theme triggers installed (detected, threshold_reached)';
  RAISE NOTICE '✅ Spec triggers installed (auto_drafted, approved)';
  RAISE NOTICE '✅ Realtime enabled for events table';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Deploy the TypeScript event utilities to your app';
  RAISE NOTICE '2. Test event publishing via test-events.ts';
  RAISE NOTICE '3. Start Phase 2: Convert existing agents to event-driven';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
END $$;
