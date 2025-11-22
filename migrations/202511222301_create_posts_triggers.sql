-- Phase 1: Event Infrastructure - Posts Table Triggers
-- Automatically publish events when feedback is created, updated, or deleted

-- Function to publish feedback.created event
CREATE OR REPLACE FUNCTION publish_feedback_created_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert event into events table
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

-- Trigger: Fire after feedback is created
DROP TRIGGER IF EXISTS trigger_feedback_created ON posts;
CREATE TRIGGER trigger_feedback_created
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION publish_feedback_created_event();

-- Function to publish feedback.updated event
CREATE OR REPLACE FUNCTION publish_feedback_updated_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Only publish if actual content changed (not just vote_count)
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

-- Trigger: Fire after feedback is updated
DROP TRIGGER IF EXISTS trigger_feedback_updated ON posts;
CREATE TRIGGER trigger_feedback_updated
  AFTER UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION publish_feedback_updated_event();

-- Function to publish feedback.voted event
CREATE OR REPLACE FUNCTION publish_feedback_voted_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Only publish if vote_count changed
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

-- Trigger: Fire after vote count changes
DROP TRIGGER IF EXISTS trigger_feedback_voted ON posts;
CREATE TRIGGER trigger_feedback_voted
  AFTER UPDATE OF vote_count ON posts
  FOR EACH ROW
  EXECUTE FUNCTION publish_feedback_voted_event();

-- Function to publish feedback.deleted event
CREATE OR REPLACE FUNCTION publish_feedback_deleted_event()
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
    'feedback.deleted',
    'post',
    OLD.id,
    jsonb_build_object(
      'title', OLD.title,
      'category', OLD.category,
      'vote_count', OLD.vote_count
    ),
    jsonb_build_object(
      'project_id', OLD.project_id::text,
      'user_id', OLD.user_id::text,
      'timestamp', NOW()::text,
      'source', 'database_trigger'
    ),
    1
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Fire after feedback is deleted
DROP TRIGGER IF EXISTS trigger_feedback_deleted ON posts;
CREATE TRIGGER trigger_feedback_deleted
  AFTER DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION publish_feedback_deleted_event();

-- Add comments
COMMENT ON FUNCTION publish_feedback_created_event() IS 'Publishes feedback.created event when new feedback is submitted';
COMMENT ON FUNCTION publish_feedback_updated_event() IS 'Publishes feedback.updated event when feedback content is modified';
COMMENT ON FUNCTION publish_feedback_voted_event() IS 'Publishes feedback.voted event when vote count changes';
COMMENT ON FUNCTION publish_feedback_deleted_event() IS 'Publishes feedback.deleted event when feedback is removed';
