-- Migration: Fix Function Search Path Security Issue (SAFE VERSION)
-- This migration adds SET search_path to all SECURITY DEFINER functions
-- without recreating them (uses ALTER FUNCTION instead)
-- Run this in your Supabase SQL Editor

-- ============================================================
-- APPROACH: Use ALTER FUNCTION to add search_path attribute
-- This is safer than CREATE OR REPLACE because it doesn't
-- require matching the exact function signature.
-- ============================================================

DO $$
DECLARE
  func RECORD;
  sql_cmd TEXT;
BEGIN
  -- Loop through all SECURITY DEFINER functions in public schema
  FOR func IN
    SELECT
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as function_args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prosecdef = true  -- SECURITY DEFINER functions only
    AND NOT EXISTS (
      -- Skip functions that already have search_path set
      SELECT 1
      FROM unnest(p.proconfig) as config
      WHERE config LIKE 'search_path=%'
    )
  LOOP
    BEGIN
      -- Build ALTER FUNCTION command
      sql_cmd := format(
        'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
        func.schema_name,
        func.function_name,
        func.function_args
      );

      -- Execute the ALTER command
      EXECUTE sql_cmd;

      RAISE NOTICE '✅ Fixed: %.%(%)',
        func.schema_name,
        func.function_name,
        func.function_args;

    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue with other functions
      RAISE NOTICE '⚠️  Skipped: %.%(%): %',
        func.schema_name,
        func.function_name,
        func.function_args,
        SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================
-- Verification: List all SECURITY DEFINER functions
-- ============================================================

SELECT
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM unnest(p.proconfig) as config
      WHERE config LIKE 'search_path=%'
    )
    THEN '✅ HAS search_path'
    ELSE '❌ MISSING search_path'
  END as status,
  (
    SELECT config
    FROM unnest(p.proconfig) as config
    WHERE config LIKE 'search_path=%'
    LIMIT 1
  ) as search_path_value
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true
ORDER BY p.proname;

-- ============================================================
-- Success Message
-- ============================================================

DO $$
DECLARE
  total_functions INTEGER;
  fixed_functions INTEGER;
  missing_functions INTEGER;
BEGIN
  -- Count total SECURITY DEFINER functions
  SELECT COUNT(*) INTO total_functions
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.prosecdef = true;

  -- Count functions with search_path set
  SELECT COUNT(*) INTO fixed_functions
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND EXISTS (
    SELECT 1
    FROM unnest(p.proconfig) as config
    WHERE config LIKE 'search_path=%'
  );

  missing_functions := total_functions - fixed_functions;

  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ Function search_path security fix completed!';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total SECURITY DEFINER functions: %', total_functions;
  RAISE NOTICE '✅ Functions with search_path set: %', fixed_functions;
  IF missing_functions > 0 THEN
    RAISE NOTICE '⚠️  Functions still missing search_path: %', missing_functions;
    RAISE NOTICE '';
    RAISE NOTICE 'Check the query results above to see which functions still need fixing.';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '🎉 All SECURITY DEFINER functions now have search_path protection!';
  END IF;
  RAISE NOTICE '';
  RAISE NOTICE 'This prevents search_path hijacking attacks.';
  RAISE NOTICE '============================================================';
END $$;
