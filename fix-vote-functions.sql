-- Fix Vote Count Functions - Safe to run multiple times
-- This script handles existing functions gracefully

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS increment_vote_count(UUID);
DROP FUNCTION IF EXISTS decrement_vote_count(UUID);

-- Create vote count increment function
CREATE OR REPLACE FUNCTION increment_vote_count(post_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE posts 
  SET vote_count = vote_count + 1 
  WHERE id = post_id_param
  RETURNING vote_count INTO new_count;
  
  RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Create vote count decrement function
CREATE OR REPLACE FUNCTION decrement_vote_count(post_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE posts 
  SET vote_count = GREATEST(vote_count - 1, 0) 
  WHERE id = post_id_param
  RETURNING vote_count INTO new_count;
  
  RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_vote_count(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION decrement_vote_count(UUID) TO service_role;
