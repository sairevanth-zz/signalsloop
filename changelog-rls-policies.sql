-- RLS Policies for Changelog System
-- Enable RLS on all changelog tables

ALTER TABLE changelog_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE changelog_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE changelog_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE changelog_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE changelog_feedback_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE changelog_webhooks ENABLE ROW LEVEL SECURITY;

-- 1. Changelog Releases Policies
CREATE POLICY "Public can view published changelog releases" ON changelog_releases
  FOR SELECT USING (is_published = true);

CREATE POLICY "Project members can view all changelog releases" ON changelog_releases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = changelog_releases.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Project members can insert changelog releases" ON changelog_releases
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = changelog_releases.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Project members can update changelog releases" ON changelog_releases
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = changelog_releases.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Project members can delete changelog releases" ON changelog_releases
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = changelog_releases.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- 2. Changelog Entries Policies
CREATE POLICY "Public can view entries for published releases" ON changelog_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM changelog_releases 
      WHERE changelog_releases.id = changelog_entries.release_id 
      AND changelog_releases.is_published = true
    )
  );

CREATE POLICY "Project members can manage changelog entries" ON changelog_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM changelog_releases 
      JOIN projects ON projects.id = changelog_releases.project_id
      WHERE changelog_releases.id = changelog_entries.release_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- 3. Changelog Media Policies
CREATE POLICY "Public can view media for published releases" ON changelog_media
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM changelog_releases 
      WHERE changelog_releases.id = changelog_media.release_id 
      AND changelog_releases.is_published = true
    )
  );

CREATE POLICY "Project members can manage changelog media" ON changelog_media
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM changelog_releases 
      JOIN projects ON projects.id = changelog_releases.project_id
      WHERE changelog_releases.id = changelog_media.release_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- 4. Changelog Subscriptions Policies
CREATE POLICY "Anyone can subscribe to changelog updates" ON changelog_subscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can manage their own subscriptions" ON changelog_subscriptions
  FOR ALL USING (
    email = auth.jwt() ->> 'email' OR
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = changelog_subscriptions.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- 5. Changelog Feedback Links Policies
CREATE POLICY "Public can view feedback links for published releases" ON changelog_feedback_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM changelog_releases 
      WHERE changelog_releases.id = changelog_feedback_links.release_id 
      AND changelog_releases.is_published = true
    )
  );

CREATE POLICY "Project members can manage feedback links" ON changelog_feedback_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM changelog_releases 
      JOIN projects ON projects.id = changelog_releases.project_id
      WHERE changelog_releases.id = changelog_feedback_links.release_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- 6. Changelog Webhooks Policies
CREATE POLICY "Project members can manage webhooks" ON changelog_webhooks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = changelog_webhooks.project_id 
      AND projects.owner_id = auth.uid()
    )
  );
