DROP INDEX IF EXISTS votes_post_ip_unique;
DROP INDEX IF EXISTS votes_post_user_unique;
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_post_id_ip_address_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_post_anonymous_unique
  ON votes(post_id, anonymous_id)
  WHERE anonymous_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_post_user_unique
  ON votes(post_id, user_id)
  WHERE user_id IS NOT NULL;
