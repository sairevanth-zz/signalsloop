-- Add missing platform types to the database enum
-- Run this in Supabase SQL Editor

-- Add 'capterra' to platform_type enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'capterra' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'platform_type')
  ) THEN
    ALTER TYPE platform_type ADD VALUE 'capterra';
  END IF;
END $$;

-- Add 'trustpilot' to platform_type enum if not exists  
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'trustpilot' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'platform_type')
  ) THEN
    ALTER TYPE platform_type ADD VALUE 'trustpilot';
  END IF;
END $$;

-- Verify the enum values
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'platform_type')
ORDER BY enumsortorder;
