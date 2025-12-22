-- Fix for update_platform_stats function
-- Run this in Supabase SQL Editor to fix scan counter going down

-- First, check the current function:
-- SELECT proname, prosrc FROM pg_proc WHERE proname = 'update_platform_stats';

-- Drop and recreate with correct logic
CREATE OR REPLACE FUNCTION update_platform_stats(
  p_integration_id UUID,
  p_success BOOLEAN,
  p_items_found INTEGER,
  p_error_message TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE platform_integrations
  SET
    -- INCREMENT total_scans (was possibly decrementing before)
    total_scans = COALESCE(total_scans, 0) + 1,
    successful_scans = CASE 
      WHEN p_success THEN COALESCE(successful_scans, 0) + 1 
      ELSE successful_scans 
    END,
    failed_scans = CASE 
      WHEN NOT p_success THEN COALESCE(failed_scans, 0) + 1 
      ELSE failed_scans 
    END,
    total_items_found = COALESCE(total_items_found, 0) + p_items_found,
    last_scan_at = NOW(),
    last_error = CASE WHEN p_success THEN NULL ELSE p_error_message END,
    health_status = CASE 
      WHEN p_success THEN 'healthy'
      ELSE 'error'
    END,
    last_scan_status = CASE 
      WHEN p_success THEN 'success'
      ELSE 'failed'
    END,
    updated_at = NOW()
  WHERE id = p_integration_id;
END;
$$ LANGUAGE plpgsql;

-- Verify the function was updated:
-- SELECT proname, prosrc FROM pg_proc WHERE proname = 'update_platform_stats';
