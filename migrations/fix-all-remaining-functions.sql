-- Fix ALL Remaining Function Search Path Issues
-- This script adds SET search_path to ALL functions (not just SECURITY DEFINER)
-- to get Security Advisor to 100% clean
-- Run this in your Supabase SQL Editor

DO $$
DECLARE
  func RECORD;
  sql_cmd TEXT;
  success_count INTEGER := 0;
  skip_count INTEGER := 0;
  total_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Fixing ALL remaining function search_path issues...';
  RAISE NOTICE 'This includes trigger functions and regular functions.';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';

  -- Loop through ALL functions in public schema that don't have search_path set
  FOR func IN
    SELECT
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as function_args,
      CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security_type
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND NOT EXISTS (
      -- Skip functions that already have search_path set
      SELECT 1
      FROM unnest(p.proconfig) as config
      WHERE config LIKE 'search_path=%'
    )
    ORDER BY p.proname
  LOOP
    total_count := total_count + 1;

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

      success_count := success_count + 1;
      RAISE NOTICE '  ✅ Fixed: %.%(%s) [%]',
        func.schema_name,
        func.function_name,
        func.function_args,
        func.security_type;

    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue with other functions
      skip_count := skip_count + 1;
      RAISE NOTICE '  ⚠️  Skipped: %.%(%s): %',
        func.schema_name,
        func.function_name,
        func.function_args,
        SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  📊 Total functions processed: %', total_count;
  RAISE NOTICE '  ✅ Functions fixed: %', success_count;
  IF skip_count > 0 THEN
    RAISE NOTICE '  ⚠️  Functions skipped: %', skip_count;
  END IF;
  RAISE NOTICE '============================================================';
END $$;

-- ============================================================
-- Verification: Check ALL functions
-- ============================================================

SELECT
  n.nspname as schema,
  p.proname as function_name,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security_type,
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
AND p.prokind = 'f'  -- Only functions (not procedures, aggregates, etc)
ORDER BY status DESC, p.proname;

-- ============================================================
-- Final Summary with Statistics
-- ============================================================

DO $$
DECLARE
  total_functions INTEGER;
  fixed_functions INTEGER;
  missing_functions INTEGER;
  security_definer_count INTEGER;
  security_invoker_count INTEGER;
BEGIN
  -- Count total functions
  SELECT COUNT(*) INTO total_functions
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.prokind = 'f';

  -- Count functions with search_path set
  SELECT COUNT(*) INTO fixed_functions
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND EXISTS (
    SELECT 1
    FROM unnest(p.proconfig) as config
    WHERE config LIKE 'search_path=%'
  );

  -- Count SECURITY DEFINER functions
  SELECT COUNT(*) INTO security_definer_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND p.prosecdef = true
  AND EXISTS (
    SELECT 1
    FROM unnest(p.proconfig) as config
    WHERE config LIKE 'search_path=%'
  );

  -- Count SECURITY INVOKER functions
  SELECT COUNT(*) INTO security_invoker_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND p.prosecdef = false
  AND EXISTS (
    SELECT 1
    FROM unnest(p.proconfig) as config
    WHERE config LIKE 'search_path=%'
  );

  missing_functions := total_functions - fixed_functions;

  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '🎉 ALL FUNCTIONS SEARCH_PATH SECURITY FIX COMPLETE!';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total Functions: %', total_functions;
  RAISE NOTICE '✅ Functions with search_path: %', fixed_functions;
  RAISE NOTICE '   - SECURITY DEFINER: %', security_definer_count;
  RAISE NOTICE '   - SECURITY INVOKER (triggers/regular): %', security_invoker_count;

  IF missing_functions > 0 THEN
    RAISE NOTICE '⚠️  Functions still missing search_path: %', missing_functions;
    RAISE NOTICE '';
    RAISE NOTICE 'Check the query results above to see which functions still need fixing.';
    RAISE NOTICE 'These may be system functions or functions that cannot be altered.';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '🎉 100%% OF FUNCTIONS NOW HAVE SEARCH_PATH PROTECTION!';
    RAISE NOTICE '';
    RAISE NOTICE 'Your Security Advisor should now show:';
    RAISE NOTICE '  ✅ Function Search Path Mutable: 0 warnings';
    RAISE NOTICE '  ✅ RLS Disabled: 0 errors';
    RAISE NOTICE '  ⚠️  Security Definer View: 2 (intentional)';
    RAISE NOTICE '  ℹ️  Leaked Password: 1 (requires Pro plan)';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'This prevents search_path hijacking attacks on ALL functions.';
  RAISE NOTICE '============================================================';
END $$;
