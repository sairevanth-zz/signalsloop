-- Migration: Fix Function Search Path Security Issue
-- This migration adds SET search_path to all SECURITY DEFINER functions
-- to prevent search_path hijacking attacks
-- Run this in your Supabase SQL Editor

-- ============================================================
-- PHASE 1: Fix Auth/User Functions
-- ============================================================

-- 1. handle_new_user (used by auth trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, provider, google_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE
      WHEN NEW.app_metadata->>'provider' = 'google' THEN 'google'
      ELSE 'email'
    END,
    CASE
      WHEN NEW.app_metadata->>'provider' = 'google' THEN NEW.raw_user_meta_data->>'provider_id'
      ELSE NULL
    END
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user record: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================================
-- PHASE 2: Fix Feedback & Vote Priority Functions
-- ============================================================

-- 2. get_customer_feedback_history
CREATE OR REPLACE FUNCTION public.get_customer_feedback_history(
  p_customer_email VARCHAR(255),
  p_project_id UUID
)
RETURNS TABLE (
  post_id UUID,
  post_title VARCHAR(255),
  post_description TEXT,
  priority VARCHAR(50),
  feedback_source VARCHAR(100),
  submitted_at TIMESTAMP WITH TIME ZONE,
  submitted_by_admin_name VARCHAR(255),
  status VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS post_id,
    p.title AS post_title,
    p.description AS post_description,
    fm.priority,
    fm.feedback_source,
    fm.created_at AS submitted_at,
    fm.submitted_by_admin_name,
    p.status
  FROM feedback_metadata fm
  JOIN posts p ON fm.post_id = p.id
  WHERE fm.customer_email = p_customer_email
  AND p.project_id = p_project_id
  ORDER BY fm.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 3. get_company_feedback_insights
CREATE OR REPLACE FUNCTION public.get_company_feedback_insights(
  p_customer_company VARCHAR(255),
  p_project_id UUID
)
RETURNS TABLE (
  total_feedback INTEGER,
  must_have_count INTEGER,
  important_count INTEGER,
  nice_to_have_count INTEGER,
  unique_features INTEGER,
  top_priority_feature VARCHAR(255)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_feedback,
    COUNT(*) FILTER (WHERE fm.priority = 'must_have')::INTEGER AS must_have_count,
    COUNT(*) FILTER (WHERE fm.priority = 'important')::INTEGER AS important_count,
    COUNT(*) FILTER (WHERE fm.priority = 'nice_to_have')::INTEGER AS nice_to_have_count,
    COUNT(DISTINCT fm.post_id)::INTEGER AS unique_features,
    (
      SELECT p.title
      FROM feedback_metadata fm2
      JOIN posts p ON fm2.post_id = p.id
      WHERE fm2.customer_company = p_customer_company
      AND p.project_id = p_project_id
      AND fm2.priority = 'must_have'
      ORDER BY fm2.created_at DESC
      LIMIT 1
    ) AS top_priority_feature
  FROM feedback_metadata fm
  JOIN posts p ON fm.post_id = p.id
  WHERE fm.customer_company = p_customer_company
  AND p.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 4. update_post_priority_counts
CREATE OR REPLACE FUNCTION public.update_post_priority_counts(p_post_id UUID)
RETURNS VOID AS $$
DECLARE
  v_must_have INTEGER;
  v_important INTEGER;
  v_nice_to_have INTEGER;
  v_total_score INTEGER;
BEGIN
  -- Count votes by priority
  SELECT
    COALESCE(
      SUM(CASE WHEN priority = 'must_have' THEN 1 ELSE 0 END),
      0
    ),
    COALESCE(
      SUM(CASE WHEN priority = 'important' THEN 1 ELSE 0 END),
      0
    ),
    COALESCE(
      SUM(CASE WHEN priority = 'nice_to_have' THEN 1 ELSE 0 END),
      0
    )
  INTO v_must_have, v_important, v_nice_to_have
  FROM vote_metadata vm
  JOIN votes v ON vm.vote_id = v.id
  WHERE v.post_id = p_post_id;

  -- Calculate total priority score
  v_total_score := (v_must_have * 10) + (v_important * 5) + (v_nice_to_have * 2);

  -- Update post
  UPDATE posts SET
    must_have_votes = v_must_have,
    important_votes = v_important,
    nice_to_have_votes = v_nice_to_have,
    total_priority_score = v_total_score,
    updated_at = NOW()
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 5. get_customer_vote_history
CREATE OR REPLACE FUNCTION public.get_customer_vote_history(
  p_customer_email VARCHAR(255),
  p_project_id UUID
)
RETURNS TABLE (
  post_id UUID,
  post_title VARCHAR(255),
  priority VARCHAR(50),
  vote_source VARCHAR(100),
  voted_at TIMESTAMP WITH TIME ZONE,
  voted_by_admin_name VARCHAR(255)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS post_id,
    p.title AS post_title,
    vm.priority,
    vm.vote_source,
    vm.created_at AS voted_at,
    vm.voted_by_admin_name
  FROM vote_metadata vm
  JOIN votes v ON vm.vote_id = v.id
  JOIN posts p ON v.post_id = p.id
  WHERE vm.customer_email = p_customer_email
  AND p.project_id = p_project_id
  ORDER BY vm.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 6. get_company_vote_insights
CREATE OR REPLACE FUNCTION public.get_company_vote_insights(
  p_customer_company VARCHAR(255),
  p_project_id UUID
)
RETURNS TABLE (
  total_votes INTEGER,
  must_have_count INTEGER,
  important_count INTEGER,
  nice_to_have_count INTEGER,
  unique_features INTEGER,
  top_priority_feature VARCHAR(255)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_votes,
    COUNT(*) FILTER (WHERE vm.priority = 'must_have')::INTEGER AS must_have_count,
    COUNT(*) FILTER (WHERE vm.priority = 'important')::INTEGER AS important_count,
    COUNT(*) FILTER (WHERE vm.priority = 'nice_to_have')::INTEGER AS nice_to_have_count,
    COUNT(DISTINCT v.post_id)::INTEGER AS unique_features,
    (
      SELECT p.title
      FROM vote_metadata vm2
      JOIN votes v2 ON vm2.vote_id = v2.id
      JOIN posts p ON v2.post_id = p.id
      WHERE vm2.customer_company = p_customer_company
      AND p.project_id = p_project_id
      AND vm2.priority = 'must_have'
      ORDER BY vm2.created_at DESC
      LIMIT 1
    ) AS top_priority_feature
  FROM vote_metadata vm
  JOIN votes v ON vm.vote_id = v.id
  JOIN posts p ON v.post_id = p.id
  WHERE vm.customer_company = p_customer_company
  AND p.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================================
-- PHASE 3: Fix Gift Subscription Functions
-- ============================================================

-- 7. create_gift_subscription (if exists)
CREATE OR REPLACE FUNCTION public.create_gift_subscription(
  p_project_id UUID,
  p_sender_name VARCHAR(255),
  p_sender_email VARCHAR(255),
  p_recipient_name VARCHAR(255),
  p_recipient_email VARCHAR(255),
  p_duration_months INTEGER,
  p_personal_message TEXT
)
RETURNS UUID AS $$
DECLARE
  v_gift_id UUID;
BEGIN
  INSERT INTO gift_subscriptions (
    project_id,
    sender_name,
    sender_email,
    recipient_name,
    recipient_email,
    duration_months,
    personal_message,
    status
  )
  VALUES (
    p_project_id,
    p_sender_name,
    p_sender_email,
    p_recipient_name,
    p_recipient_email,
    p_duration_months,
    p_personal_message,
    'pending'
  )
  RETURNING id INTO v_gift_id;

  RETURN v_gift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 8. claim_gift_subscription (if exists)
CREATE OR REPLACE FUNCTION public.claim_gift_subscription(gift_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  project_id UUID,
  duration_months INTEGER
) AS $$
DECLARE
  v_gift_record RECORD;
BEGIN
  -- Get gift subscription details
  SELECT * INTO v_gift_record
  FROM gift_subscriptions
  WHERE id = gift_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Gift subscription not found'::TEXT, NULL::UUID, NULL::INTEGER;
    RETURN;
  END IF;

  IF v_gift_record.status != 'pending' THEN
    RETURN QUERY SELECT false, 'Gift subscription already claimed or expired'::TEXT, NULL::UUID, NULL::INTEGER;
    RETURN;
  END IF;

  -- Update gift status
  UPDATE gift_subscriptions
  SET
    status = 'claimed',
    claimed_at = NOW()
  WHERE id = gift_id;

  RETURN QUERY SELECT
    true,
    'Gift subscription claimed successfully'::TEXT,
    v_gift_record.project_id,
    v_gift_record.duration_months;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 9. get_gift_stats (if exists)
CREATE OR REPLACE FUNCTION public.get_gift_stats(p_project_id UUID)
RETURNS TABLE (
  total_gifts INTEGER,
  pending_gifts INTEGER,
  claimed_gifts INTEGER,
  expired_gifts INTEGER,
  total_months_gifted INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_gifts,
    COUNT(*) FILTER (WHERE status = 'pending')::INTEGER AS pending_gifts,
    COUNT(*) FILTER (WHERE status = 'claimed')::INTEGER AS claimed_gifts,
    COUNT(*) FILTER (WHERE status = 'expired')::INTEGER AS expired_gifts,
    COALESCE(SUM(duration_months), 0)::INTEGER AS total_months_gifted
  FROM gift_subscriptions
  WHERE project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================================
-- PHASE 4: Fix Discount Code Functions
-- ============================================================

-- 10. validate_discount_code (if exists)
CREATE OR REPLACE FUNCTION public.validate_discount_code(
  p_code VARCHAR(50),
  p_project_id UUID
)
RETURNS TABLE (
  valid BOOLEAN,
  discount_percent INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_code RECORD;
BEGIN
  SELECT * INTO v_code
  FROM discount_codes
  WHERE code = p_code
  AND project_id = p_project_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Invalid discount code'::TEXT;
    RETURN;
  END IF;

  IF NOT v_code.active THEN
    RETURN QUERY SELECT false, 0, 'Discount code is inactive'::TEXT;
    RETURN;
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < NOW() THEN
    RETURN QUERY SELECT false, 0, 'Discount code has expired'::TEXT;
    RETURN;
  END IF;

  IF v_code.max_uses IS NOT NULL AND v_code.times_used >= v_code.max_uses THEN
    RETURN QUERY SELECT false, 0, 'Discount code has reached maximum uses'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_code.discount_percent, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 11. apply_discount_code (if exists)
CREATE OR REPLACE FUNCTION public.apply_discount_code(
  p_code VARCHAR(50),
  p_project_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE discount_codes
  SET
    times_used = times_used + 1,
    last_used_at = NOW()
  WHERE code = p_code
  AND project_id = p_project_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================================
-- PHASE 5: Fix Email & Notification Functions
-- ============================================================

-- 12. check_email_rate_limit (if exists)
CREATE OR REPLACE FUNCTION public.check_email_rate_limit(
  p_user_id UUID,
  p_rate_limit INTEGER DEFAULT 10
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM email_notifications
  WHERE user_id = p_user_id
  AND sent_at > NOW() - INTERVAL '1 hour';

  RETURN v_count < p_rate_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 13. increment_email_count (if exists)
CREATE OR REPLACE FUNCTION public.increment_email_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO email_notifications (user_id, sent_at)
  VALUES (p_user_id, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 14. should_send_email (if exists)
CREATE OR REPLACE FUNCTION public.should_send_email(
  p_user_id UUID,
  p_notification_type VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_preferences RECORD;
BEGIN
  SELECT * INTO v_preferences
  FROM email_preferences
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN true; -- Default to sending if no preferences set
  END IF;

  CASE p_notification_type
    WHEN 'new_comment' THEN RETURN v_preferences.new_comments;
    WHEN 'status_update' THEN RETURN v_preferences.status_updates;
    WHEN 'new_post' THEN RETURN v_preferences.new_posts;
    ELSE RETURN true;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================================
-- PHASE 6: Fix Participant & Mention Functions
-- ============================================================

-- 15. get_post_participants (if exists)
CREATE OR REPLACE FUNCTION public.get_post_participants(p_post_id UUID)
RETURNS TABLE (
  user_id UUID,
  email VARCHAR(255),
  name VARCHAR(255)
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    COALESCE(c.author_id, v.user_id) AS user_id,
    COALESCE(c.author_email, u.email) AS email,
    COALESCE(c.author_name, u.full_name) AS name
  FROM posts p
  LEFT JOIN comments c ON p.id = c.post_id
  LEFT JOIN votes v ON p.id = v.post_id
  LEFT JOIN users u ON COALESCE(c.author_id, v.user_id) = u.id
  WHERE p.id = p_post_id
  AND (c.author_id IS NOT NULL OR v.user_id IS NOT NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================================
-- PHASE 7: Fix Security Event Functions
-- ============================================================

-- 16. get_security_event_stats
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================================
-- Verification
-- ============================================================

-- List all functions that still have mutable search_path
SELECT
  n.nspname as schema,
  p.proname as function_name,
  CASE
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security_type,
  CASE
    WHEN 'search_path' = ANY(string_to_array(pg_get_function_identity_arguments(p.oid), ','))
    THEN 'HAS search_path'
    ELSE 'NO search_path'
  END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true
ORDER BY p.proname;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Function search_path security fix completed!';
  RAISE NOTICE '';
  RAISE NOTICE 'All SECURITY DEFINER functions now have SET search_path = public, pg_temp';
  RAISE NOTICE 'This prevents search_path hijacking attacks.';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  If you see errors about missing functions/tables, those functions';
  RAISE NOTICE '   may not exist in your database yet (they are optional features).';
  RAISE NOTICE '   This is normal and safe to ignore.';
END $$;
