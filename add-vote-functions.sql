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
  
  RETURN new_count;
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
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql;
