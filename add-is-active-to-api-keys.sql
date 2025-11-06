-- Add is_active column to api_keys table
-- Run this in Supabase SQL Editor

ALTER TABLE api_keys
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing rows to be active
UPDATE api_keys SET is_active = true WHERE is_active IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
