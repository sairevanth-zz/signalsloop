-- Phase 1: Event Infrastructure - Create Events Table
-- This table stores all domain events in the system for event-driven architecture

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

-- Add comment for documentation
COMMENT ON TABLE events IS 'Domain events for event-driven architecture. All state changes publish events here.';
COMMENT ON COLUMN events.type IS 'Event type in domain.action format (e.g., feedback.created, sentiment.analyzed)';
COMMENT ON COLUMN events.aggregate_type IS 'Type of entity this event relates to (e.g., post, spec, theme)';
COMMENT ON COLUMN events.aggregate_id IS 'UUID of the entity this event relates to';
COMMENT ON COLUMN events.payload IS 'Event-specific data as JSON';
COMMENT ON COLUMN events.metadata IS 'Event metadata including user_id, project_id, timestamp, correlation_id for tracing';
COMMENT ON COLUMN events.version IS 'Schema version for backward compatibility during event schema evolution';
