-- =================================================================
-- MIGRATION: Add share columns to launch_boards
-- Run this in Supabase SQL Editor
-- =================================================================

-- Add share_token and is_public columns if they don't exist
ALTER TABLE launch_boards
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups by share_token
CREATE INDEX IF NOT EXISTS idx_launch_boards_share_token 
ON launch_boards(share_token) WHERE share_token IS NOT NULL;

-- Add share columns to retro_boards as well
ALTER TABLE retro_boards
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_retro_boards_share_token 
ON retro_boards(share_token) WHERE share_token IS NOT NULL;
