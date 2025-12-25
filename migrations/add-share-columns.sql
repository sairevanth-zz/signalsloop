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

-- =================================================================
-- MIGRATION: Add comments table for retro cards
-- =================================================================

-- Create card comments table
CREATE TABLE IF NOT EXISTS retro_card_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES retro_cards(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  author TEXT DEFAULT 'Anonymous',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS but allow public access for shared boards
ALTER TABLE retro_card_comments ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to insert comments (for public boards)
CREATE POLICY "Anyone can add comments to cards" ON retro_card_comments
  FOR INSERT WITH CHECK (true);

-- Policy to allow anyone to view comments
CREATE POLICY "Anyone can view comments" ON retro_card_comments
  FOR SELECT USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_retro_card_comments_card_id 
ON retro_card_comments(card_id);

-- Add comments column to retro_cards for caching
ALTER TABLE retro_cards
ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;
