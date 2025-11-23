-- Fix Script: Drop and Recreate Problematic Functions
-- Run this BEFORE running the main migration if you're getting ORDER BY errors

-- Drop the functions that might be cached
DROP FUNCTION IF EXISTS get_experiment_full(UUID);
DROP FUNCTION IF EXISTS get_project_experiments_by_status(UUID, TEXT);
DROP FUNCTION IF EXISTS get_stakeholder_with_reports(UUID);
DROP FUNCTION IF EXISTS get_project_stakeholders(UUID);

-- Now run the migrations again
