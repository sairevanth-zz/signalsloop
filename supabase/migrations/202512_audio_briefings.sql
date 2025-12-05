-- Audio Briefings Table
-- Stores metadata for generated audio briefings

CREATE TABLE IF NOT EXISTS audio_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  briefing_id UUID NOT NULL REFERENCES daily_briefings(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  voice TEXT NOT NULL DEFAULT 'nova',
  duration_seconds INTEGER DEFAULT 0,
  file_size_bytes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  UNIQUE(briefing_id, voice)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_audio_briefings_project_id ON audio_briefings(project_id);
CREATE INDEX IF NOT EXISTS idx_audio_briefings_briefing_id ON audio_briefings(briefing_id);
CREATE INDEX IF NOT EXISTS idx_audio_briefings_expires_at ON audio_briefings(expires_at);

-- User Preferences Table (if not exists)
-- Add TTS voice preference column
DO $$
BEGIN
  -- Check if user_preferences table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_preferences') THEN
    -- Add tts_voice column if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'user_preferences' AND column_name = 'tts_voice'
    ) THEN
      ALTER TABLE user_preferences ADD COLUMN tts_voice TEXT DEFAULT 'nova';
    END IF;
  ELSE
    -- Create user_preferences table
    CREATE TABLE user_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE,
      tts_voice TEXT DEFAULT 'nova',
      notification_preferences JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
  END IF;
END $$;

-- Add audio_url column to daily_briefings if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'daily_briefings' AND column_name = 'audio_url'
  ) THEN
    ALTER TABLE daily_briefings ADD COLUMN audio_url TEXT;
    ALTER TABLE daily_briefings ADD COLUMN audio_voice TEXT DEFAULT 'nova';
    ALTER TABLE daily_briefings ADD COLUMN audio_duration_seconds INTEGER;
  END IF;
END $$;

-- RLS Policies
ALTER TABLE audio_briefings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access audio for their own projects
CREATE POLICY "Users can access their project audio" ON audio_briefings
  FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Function to cleanup expired audio briefings
CREATE OR REPLACE FUNCTION cleanup_expired_audio_briefings()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audio_briefings WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
