-- Fix posts table mismatch: ensure a content column exists for triggers/functions that reference OLD.content/NEW.content
-- Safe to run repeatedly.

ALTER TABLE IF EXISTS posts
ADD COLUMN IF NOT EXISTS content TEXT;

-- Backfill content from description if empty
UPDATE posts
SET content = description
WHERE content IS NULL
  AND description IS NOT NULL;
