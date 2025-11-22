-- Phase 1: Event Infrastructure - Specs Table Triggers
-- Automatically publish events when specs are auto-drafted, approved, or updated

-- Function to publish spec.auto_drafted event
CREATE OR REPLACE FUNCTION publish_spec_auto_drafted_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Only publish if this is an auto-generated spec
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

    -- Log for debugging
    RAISE NOTICE 'Spec auto-drafted: % (% linked feedback items)', NEW.title, array_length(NEW.linked_feedback_ids, 1);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Fire after spec is created
DROP TRIGGER IF EXISTS trigger_spec_auto_drafted ON specs;
CREATE TRIGGER trigger_spec_auto_drafted
  AFTER INSERT ON specs
  FOR EACH ROW
  EXECUTE FUNCTION publish_spec_auto_drafted_event();

-- Function to publish spec.approved event
CREATE OR REPLACE FUNCTION publish_spec_approved_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Only publish when status changes to 'approved'
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

    -- Log for debugging
    RAISE NOTICE 'Spec approved: %', NEW.title;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Fire after spec status is updated
DROP TRIGGER IF EXISTS trigger_spec_approved ON specs;
CREATE TRIGGER trigger_spec_approved
  AFTER UPDATE OF status ON specs
  FOR EACH ROW
  EXECUTE FUNCTION publish_spec_approved_event();

-- Function to publish spec.rejected event
CREATE OR REPLACE FUNCTION publish_spec_rejected_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Only publish when status changes to 'archived' (rejection)
  IF OLD.status IN ('draft', 'review') AND NEW.status = 'archived' THEN
    INSERT INTO events (
      type,
      aggregate_type,
      aggregate_id,
      payload,
      metadata,
      version
    ) VALUES (
      'spec.rejected',
      'spec',
      NEW.id,
      jsonb_build_object(
        'title', NEW.title,
        'auto_generated', NEW.auto_generated,
        'previous_status', OLD.status
      ),
      jsonb_build_object(
        'project_id', NEW.project_id::text,
        'user_id', NEW.created_by::text,
        'timestamp', NOW()::text,
        'source', 'database_trigger'
      ),
      1
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Fire after spec is archived
DROP TRIGGER IF EXISTS trigger_spec_rejected ON specs;
CREATE TRIGGER trigger_spec_rejected
  AFTER UPDATE OF status ON specs
  FOR EACH ROW
  EXECUTE FUNCTION publish_spec_rejected_event();

-- Function to publish spec.updated event
CREATE OR REPLACE FUNCTION publish_spec_updated_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Only publish if content changed (not just status)
  IF OLD.title != NEW.title OR OLD.content != NEW.content THEN
    INSERT INTO events (
      type,
      aggregate_type,
      aggregate_id,
      payload,
      metadata,
      version
    ) VALUES (
      'spec.updated',
      'spec',
      NEW.id,
      jsonb_build_object(
        'title', NEW.title,
        'status', NEW.status,
        'auto_generated', NEW.auto_generated,
        'changes', jsonb_build_object(
          'title_changed', OLD.title != NEW.title,
          'content_changed', OLD.content != NEW.content
        )
      ),
      jsonb_build_object(
        'project_id', NEW.project_id::text,
        'user_id', NEW.created_by::text,
        'timestamp', NOW()::text,
        'source', 'database_trigger'
      ),
      1
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Fire after spec is updated
DROP TRIGGER IF EXISTS trigger_spec_updated ON specs;
CREATE TRIGGER trigger_spec_updated
  AFTER UPDATE ON specs
  FOR EACH ROW
  EXECUTE FUNCTION publish_spec_updated_event();

-- Function to publish spec.linked event (when feedback is linked)
CREATE OR REPLACE FUNCTION publish_spec_linked_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Only publish if linked_feedback_ids changed
  IF OLD.linked_feedback_ids IS DISTINCT FROM NEW.linked_feedback_ids THEN
    INSERT INTO events (
      type,
      aggregate_type,
      aggregate_id,
      payload,
      metadata,
      version
    ) VALUES (
      'spec.linked',
      'spec',
      NEW.id,
      jsonb_build_object(
        'title', NEW.title,
        'linked_feedback_count', array_length(NEW.linked_feedback_ids, 1),
        'linked_feedback_ids', NEW.linked_feedback_ids,
        'previous_count', array_length(OLD.linked_feedback_ids, 1)
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

-- Trigger: Fire after feedback linkage changes
DROP TRIGGER IF EXISTS trigger_spec_linked ON specs;
CREATE TRIGGER trigger_spec_linked
  AFTER UPDATE OF linked_feedback_ids ON specs
  FOR EACH ROW
  EXECUTE FUNCTION publish_spec_linked_event();

-- Add comments
COMMENT ON FUNCTION publish_spec_auto_drafted_event() IS 'Publishes spec.auto_drafted event when Proactive Spec Writer generates a new spec';
COMMENT ON FUNCTION publish_spec_approved_event() IS 'Publishes spec.approved event when PM approves a spec';
COMMENT ON FUNCTION publish_spec_rejected_event() IS 'Publishes spec.rejected event when spec is archived/rejected';
COMMENT ON FUNCTION publish_spec_updated_event() IS 'Publishes spec.updated event when spec content is modified';
COMMENT ON FUNCTION publish_spec_linked_event() IS 'Publishes spec.linked event when feedback items are linked to spec';
