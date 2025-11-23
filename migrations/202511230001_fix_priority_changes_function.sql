-- =====================================================
-- Fix get_recent_priority_changes Function
-- =====================================================
-- Updates the function to return all fields expected by the UI

DROP FUNCTION IF EXISTS get_recent_priority_changes(UUID, INT);

CREATE OR REPLACE FUNCTION get_recent_priority_changes(
    p_project_id UUID,
    p_days INT DEFAULT 7
)
RETURNS TABLE (
    id UUID,
    theme_name TEXT,
    old_priority TEXT,
    new_priority TEXT,
    old_score DECIMAL,
    new_score DECIMAL,
    score_change DECIMAL,
    adjustment_reason TEXT,
    triggers TEXT[],
    adjustment_type TEXT,
    adjusted_by_agent TEXT,
    created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        rph.id,
        rph.theme_name,
        rph.old_priority,
        rph.new_priority,
        rph.old_score,
        rph.new_score,
        rph.score_change,
        rph.adjustment_reason,
        rph.triggers,
        rph.adjustment_type,
        rph.adjusted_by_agent,
        rph.created_at
    FROM roadmap_priority_history rph
    WHERE rph.project_id = p_project_id
      AND rph.created_at >= NOW() - (p_days || ' days')::INTERVAL
    ORDER BY rph.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_recent_priority_changes IS 'Get priority changes for a project in the last N days with all fields';
