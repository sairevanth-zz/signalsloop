-- Auto-Generated User Stories Migration
-- AI-powered conversion of themes to sprint-ready user stories with acceptance criteria

-- ============================================================================
-- 1. Create enum types
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE story_priority AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE sprint_status AS ENUM ('backlog', 'to_do', 'in_progress', 'done');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE sprint_phase AS ENUM ('planning', 'active', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. Create user_stories table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  theme_id UUID REFERENCES themes(id) ON DELETE SET NULL,

  -- Story content (User Story Format: As a... I want... So that...)
  title TEXT NOT NULL,
  user_type TEXT NOT NULL,  -- "enterprise customer", "mobile user", etc.
  user_goal TEXT NOT NULL,  -- "I want to..."
  user_benefit TEXT NOT NULL,  -- "So that..."
  full_story TEXT NOT NULL,  -- Complete formatted story

  -- Acceptance criteria (array of criterion objects)
  -- Format: [{ id: string, text: string, details: string[] }]
  acceptance_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Story points & estimation
  story_points INTEGER CHECK (story_points IN (1, 2, 3, 5, 8, 13, 21)),
  complexity_score DECIMAL(3,2) CHECK (complexity_score >= 0 AND complexity_score <= 1),
  uncertainty_score DECIMAL(3,2) CHECK (uncertainty_score >= 0 AND uncertainty_score <= 1),
  effort_score DECIMAL(3,2) CHECK (effort_score >= 0 AND effort_score <= 1),
  estimation_reasoning TEXT,

  -- Metadata
  labels TEXT[] DEFAULT ARRAY[]::TEXT[],  -- e.g., ['mobile', 'performance', 'P0']
  technical_notes TEXT,
  definition_of_done JSONB DEFAULT '[]'::jsonb,  -- Checklist items
  priority_level story_priority DEFAULT 'medium',

  -- Jira integration
  jira_issue_key TEXT,  -- e.g., 'PROJ-123'
  jira_issue_id TEXT,
  exported_to_jira BOOLEAN DEFAULT false,
  export_timestamp TIMESTAMPTZ,
  jira_export_error TEXT,

  -- Sprint planning
  sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
  sprint_status sprint_status DEFAULT 'backlog',
  assigned_to TEXT,

  -- AI generation
  generated_by_ai BOOLEAN DEFAULT true,
  generation_model TEXT DEFAULT 'gpt-4',
  generation_timestamp TIMESTAMPTZ DEFAULT NOW(),
  generation_tokens_used INTEGER,
  manually_edited BOOLEAN DEFAULT false,
  manually_edited_at TIMESTAMPTZ,

  -- Supporting feedback (links back to original feedback)
  supporting_feedback_ids UUID[] DEFAULT ARRAY[]::UUID[],
  feedback_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. Create sprints table
-- ============================================================================
CREATE TABLE IF NOT EXISTS sprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Sprint identification
  sprint_number INTEGER NOT NULL,
  sprint_name TEXT NOT NULL,  -- e.g., "Sprint 24"
  sprint_goal TEXT,  -- Overall sprint objective

  -- Sprint timeline
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Capacity planning
  capacity_points INTEGER NOT NULL DEFAULT 0,  -- Team's velocity
  current_points INTEGER DEFAULT 0,  -- Sum of story points in sprint
  committed_points INTEGER DEFAULT 0,  -- Points when sprint started

  -- Sprint status
  status sprint_phase DEFAULT 'planning',

  -- Team information
  team_members JSONB DEFAULT '[]'::jsonb,  -- [{id, name, capacity}]

  -- Sprint retrospective
  completed_points INTEGER DEFAULT 0,
  retrospective_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique sprint numbers per project
  UNIQUE(project_id, sprint_number)
);

-- ============================================================================
-- 4. Create story_templates table
-- ============================================================================
CREATE TABLE IF NOT EXISTS story_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Template identification
  template_name TEXT NOT NULL,
  description TEXT,
  category TEXT,  -- 'performance', 'feature', 'bug', 'infrastructure'

  -- Template content
  user_type_template TEXT,  -- "{{role}}" placeholder support
  goal_template TEXT,
  benefit_template TEXT,
  acceptance_criteria_templates JSONB DEFAULT '[]'::jsonb,
  default_labels TEXT[] DEFAULT ARRAY[]::TEXT[],
  default_story_points INTEGER,

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, template_name)
);

-- ============================================================================
-- 5. Create story_generation_logs table
-- ============================================================================
CREATE TABLE IF NOT EXISTS story_generation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  theme_id UUID REFERENCES themes(id) ON DELETE CASCADE,
  user_story_id UUID REFERENCES user_stories(id) ON DELETE SET NULL,

  -- Generation details
  model_used TEXT NOT NULL,  -- 'gpt-4', 'gpt-4-turbo', etc.
  tokens_used INTEGER,
  generation_time_ms INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,

  -- Result
  success BOOLEAN NOT NULL,
  error_message TEXT,
  error_stack TEXT,

  -- Input context
  input_context JSONB DEFAULT '{}'::jsonb,  -- Theme data, feedback count, etc.

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. Create story_feedback_links table
-- Many-to-many relationship between stories and feedback items
-- ============================================================================
CREATE TABLE IF NOT EXISTS story_feedback_links (
  story_id UUID NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,
  feedback_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  relevance_score DECIMAL(3,2) CHECK (relevance_score >= 0 AND relevance_score <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (story_id, feedback_id)
);

-- ============================================================================
-- 7. Create indexes for performance
-- ============================================================================

-- User Stories indexes
CREATE INDEX IF NOT EXISTS idx_user_stories_project_id ON user_stories(project_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_theme_id ON user_stories(theme_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_sprint_id ON user_stories(sprint_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_sprint_status ON user_stories(sprint_status);
CREATE INDEX IF NOT EXISTS idx_user_stories_priority_level ON user_stories(priority_level);
CREATE INDEX IF NOT EXISTS idx_user_stories_exported_to_jira ON user_stories(exported_to_jira);
CREATE INDEX IF NOT EXISTS idx_user_stories_story_points ON user_stories(story_points);
CREATE INDEX IF NOT EXISTS idx_user_stories_created_at ON user_stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_stories_jira_issue_key ON user_stories(jira_issue_key) WHERE jira_issue_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_stories_labels ON user_stories USING GIN(labels);

-- Sprints indexes
CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status);
CREATE INDEX IF NOT EXISTS idx_sprints_start_date ON sprints(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_sprints_sprint_number ON sprints(sprint_number);

-- Story Templates indexes
CREATE INDEX IF NOT EXISTS idx_story_templates_project_id ON story_templates(project_id);
CREATE INDEX IF NOT EXISTS idx_story_templates_category ON story_templates(category);
CREATE INDEX IF NOT EXISTS idx_story_templates_usage_count ON story_templates(usage_count DESC);

-- Story Generation Logs indexes
CREATE INDEX IF NOT EXISTS idx_story_generation_logs_project_id ON story_generation_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_story_generation_logs_theme_id ON story_generation_logs(theme_id);
CREATE INDEX IF NOT EXISTS idx_story_generation_logs_success ON story_generation_logs(success);
CREATE INDEX IF NOT EXISTS idx_story_generation_logs_created_at ON story_generation_logs(created_at DESC);

-- Story Feedback Links indexes
CREATE INDEX IF NOT EXISTS idx_story_feedback_links_story_id ON story_feedback_links(story_id);
CREATE INDEX IF NOT EXISTS idx_story_feedback_links_feedback_id ON story_feedback_links(feedback_id);

-- ============================================================================
-- 8. Enable Row Level Security
-- ============================================================================
ALTER TABLE user_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_feedback_links ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 9. RLS Policies for user_stories
-- ============================================================================
DROP POLICY IF EXISTS "Users can view user stories for their projects" ON user_stories;
CREATE POLICY "Users can view user stories for their projects" ON user_stories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = user_stories.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert user stories for their projects" ON user_stories;
CREATE POLICY "Users can insert user stories for their projects" ON user_stories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = user_stories.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update user stories for their projects" ON user_stories;
CREATE POLICY "Users can update user stories for their projects" ON user_stories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = user_stories.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete user stories for their projects" ON user_stories;
CREATE POLICY "Users can delete user stories for their projects" ON user_stories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = user_stories.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to user stories" ON user_stories;
CREATE POLICY "Service role full access to user stories" ON user_stories
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 10. RLS Policies for sprints
-- ============================================================================
DROP POLICY IF EXISTS "Users can view sprints for their projects" ON sprints;
CREATE POLICY "Users can view sprints for their projects" ON sprints
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = sprints.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert sprints for their projects" ON sprints;
CREATE POLICY "Users can insert sprints for their projects" ON sprints
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = sprints.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update sprints for their projects" ON sprints;
CREATE POLICY "Users can update sprints for their projects" ON sprints
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = sprints.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete sprints for their projects" ON sprints;
CREATE POLICY "Users can delete sprints for their projects" ON sprints
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = sprints.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to sprints" ON sprints;
CREATE POLICY "Service role full access to sprints" ON sprints
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 11. RLS Policies for story_templates
-- ============================================================================
DROP POLICY IF EXISTS "Users can view story templates for their projects" ON story_templates;
CREATE POLICY "Users can view story templates for their projects" ON story_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = story_templates.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert story templates for their projects" ON story_templates;
CREATE POLICY "Users can insert story templates for their projects" ON story_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = story_templates.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update story templates for their projects" ON story_templates;
CREATE POLICY "Users can update story templates for their projects" ON story_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = story_templates.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete story templates for their projects" ON story_templates;
CREATE POLICY "Users can delete story templates for their projects" ON story_templates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = story_templates.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to story templates" ON story_templates;
CREATE POLICY "Service role full access to story templates" ON story_templates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 12. RLS Policies for story_generation_logs
-- ============================================================================
DROP POLICY IF EXISTS "Users can view story generation logs for their projects" ON story_generation_logs;
CREATE POLICY "Users can view story generation logs for their projects" ON story_generation_logs
  FOR SELECT USING (
    project_id IS NULL OR EXISTS (
      SELECT 1 FROM projects WHERE projects.id = story_generation_logs.project_id AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert story generation logs" ON story_generation_logs;
CREATE POLICY "System can insert story generation logs" ON story_generation_logs
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to story generation logs" ON story_generation_logs;
CREATE POLICY "Service role full access to story generation logs" ON story_generation_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 13. RLS Policies for story_feedback_links
-- ============================================================================
DROP POLICY IF EXISTS "Users can view story feedback links for their projects" ON story_feedback_links;
CREATE POLICY "Users can view story feedback links for their projects" ON story_feedback_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_stories us
      JOIN projects p ON us.project_id = p.id
      WHERE us.id = story_feedback_links.story_id AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert story feedback links for their projects" ON story_feedback_links;
CREATE POLICY "Users can insert story feedback links for their projects" ON story_feedback_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_stories us
      JOIN projects p ON us.project_id = p.id
      WHERE us.id = story_feedback_links.story_id AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete story feedback links for their projects" ON story_feedback_links;
CREATE POLICY "Users can delete story feedback links for their projects" ON story_feedback_links
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_stories us
      JOIN projects p ON us.project_id = p.id
      WHERE us.id = story_feedback_links.story_id AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to story feedback links" ON story_feedback_links;
CREATE POLICY "Service role full access to story feedback links" ON story_feedback_links
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 14. Create triggers for updated_at timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_user_stories_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_stories_timestamp_trigger ON user_stories;
CREATE TRIGGER update_user_stories_timestamp_trigger
  BEFORE UPDATE ON user_stories
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stories_timestamp();

DROP TRIGGER IF EXISTS update_sprints_timestamp_trigger ON sprints;
CREATE TRIGGER update_sprints_timestamp_trigger
  BEFORE UPDATE ON sprints
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stories_timestamp();

DROP TRIGGER IF EXISTS update_story_templates_timestamp_trigger ON story_templates;
CREATE TRIGGER update_story_templates_timestamp_trigger
  BEFORE UPDATE ON story_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stories_timestamp();

-- ============================================================================
-- 15. Create trigger to track manual edits
-- ============================================================================
CREATE OR REPLACE FUNCTION track_manual_edits()
RETURNS TRIGGER AS $$
BEGIN
  -- If certain fields are updated and story was AI-generated, mark as manually edited
  IF OLD.generated_by_ai = true AND (
    OLD.title != NEW.title OR
    OLD.user_type != NEW.user_type OR
    OLD.user_goal != NEW.user_goal OR
    OLD.user_benefit != NEW.user_benefit OR
    OLD.acceptance_criteria::text != NEW.acceptance_criteria::text OR
    OLD.story_points IS DISTINCT FROM NEW.story_points OR
    OLD.technical_notes IS DISTINCT FROM NEW.technical_notes
  ) THEN
    NEW.manually_edited = true;
    NEW.manually_edited_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_manual_edits_trigger ON user_stories;
CREATE TRIGGER track_manual_edits_trigger
  BEFORE UPDATE ON user_stories
  FOR EACH ROW
  EXECUTE FUNCTION track_manual_edits();

-- ============================================================================
-- 16. Create trigger to update sprint current_points
-- ============================================================================
CREATE OR REPLACE FUNCTION update_sprint_points()
RETURNS TRIGGER AS $$
DECLARE
  v_sprint_id UUID;
BEGIN
  -- Determine which sprint(s) to update
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    v_sprint_id := NEW.sprint_id;
  END IF;

  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.sprint_id IS DISTINCT FROM NEW.sprint_id) THEN
    -- Update old sprint if story was removed or moved
    IF OLD.sprint_id IS NOT NULL THEN
      UPDATE sprints
      SET current_points = (
        SELECT COALESCE(SUM(story_points), 0)
        FROM user_stories
        WHERE sprint_id = OLD.sprint_id
      )
      WHERE id = OLD.sprint_id;
    END IF;
  END IF;

  -- Update new sprint
  IF v_sprint_id IS NOT NULL THEN
    UPDATE sprints
    SET current_points = (
      SELECT COALESCE(SUM(story_points), 0)
      FROM user_stories
      WHERE sprint_id = v_sprint_id
    )
    WHERE id = v_sprint_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sprint_points_trigger ON user_stories;
CREATE TRIGGER update_sprint_points_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_stories
  FOR EACH ROW
  EXECUTE FUNCTION update_sprint_points();

-- ============================================================================
-- 17. Create helper functions
-- ============================================================================

-- Function to get user story statistics for a project
CREATE OR REPLACE FUNCTION get_user_story_stats(
  p_project_id UUID
)
RETURNS TABLE (
  total_stories BIGINT,
  stories_in_backlog BIGINT,
  stories_in_sprint BIGINT,
  total_story_points BIGINT,
  exported_to_jira BIGINT,
  ai_generated BIGINT,
  manually_edited BIGINT,
  avg_story_points DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_stories,
    COUNT(*) FILTER (WHERE sprint_status = 'backlog') as stories_in_backlog,
    COUNT(*) FILTER (WHERE sprint_id IS NOT NULL) as stories_in_sprint,
    COALESCE(SUM(story_points), 0) as total_story_points,
    COUNT(*) FILTER (WHERE exported_to_jira = true) as exported_to_jira,
    COUNT(*) FILTER (WHERE generated_by_ai = true) as ai_generated,
    COUNT(*) FILTER (WHERE manually_edited = true) as manually_edited,
    ROUND(AVG(story_points)::NUMERIC, 2) as avg_story_points
  FROM user_stories
  WHERE project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get sprint statistics
CREATE OR REPLACE FUNCTION get_sprint_stats(
  p_sprint_id UUID
)
RETURNS TABLE (
  total_stories BIGINT,
  total_points INTEGER,
  completed_stories BIGINT,
  completed_points INTEGER,
  in_progress_stories BIGINT,
  todo_stories BIGINT,
  capacity INTEGER,
  capacity_used_percent DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_stories,
    COALESCE(SUM(us.story_points), 0)::INTEGER as total_points,
    COUNT(*) FILTER (WHERE us.sprint_status = 'done') as completed_stories,
    COALESCE(SUM(us.story_points) FILTER (WHERE us.sprint_status = 'done'), 0)::INTEGER as completed_points,
    COUNT(*) FILTER (WHERE us.sprint_status = 'in_progress') as in_progress_stories,
    COUNT(*) FILTER (WHERE us.sprint_status = 'to_do') as todo_stories,
    s.capacity_points as capacity,
    CASE
      WHEN s.capacity_points > 0 THEN ROUND((COALESCE(SUM(us.story_points), 0) / s.capacity_points) * 100, 2)
      ELSE 0
    END as capacity_used_percent
  FROM sprints s
  LEFT JOIN user_stories us ON us.sprint_id = s.id
  WHERE s.id = p_sprint_id
  GROUP BY s.id, s.capacity_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate user story from theme (placeholder - actual implementation in API)
CREATE OR REPLACE FUNCTION create_user_story_from_theme(
  p_theme_id UUID,
  p_project_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_story_id UUID;
BEGIN
  -- This is a placeholder - actual AI generation happens via API
  -- This function just creates a basic story structure
  INSERT INTO user_stories (
    project_id,
    theme_id,
    title,
    user_type,
    user_goal,
    user_benefit,
    full_story,
    generated_by_ai,
    generation_timestamp
  )
  SELECT
    p_project_id,
    p_theme_id,
    'User Story: ' || t.theme_name,
    'user',
    'implement ' || t.theme_name,
    'improve the product',
    'As a user, I want to implement ' || t.theme_name || ' so that I can improve the product.',
    true,
    NOW()
  FROM themes t
  WHERE t.id = p_theme_id
  RETURNING id INTO v_story_id;

  RETURN v_story_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 18. Create views
-- ============================================================================

-- View for user stories with enriched data
CREATE OR REPLACE VIEW user_stories_with_details AS
SELECT
  us.*,
  t.theme_name,
  t.frequency as theme_frequency,
  s.sprint_name,
  s.sprint_number,
  s.start_date as sprint_start_date,
  s.end_date as sprint_end_date,
  p.name as project_name,
  (
    SELECT COUNT(*)
    FROM story_feedback_links sfl
    WHERE sfl.story_id = us.id
  ) as linked_feedback_count
FROM user_stories us
LEFT JOIN themes t ON us.theme_id = t.id
LEFT JOIN sprints s ON us.sprint_id = s.id
LEFT JOIN projects p ON us.project_id = p.id;

-- View for sprint planning dashboard
CREATE OR REPLACE VIEW sprint_planning_view AS
SELECT
  s.*,
  (
    SELECT COUNT(*)
    FROM user_stories
    WHERE sprint_id = s.id
  ) as story_count,
  (
    SELECT COUNT(*)
    FROM user_stories
    WHERE sprint_id = s.id AND sprint_status = 'done'
  ) as completed_story_count,
  (
    SELECT COALESCE(SUM(story_points), 0)
    FROM user_stories
    WHERE sprint_id = s.id AND sprint_status = 'done'
  ) as completed_points,
  CASE
    WHEN s.capacity_points > 0
    THEN ROUND((s.current_points::DECIMAL / s.capacity_points) * 100, 2)
    ELSE 0
  END as capacity_percentage
FROM sprints s;

-- View for backlog stories
CREATE OR REPLACE VIEW backlog_stories AS
SELECT
  us.*,
  t.theme_name,
  t.frequency as theme_frequency,
  t.avg_sentiment as theme_sentiment
FROM user_stories us
LEFT JOIN themes t ON us.theme_id = t.id
WHERE us.sprint_status = 'backlog'
ORDER BY us.priority_level, us.story_points DESC, us.created_at DESC;

-- ============================================================================
-- 19. Grant permissions
-- ============================================================================
GRANT SELECT ON user_stories_with_details TO authenticated;
GRANT SELECT ON user_stories_with_details TO service_role;
GRANT SELECT ON sprint_planning_view TO authenticated;
GRANT SELECT ON sprint_planning_view TO service_role;
GRANT SELECT ON backlog_stories TO authenticated;
GRANT SELECT ON backlog_stories TO service_role;

GRANT EXECUTE ON FUNCTION get_user_story_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_story_stats(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_sprint_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sprint_stats(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION create_user_story_from_theme(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_story_from_theme(UUID, UUID) TO service_role;

-- ============================================================================
-- 20. Add comments for documentation
-- ============================================================================
COMMENT ON TABLE user_stories IS 'AI-generated user stories from themes, sprint-ready with acceptance criteria';
COMMENT ON TABLE sprints IS 'Sprint planning and capacity management';
COMMENT ON TABLE story_templates IS 'Reusable templates for generating user stories';
COMMENT ON TABLE story_generation_logs IS 'Audit log of AI story generation attempts';
COMMENT ON TABLE story_feedback_links IS 'Links user stories to source feedback items for traceability';

COMMENT ON COLUMN user_stories.full_story IS 'Complete formatted user story: As a [user_type], I want [user_goal] so that [user_benefit]';
COMMENT ON COLUMN user_stories.acceptance_criteria IS 'Array of criterion objects with id, text, and details';
COMMENT ON COLUMN user_stories.story_points IS 'Fibonacci scale estimation: 1, 2, 3, 5, 8, 13, 21';
COMMENT ON COLUMN user_stories.complexity_score IS 'AI-calculated technical complexity (0-1)';
COMMENT ON COLUMN user_stories.uncertainty_score IS 'AI-calculated requirements uncertainty (0-1)';
COMMENT ON COLUMN user_stories.effort_score IS 'AI-calculated development effort (0-1)';
COMMENT ON COLUMN sprints.capacity_points IS 'Team velocity - total points the team can complete';
COMMENT ON COLUMN sprints.current_points IS 'Sum of story points currently in sprint';
