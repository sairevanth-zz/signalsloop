-- Add email tracking columns to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS pro_welcome_email_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS cancellation_email_sent_at timestamptz;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_pro_welcome_email 
ON projects(pro_welcome_email_sent_at) 
WHERE pro_welcome_email_sent_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_cancellation_email 
ON projects(cancellation_email_sent_at) 
WHERE cancellation_email_sent_at IS NOT NULL;
