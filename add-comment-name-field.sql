-- Add name field to comments table
ALTER TABLE comments ADD COLUMN IF NOT EXISTS author_name TEXT;

-- Update existing comments to have a default name
UPDATE comments 
SET author_name = 'Anonymous' 
WHERE author_name IS NULL OR author_name = '';

