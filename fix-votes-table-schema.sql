-- Fix votes table schema to use TEXT instead of INET for ip_address
-- This allows us to store voter hashes instead of actual IP addresses

-- Drop the existing unique constraint
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_post_id_ip_address_key;

-- Change the column type from INET to TEXT
ALTER TABLE votes ALTER COLUMN ip_address TYPE TEXT USING ip_address::text;

-- Recreate the unique constraint
ALTER TABLE votes ADD CONSTRAINT votes_post_id_ip_address_key UNIQUE (post_id, ip_address);

-- Also drop the user_id constraint if it exists since we're using ip_address for anonymous voting
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_post_id_user_id_key;

-- Add a new constraint that allows either user_id OR ip_address to be unique per post
-- This allows both authenticated and anonymous voting
CREATE UNIQUE INDEX IF NOT EXISTS votes_post_user_unique ON votes (post_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS votes_post_ip_unique ON votes (post_id, ip_address) WHERE ip_address IS NOT NULL;
