-- Create team invitations table for sending email invitations
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  token VARCHAR(255) NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_invitations_project ON team_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);

-- Enable RLS
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role can manage team_invitations" ON team_invitations
  FOR ALL USING (true) WITH CHECK (true);

-- Project owners can view invitations for their projects
CREATE POLICY "Project owners can view invitations" ON team_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = team_invitations.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Project owners can create invitations for their projects
CREATE POLICY "Project owners can create invitations" ON team_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = team_invitations.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Project owners can update invitations for their projects
CREATE POLICY "Project owners can update invitations" ON team_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = team_invitations.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Project owners can delete invitations for their projects
CREATE POLICY "Project owners can delete invitations" ON team_invitations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = team_invitations.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Create function to auto-expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE team_invitations
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending'
  AND expires_at < NOW();
END;
$$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ Team invitations table created successfully!';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Table created: team_invitations';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  - Email-based invitations with expiry';
  RAISE NOTICE '  - Unique invitation tokens';
  RAISE NOTICE '  - RLS policies for security';
  RAISE NOTICE '  - Auto-expiry function';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Update your invite API endpoint';
  RAISE NOTICE '  2. Create invitation acceptance page';
  RAISE NOTICE '  3. Set up email templates';
  RAISE NOTICE '============================================================';
END $$;
