#!/usr/bin/env node

/**
 * Test script to verify database schema for trial functionality
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE are set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function testDatabaseSchema() {
  console.log('🔍 Testing Database Schema for Trial Functionality');
  console.log('=================================================');
  
  try {
    // Check if trial columns exist in projects table
    console.log('📋 Checking trial columns in projects table...');
    
    const { data, error } = await supabase
      .from('projects')
      .select('id, trial_start_date, trial_end_date, trial_status, is_trial, trial_cancelled_at')
      .limit(1);
    
    if (error) {
      if (error.code === '42703') {
        console.log('❌ Trial columns do not exist in projects table');
        console.log('📝 You need to run the database migration:');
        console.log('');
        console.log('Run this SQL in your Supabase SQL Editor:');
        console.log(`
-- Add trial tracking fields to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS trial_cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS trial_status VARCHAR(50) DEFAULT 'none';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false;

-- Add comments for trial fields
COMMENT ON COLUMN projects.trial_start_date IS 'When the trial period started';
COMMENT ON COLUMN projects.trial_end_date IS 'When the trial period ends';
COMMENT ON COLUMN projects.trial_cancelled_at IS 'When the trial was cancelled by user';
COMMENT ON COLUMN projects.trial_status IS 'Trial status: none, active, cancelled, expired, converted';
COMMENT ON COLUMN projects.is_trial IS 'Whether the current subscription is in trial period';

-- Create index for trial lookups
CREATE INDEX IF NOT EXISTS idx_projects_trial_status ON projects(trial_status);
CREATE INDEX IF NOT EXISTS idx_projects_trial_end_date ON projects(trial_end_date) WHERE trial_end_date IS NOT NULL;

-- Update existing projects with default trial values
UPDATE projects SET
  trial_status = 'none',
  is_trial = false
WHERE trial_status IS NULL
   OR is_trial IS NULL;
        `);
        return false;
      } else {
        console.error('❌ Database error:', error);
        return false;
      }
    }
    
    console.log('✅ Trial columns exist in projects table');
    console.log('📊 Sample data:', data[0] || 'No projects found');
    
    // Check if domain_verifications table exists
    console.log('📋 Checking domain_verifications table...');
    
    const { data: domainData, error: domainError } = await supabase
      .from('domain_verifications')
      .select('id')
      .limit(1);
    
    if (domainError) {
      if (domainError.code === '42P01') {
        console.log('⚠️  domain_verifications table does not exist (this is optional for trials)');
      } else {
        console.error('❌ Database error:', domainError);
        return false;
      }
    } else {
      console.log('✅ domain_verifications table exists');
    }
    
    console.log('');
    console.log('🎉 Database schema is ready for trial functionality!');
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Run the test
testDatabaseSchema().then(success => {
  if (success) {
    console.log('');
    console.log('✅ Database is ready! You can now test the trial functionality.');
  } else {
    console.log('');
    console.log('❌ Database migration needed. Please run the SQL above in Supabase.');
  }
}).catch(console.error);
