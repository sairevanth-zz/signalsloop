-- Adds priority tracking to votes table

ALTER TABLE votes
  ADD COLUMN IF NOT EXISTS priority TEXT
  CHECK (priority IN ('must_have', 'important', 'nice_to_have'))
  DEFAULT 'important';

CREATE INDEX IF NOT EXISTS idx_votes_priority
  ON votes(priority);
