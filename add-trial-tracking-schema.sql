-- Add trial tracking fields to projects table
-- Run this in your Supabase SQL Editor

-- Add trial tracking fields to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS trial_cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS trial_status VARCHAR(50) DEFAULT 'none'; -- none, active, cancelled, expired, converted
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false;

-- Add comments for trial fields
COMMENT ON COLUMN projects.trial_start_date IS 'When the trial period started';
COMMENT ON COLUMN projects.trial_end_date IS 'When the trial period ends';
COMMENT ON COLUMN projects.trial_cancelled_at IS 'When the trial was cancelled by user';
COMMENT ON COLUMN projects.trial_status IS 'Trial status: none, active, cancelled, expired, converted';
COMMENT ON COLUMN projects.is_trial IS 'Whether the current subscription is in trial period';

-- Create index for trial lookups
CREATE INDEX IF NOT EXISTS idx_projects_trial_status ON projects(trial_status);
CREATE INDEX IF NOT EXISTS idx_projects_trial_end_date ON projects(trial_end_date) WHERE trial_end_date IS NOT NULL;

-- Update existing projects with default trial values
UPDATE projects SET
  trial_status = 'none',
  is_trial = false
WHERE trial_status IS NULL
   OR is_trial IS NULL;
