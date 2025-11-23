#!/usr/bin/env tsx

/**
 * Apply Dynamic Roadmap Intelligence Migration
 *
 * This script applies the Dynamic Roadmap Intelligence migration which includes:
 * - roadmap_priority_history table (tracks priority changes)
 * - team_capacity table (team velocity metrics)
 * - feature_impact_history table (historical feature impact data)
 * - Helper functions for the Dynamic Roadmap Agent and Impact Simulator
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease ensure these are set in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🚀 Applying Dynamic Roadmap Intelligence Migration...\n');

  try {
    // Read migration file
    const migrationPath = resolve(__dirname, '../migrations/202511250000_dynamic_roadmap_intelligence.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('✓ Migration file loaded\n');

    console.log('⚙️  Applying migration via Supabase SQL Editor...\n');
    console.log('📋 INSTRUCTIONS:');
    console.log('1. Copy the SQL below (or use the migration file directly)');
    console.log('2. Go to your Supabase Dashboard → SQL Editor');
    console.log('3. Click "New Query"');
    console.log('4. Paste the SQL and click "Run"\n');
    console.log('─'.repeat(80));
    console.log('\nMIGRATION SQL:\n');
    console.log(migrationSQL);
    console.log('\n' + '─'.repeat(80));

    console.log('\n📝 After running the migration, also apply the fix:');
    console.log('   npx tsx scripts/fix-priority-history.ts\n');

    console.log('💡 TIP: The migrations are idempotent (use DROP IF EXISTS), so it\'s safe to run multiple times.\n');

    // Attempt to verify if tables exist
    console.log('🔍 Checking if tables already exist...\n');

    const tablesToCheck = [
      'roadmap_priority_history',
      'team_capacity',
      'feature_impact_history'
    ];

    for (const tableName of tablesToCheck) {
      const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);

      if (error) {
        if (error.message.includes('does not exist') || error.code === '42P01') {
          console.log(`   ❌ ${tableName} - NOT FOUND (needs migration)`);
        } else {
          console.log(`   ⚠️  ${tableName} - Error checking: ${error.message}`);
        }
      } else {
        console.log(`   ✓ ${tableName} - EXISTS (${data?.length || 0} records)`);
      }
    }

    console.log('\n📊 What This Migration Enables:\n');
    console.log('1. Priority History Viewer');
    console.log('   - Shows automatic priority adjustments by the Dynamic Roadmap Agent');
    console.log('   - Displays why priorities changed and what triggered changes\n');

    console.log('2. Impact Simulator');
    console.log('   - Predicts outcomes of building or deferring features');
    console.log('   - Shows sentiment, churn, adoption, and revenue impacts');
    console.log('   - Uses historical feature impact data for predictions\n');

    console.log('3. Team Capacity Planning');
    console.log('   - Tracks team velocity and capacity');
    console.log('   - Enables capacity-aware roadmap recommendations\n');

    console.log('✅ Next Steps After Migration:\n');
    console.log('1. The Priority History will populate automatically when:');
    console.log('   - The Dynamic Roadmap Agent runs (monitors feedback signals)');
    console.log('   - You manually adjust priorities\n');

    console.log('2. The Impact Simulator will show better predictions when you add:');
    console.log('   - Historical feature impact data to feature_impact_history table');
    console.log('   - Pre/post launch metrics for shipped features\n');

    console.log('3. Until then:');
    console.log('   - Impact Simulator uses conservative default estimates');
    console.log('   - Priority History shows "No changes in last 30 days"\n');

  } catch (error) {
    console.error('\n❌ Script error:', error);
    process.exit(1);
  }
}

// Run migration
applyMigration();
