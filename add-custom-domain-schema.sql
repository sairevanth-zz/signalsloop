-- Add custom domain support to projects table
-- Run this in your Supabase SQL Editor

-- Add custom domain fields to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS domain_verified BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS domain_verification_token VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS domain_verification_method VARCHAR(50) DEFAULT 'dns_txt';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS domain_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS domain_status VARCHAR(50) DEFAULT 'pending';

-- Add comments
COMMENT ON COLUMN projects.custom_domain IS 'Custom domain for the project (e.g., feedback.company.com)';
COMMENT ON COLUMN projects.domain_verified IS 'Whether the custom domain has been verified';
COMMENT ON COLUMN projects.domain_verification_token IS 'Token for domain verification';
COMMENT ON COLUMN projects.domain_verification_method IS 'Method used for domain verification (dns_txt, dns_cname, file)';
COMMENT ON COLUMN projects.domain_verified_at IS 'When the domain was verified';
COMMENT ON COLUMN projects.domain_status IS 'Domain verification status (pending, verified, failed, expired)';

-- Create index for custom domain lookups
CREATE INDEX IF NOT EXISTS idx_projects_custom_domain ON projects(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_domain_verified ON projects(domain_verified) WHERE domain_verified = true;

-- Create domain verification records table
CREATE TABLE IF NOT EXISTS domain_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  verification_token VARCHAR(255) NOT NULL,
  verification_method VARCHAR(50) NOT NULL DEFAULT 'dns_txt',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  verification_data JSONB, -- Store additional verification data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Add comments for domain_verifications table
COMMENT ON TABLE domain_verifications IS 'Records of domain verification attempts';
COMMENT ON COLUMN domain_verifications.domain IS 'Domain being verified';
COMMENT ON COLUMN domain_verifications.verification_token IS 'Token used for verification';
COMMENT ON COLUMN domain_verifications.verification_method IS 'Method used for verification';
COMMENT ON COLUMN domain_verifications.status IS 'Verification status (pending, verified, failed, expired)';
COMMENT ON COLUMN domain_verifications.verification_data IS 'Additional verification data (DNS records, etc.)';
COMMENT ON COLUMN domain_verifications.attempts IS 'Number of verification attempts';
COMMENT ON COLUMN domain_verifications.error_message IS 'Last error message if verification failed';

-- Create indexes for domain_verifications
CREATE INDEX IF NOT EXISTS idx_domain_verifications_project_id ON domain_verifications(project_id);
CREATE INDEX IF NOT EXISTS idx_domain_verifications_domain ON domain_verifications(domain);
CREATE INDEX IF NOT EXISTS idx_domain_verifications_token ON domain_verifications(verification_token);
CREATE INDEX IF NOT EXISTS idx_domain_verifications_status ON domain_verifications(status);

-- Add RLS policies for domain_verifications
ALTER TABLE domain_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own domain verifications
CREATE POLICY "Users can view own domain verifications" ON domain_verifications
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can insert domain verifications for their projects
CREATE POLICY "Users can create domain verifications" ON domain_verifications
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can update their own domain verifications
CREATE POLICY "Users can update own domain verifications" ON domain_verifications
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can delete their own domain verifications
CREATE POLICY "Users can delete own domain verifications" ON domain_verifications
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Update existing projects with default values
UPDATE projects SET
  domain_verified = false,
  domain_verification_method = 'dns_txt',
  domain_status = 'pending'
WHERE domain_verified IS NULL
   OR domain_verification_method IS NULL
   OR domain_status IS NULL;
