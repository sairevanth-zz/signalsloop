-- Add author_name field to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS author_name TEXT;

-- Update existing posts to use email as name if no name exists
UPDATE posts 
SET author_name = COALESCE(author_email, 'Anonymous')
WHERE author_name IS NULL OR author_name = '';

