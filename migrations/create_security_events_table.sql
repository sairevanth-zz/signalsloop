-- Create security_events table for audit logging
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  path TEXT,
  method TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for performance
  CONSTRAINT security_events_type_check CHECK (type IN (
    'rate_limit_exceeded',
    'invalid_api_key',
    'csrf_validation_failed',
    'xss_attempt_blocked',
    'sql_injection_attempt',
    'unauthorized_access',
    'suspicious_request',
    'authentication_failed',
    'validation_error',
    'malicious_file_upload'
  ))
);

-- Create indexes
CREATE INDEX idx_security_events_type ON security_events(type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_project_id ON security_events(project_id);
CREATE INDEX idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX idx_security_events_ip ON security_events(ip);

-- Create a composite index for common queries
CREATE INDEX idx_security_events_severity_created_at ON security_events(severity, created_at DESC);

-- Enable Row Level Security
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can insert security events
CREATE POLICY "Service role can insert security events"
  ON security_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Only allow service role to read security events (admin only via backend)
-- This ensures only your backend API with service role can access security events
-- Users cannot directly query this table - they must go through your admin API
CREATE POLICY "Only service role can read security events"
  ON security_events
  FOR SELECT
  TO service_role
  USING (true);

-- Note: Regular users (including project owners) cannot view security events directly.
-- To allow admins to view events, create an admin API endpoint that:
-- 1. Verifies the user is an admin (check admin table, role, or specific user IDs)
-- 2. Uses service role client to query security_events table
-- 3. Returns filtered results based on admin permissions

-- Add comment
COMMENT ON TABLE security_events IS 'Stores security events for audit logging and monitoring';
