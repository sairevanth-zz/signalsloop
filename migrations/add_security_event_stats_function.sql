-- Optional: Create a function to get security event statistics
-- This can be used by the admin dashboard

CREATE OR REPLACE FUNCTION get_security_event_stats()
RETURNS TABLE (
  total_events BIGINT,
  critical_events BIGINT,
  high_events BIGINT,
  medium_events BIGINT,
  low_events BIGINT,
  events_last_24h BIGINT,
  events_last_7d BIGINT,
  top_event_types JSONB,
  events_by_day JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH event_counts AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE severity = 'critical') as critical,
      COUNT(*) FILTER (WHERE severity = 'high') as high,
      COUNT(*) FILTER (WHERE severity = 'medium') as medium,
      COUNT(*) FILTER (WHERE severity = 'low') as low,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as last_24h,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_7d
    FROM security_events
  ),
  top_types AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'type', type,
        'count', count
      ) ORDER BY count DESC
    ) as types
    FROM (
      SELECT type, COUNT(*) as count
      FROM security_events
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY type
      ORDER BY count DESC
      LIMIT 10
    ) t
  ),
  daily_counts AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', day,
        'count', count
      ) ORDER BY day DESC
    ) as days
    FROM (
      SELECT
        DATE(created_at) as day,
        COUNT(*) as count
      FROM security_events
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY day DESC
    ) d
  )
  SELECT
    ec.total,
    ec.critical,
    ec.high,
    ec.medium,
    ec.low,
    ec.last_24h,
    ec.last_7d,
    COALESCE(tt.types, '[]'::jsonb),
    COALESCE(dc.days, '[]'::jsonb)
  FROM event_counts ec
  CROSS JOIN top_types tt
  CROSS JOIN daily_counts dc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role only
GRANT EXECUTE ON FUNCTION get_security_event_stats() TO service_role;

-- Add comment
COMMENT ON FUNCTION get_security_event_stats() IS 'Returns statistics about security events for admin dashboard';
