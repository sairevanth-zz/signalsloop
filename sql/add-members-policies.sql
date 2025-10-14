-- Members table RLS policies for SignalsLoop dev setup

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members are viewable by project team" ON members;
DROP POLICY IF EXISTS "Owners can manage members" ON members;

-- Allow authenticated users who belong to a project to see its member list
CREATE POLICY "Members are viewable by project team" ON members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM projects
      WHERE projects.id = members.project_id
      AND (
        projects.owner_id = auth.uid()
        OR members.user_id = auth.uid()
      )
    )
  );

-- Allow project owners (or the service role) to insert/update/delete members
CREATE POLICY "Owners can manage members" ON members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM projects
      WHERE projects.id = members.project_id
      AND (
        projects.owner_id = auth.uid() OR auth.role() = 'service_role'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM projects
      WHERE projects.id = members.project_id
      AND (
        projects.owner_id = auth.uid() OR auth.role() = 'service_role'
      )
    )
  );

-- Optional: allow users to remove themselves from a project
CREATE POLICY IF NOT EXISTS "Users can leave projects" ON members
  FOR DELETE
  USING (members.user_id = auth.uid());
