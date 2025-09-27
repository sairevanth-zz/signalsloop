-- Enhanced Roadmap RLS Policies
-- Run this AFTER the basic schema migration is successful

-- Check if is_private column exists before creating policies
DO $$
BEGIN
    -- Only create policies if the is_private column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND column_name = 'is_private'
    ) THEN
        
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Anyone can subscribe to public roadmap updates" ON roadmap_subscriptions;
        DROP POLICY IF EXISTS "Project owners can view subscriptions" ON roadmap_subscriptions;
        DROP POLICY IF EXISTS "Anyone can add feedback to public roadmap posts" ON roadmap_feedback;
        DROP POLICY IF EXISTS "Anyone can view feedback on public posts" ON roadmap_feedback;
        DROP POLICY IF EXISTS "Project owners can manage feedback" ON roadmap_feedback;

        -- Add RLS policies for roadmap_subscriptions
        CREATE POLICY "Anyone can subscribe to public roadmap updates" ON roadmap_subscriptions
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM projects p 
              WHERE p.id = roadmap_subscriptions.project_id 
              AND p.is_private = false
            )
          );

        CREATE POLICY "Project owners can view subscriptions" ON roadmap_subscriptions
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM projects p 
              WHERE p.id = roadmap_subscriptions.project_id 
              AND p.owner_id = auth.uid()
            )
          );

        -- Add RLS policies for roadmap_feedback
        CREATE POLICY "Anyone can add feedback to public roadmap posts" ON roadmap_feedback
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM posts po
              JOIN projects pr ON po.project_id = pr.id
              WHERE po.id = roadmap_feedback.post_id 
              AND pr.is_private = false
            )
          );

        CREATE POLICY "Anyone can view feedback on public posts" ON roadmap_feedback
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM posts po
              JOIN projects pr ON po.project_id = pr.id
              WHERE po.id = roadmap_feedback.post_id 
              AND pr.is_private = false
            )
          );

        CREATE POLICY "Project owners can manage feedback" ON roadmap_feedback
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM posts po
              JOIN projects pr ON po.project_id = pr.id
              WHERE po.id = roadmap_feedback.post_id 
              AND pr.owner_id = auth.uid()
            )
          );

        RAISE NOTICE 'RLS policies created successfully';
        
    ELSE
        RAISE NOTICE 'is_private column not found in projects table. Skipping RLS policy creation.';
    END IF;
END $$;
