-- Phase 1: Event Infrastructure - Sentiment Analysis Table Triggers
-- Automatically publish events when sentiment is analyzed or updated

-- Function to publish sentiment.analyzed event
CREATE OR REPLACE FUNCTION publish_sentiment_analyzed_event()
RETURNS TRIGGER AS $$
DECLARE
  v_post posts%ROWTYPE;
BEGIN
  -- Get the related post information
  SELECT * INTO v_post FROM posts WHERE id = NEW.post_id;

  -- Insert event into events table
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

-- Trigger: Fire after sentiment analysis is created
DROP TRIGGER IF EXISTS trigger_sentiment_analyzed ON sentiment_analysis;
CREATE TRIGGER trigger_sentiment_analyzed
  AFTER INSERT ON sentiment_analysis
  FOR EACH ROW
  EXECUTE FUNCTION publish_sentiment_analyzed_event();

-- Function to publish sentiment.updated event (when reanalyzed)
CREATE OR REPLACE FUNCTION publish_sentiment_updated_event()
RETURNS TRIGGER AS $$
DECLARE
  v_post posts%ROWTYPE;
BEGIN
  -- Get the related post information
  SELECT * INTO v_post FROM posts WHERE id = NEW.post_id;

  -- Only publish if sentiment actually changed
  IF OLD.sentiment_score != NEW.sentiment_score OR
     OLD.sentiment_category != NEW.sentiment_category THEN

    INSERT INTO events (
      type,
      aggregate_type,
      aggregate_id,
      payload,
      metadata,
      version
    ) VALUES (
      'sentiment.updated',
      'sentiment_analysis',
      NEW.id,
      jsonb_build_object(
        'post_id', NEW.post_id::text,
        'sentiment_score', NEW.sentiment_score,
        'sentiment_category', NEW.sentiment_category,
        'previous_score', OLD.sentiment_score,
        'previous_category', OLD.sentiment_category,
        'score_delta', NEW.sentiment_score - OLD.sentiment_score
      ),
      jsonb_build_object(
        'project_id', v_post.project_id::text,
        'timestamp', NOW()::text,
        'source', 'database_trigger',
        'correlation_id', NEW.post_id::text
      ),
      1
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Fire after sentiment analysis is updated
DROP TRIGGER IF EXISTS trigger_sentiment_updated ON sentiment_analysis;
CREATE TRIGGER trigger_sentiment_updated
  AFTER UPDATE ON sentiment_analysis
  FOR EACH ROW
  EXECUTE FUNCTION publish_sentiment_updated_event();

-- Add comments
COMMENT ON FUNCTION publish_sentiment_analyzed_event() IS 'Publishes sentiment.analyzed event when AI analyzes feedback sentiment';
COMMENT ON FUNCTION publish_sentiment_updated_event() IS 'Publishes sentiment.updated event when sentiment analysis is reprocessed';
