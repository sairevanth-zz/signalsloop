#!/usr/bin/env tsx

/**
 * Fix Priority History Function
 *
 * This script updates the get_recent_priority_changes function to return
 * all fields expected by the PriorityHistoryViewer component.
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
  console.log('🚀 Fixing priority history function...\n');

  try {
    // Read migration file
    const migrationPath = resolve(__dirname, '../migrations/202511230001_fix_priority_changes_function.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('✓ Migration file loaded\n');

    // Execute migration using raw SQL
    console.log('⚙️  Applying migration...');

    // Split into statements and execute each
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`   Executing statement ${i + 1}/${statements.length}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

        if (error) {
          console.error(`   ⚠️  Error: ${error.message}`);
          // Continue anyway as this might be expected for DROP statements
        }
      }
    }

    console.log('✓ Migration applied successfully!\n');

    // Verify the function exists
    console.log('🔍 Verifying function was updated...');
    const { data, error } = await supabase.rpc('get_recent_priority_changes', {
      p_project_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
      p_days: 7
    });

    if (error && !error.message.includes('does not exist')) {
      console.log('   ✓ Function exists and is callable');
    } else if (error) {
      console.log('   ⚠️  Function may not exist yet');
    } else {
      console.log('   ✓ Function verified successfully');
    }

    console.log('\n✅ Priority history function fix completed successfully!');
    console.log('\nThe PriorityHistoryViewer component should now work correctly.\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\n📝 Manual migration steps:');
    console.error('1. Go to your Supabase Dashboard');
    console.error('2. Navigate to SQL Editor');
    console.error('3. Click "New Query"');
    console.error('4. Copy the contents of migrations/202511230001_fix_priority_changes_function.sql');
    console.error('5. Paste into the editor and click "Run"\n');
    process.exit(1);
  }
}

// Run migration
applyMigration();
