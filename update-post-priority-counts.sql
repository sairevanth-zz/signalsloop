-- Updates update_post_priority_counts to use unified vote priority data
CREATE OR REPLACE FUNCTION public.update_post_priority_counts(p_post_id UUID)
RETURNS VOID AS $$
DECLARE
  v_must_have INTEGER := 0;
  v_important INTEGER := 0;
  v_nice_to_have INTEGER := 0;
  v_total_score INTEGER := 0;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE COALESCE(v.priority, vm.priority) = 'must_have'),
    COUNT(*) FILTER (WHERE COALESCE(v.priority, vm.priority) = 'important'),
    COUNT(*) FILTER (WHERE COALESCE(v.priority, vm.priority) = 'nice_to_have')
  INTO v_must_have, v_important, v_nice_to_have
  FROM votes v
  LEFT JOIN vote_metadata vm ON vm.vote_id = v.id
  WHERE v.post_id = p_post_id;

  v_total_score := calculate_priority_score(
    COALESCE(v_must_have, 0),
    COALESCE(v_important, 0),
    COALESCE(v_nice_to_have, 0)
  );

  UPDATE posts SET
    must_have_votes = COALESCE(v_must_have, 0),
    important_votes = COALESCE(v_important, 0),
    nice_to_have_votes = COALESCE(v_nice_to_have, 0),
    total_priority_score = COALESCE(v_total_score, 0),
    updated_at = NOW()
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
