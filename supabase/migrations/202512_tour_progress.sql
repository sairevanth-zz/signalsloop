-- Tour Progress Migration
-- Adds tour_progress column to user_preferences table

-- Add tour_progress column if it doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_preferences') THEN
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'user_preferences' AND column_name = 'tour_progress'
    ) THEN
      ALTER TABLE user_preferences ADD COLUMN tour_progress JSONB DEFAULT '{}';
    END IF;
  END IF;
END $$;

-- Create index for tour_progress queries
CREATE INDEX IF NOT EXISTS idx_user_preferences_tour_progress 
ON user_preferences USING GIN (tour_progress);
