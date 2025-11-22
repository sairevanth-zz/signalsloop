-- Phase 1: Event Infrastructure - Themes Table Triggers
-- Automatically publish events when themes are detected, updated, or reach frequency thresholds

-- Function to publish theme.detected event
CREATE OR REPLACE FUNCTION publish_theme_detected_event()
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

-- Trigger: Fire after theme is created
DROP TRIGGER IF EXISTS trigger_theme_detected ON themes;
CREATE TRIGGER trigger_theme_detected
  AFTER INSERT ON themes
  FOR EACH ROW
  EXECUTE FUNCTION publish_theme_detected_event();

-- Function to publish theme.updated event
CREATE OR REPLACE FUNCTION publish_theme_updated_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Only publish if significant changes occurred
  IF OLD.frequency != NEW.frequency OR
     OLD.avg_sentiment != NEW.avg_sentiment OR
     OLD.is_emerging != NEW.is_emerging THEN

    INSERT INTO events (
      type,
      aggregate_type,
      aggregate_id,
      payload,
      metadata,
      version
    ) VALUES (
      'theme.updated',
      'theme',
      NEW.id,
      jsonb_build_object(
        'theme_name', NEW.theme_name,
        'frequency', NEW.frequency,
        'avg_sentiment', NEW.avg_sentiment,
        'is_emerging', NEW.is_emerging,
        'changes', jsonb_build_object(
          'frequency_delta', NEW.frequency - OLD.frequency,
          'sentiment_delta', NEW.avg_sentiment - OLD.avg_sentiment,
          'emerging_status_changed', OLD.is_emerging != NEW.is_emerging
        )
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

-- Trigger: Fire after theme is updated
DROP TRIGGER IF EXISTS trigger_theme_updated ON themes;
CREATE TRIGGER trigger_theme_updated
  AFTER UPDATE ON themes
  FOR EACH ROW
  EXECUTE FUNCTION publish_theme_updated_event();

-- Function to publish theme.threshold_reached event
-- This is a critical event for the Proactive Spec Writer agent
CREATE OR REPLACE FUNCTION publish_theme_threshold_reached_event()
RETURNS TRIGGER AS $$
DECLARE
  v_threshold INTEGER := 20; -- Threshold from the proactive spec writer feature
BEGIN
  -- Only publish when crossing the threshold (not every update after)
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

    -- Log for debugging
    RAISE NOTICE 'Theme threshold reached: % (% feedback items)', NEW.theme_name, NEW.frequency;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Fire after theme frequency is updated
DROP TRIGGER IF EXISTS trigger_theme_threshold_reached ON themes;
CREATE TRIGGER trigger_theme_threshold_reached
  AFTER UPDATE OF frequency ON themes
  FOR EACH ROW
  EXECUTE FUNCTION publish_theme_threshold_reached_event();

-- Function to publish theme events when feedback is associated with a theme
CREATE OR REPLACE FUNCTION publish_feedback_theme_linked_event()
RETURNS TRIGGER AS $$
DECLARE
  v_theme themes%ROWTYPE;
  v_post posts%ROWTYPE;
BEGIN
  -- Get theme and post information
  SELECT * INTO v_theme FROM themes WHERE id = NEW.theme_id;
  SELECT * INTO v_post FROM posts WHERE id = NEW.feedback_id;

  -- Insert event
  INSERT INTO events (
    type,
    aggregate_type,
    aggregate_id,
    payload,
    metadata,
    version
  ) VALUES (
    'feedback_theme.linked',
    'theme',
    NEW.theme_id,
    jsonb_build_object(
      'theme_name', v_theme.theme_name,
      'feedback_id', NEW.feedback_id::text,
      'feedback_title', v_post.title,
      'confidence', NEW.confidence
    ),
    jsonb_build_object(
      'project_id', v_theme.project_id::text,
      'user_id', v_post.user_id::text,
      'timestamp', NOW()::text,
      'source', 'database_trigger',
      'correlation_id', NEW.feedback_id::text
    ),
    1
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Fire after feedback is linked to a theme
DROP TRIGGER IF EXISTS trigger_feedback_theme_linked ON feedback_themes;
CREATE TRIGGER trigger_feedback_theme_linked
  AFTER INSERT ON feedback_themes
  FOR EACH ROW
  EXECUTE FUNCTION publish_feedback_theme_linked_event();

-- Add comments
COMMENT ON FUNCTION publish_theme_detected_event() IS 'Publishes theme.detected event when AI identifies a new theme';
COMMENT ON FUNCTION publish_theme_updated_event() IS 'Publishes theme.updated event when theme metrics change';
COMMENT ON FUNCTION publish_theme_threshold_reached_event() IS 'Publishes theme.threshold_reached event when theme hits 20+ feedback items (triggers spec generation)';
COMMENT ON FUNCTION publish_feedback_theme_linked_event() IS 'Publishes feedback_theme.linked event when feedback is associated with a theme';
