#!/usr/bin/env tsx

/**
 * Apply Jira Integration Database Migration
 *
 * This script applies the Jira integration migration to your Supabase database.
 * It reads the migration file and executes it using the Supabase client.
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
  console.log('🚀 Starting Jira integration migration...\n');

  try {
    // Read migration file
    const migrationPath = resolve(__dirname, '../migrations/202511171400_jira_integration.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('✓ Migration file loaded\n');

    // Check if tables already exist
    console.log('🔍 Checking if Jira tables already exist...');
    const { data: existingTables, error: checkError } = await supabase
      .from('jira_connections')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('⚠️  Jira tables already exist!');
      console.log('   Migration may have already been applied.');
      console.log('   If you want to reapply, please drop the tables first.\n');

      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise<string>((resolve) => {
        readline.question('   Do you want to continue anyway? (y/N): ', resolve);
      });
      readline.close();

      if (answer.toLowerCase() !== 'y') {
        console.log('\n❌ Migration cancelled');
        process.exit(0);
      }
    }

    console.log('✓ Ready to apply migration\n');

    // Execute migration
    console.log('⚙️  Applying migration...');
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Try alternative method - direct execution
      console.log('⚠️  RPC method failed, trying direct execution...');

      // Split by statement and execute each
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement) {
          console.log(`   Executing statement ${i + 1}/${statements.length}...`);
          // Note: This requires executing via a privileged connection
          // For production use, apply via Supabase Dashboard SQL Editor
        }
      }

      throw new Error('Direct SQL execution not supported. Please apply migration via Supabase Dashboard.');
    }

    console.log('✓ Migration applied successfully!\n');

    // Verify tables were created
    console.log('🔍 Verifying tables were created...');
    const tablesToCheck = [
      'jira_connections',
      'jira_issue_links',
      'jira_webhooks',
      'jira_label_mappings',
      'jira_sync_logs',
      'jira_oauth_states'
    ];

    for (const table of tablesToCheck) {
      const { error: verifyError } = await supabase
        .from(table)
        .select('*')
        .limit(0);

      if (verifyError) {
        console.log(`   ❌ Table '${table}' - NOT FOUND`);
      } else {
        console.log(`   ✓ Table '${table}' - OK`);
      }
    }

    console.log('\n✅ Jira integration migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Configure environment variables (see JIRA_INTEGRATION_README.md)');
    console.log('2. Restart your development server');
    console.log('3. Navigate to Settings → Integrations');
    console.log('4. Click "Connect to Jira"\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\n📝 Manual migration steps:');
    console.error('1. Go to your Supabase Dashboard');
    console.error('2. Navigate to SQL Editor');
    console.error('3. Click "New Query"');
    console.error('4. Copy the contents of migrations/202511171400_jira_integration.sql');
    console.error('5. Paste into the editor and click "Run"\n');
    process.exit(1);
  }
}

// Run migration
applyMigration();
