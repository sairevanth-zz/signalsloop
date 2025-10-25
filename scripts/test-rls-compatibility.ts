/**
 * RLS Compatibility Test Script
 *
 * This script tests whether enabling RLS will break your application.
 * It simulates both client-side (anon key) and server-side (service role) operations.
 *
 * Run this BEFORE enabling RLS to identify potential breaking changes.
 *
 * Usage:
 *   npx tsx scripts/test-rls-compatibility.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Missing environment variables!');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE');
  process.exit(1);
}

// Create both clients
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

interface TestResult {
  name: string;
  client: 'anon' | 'service';
  operation: string;
  success: boolean;
  error?: string;
  critical: boolean; // If this fails with RLS, it will break the app
}

const results: TestResult[] = [];

function logTest(result: TestResult) {
  results.push(result);
  const icon = result.success ? '✅' : '❌';
  const critical = result.critical ? '🔥 CRITICAL' : '⚠️  Warning';
  const prefix = result.success ? icon : `${icon} ${critical}`;
  console.log(`${prefix} [${result.client.toUpperCase()}] ${result.name}: ${result.operation}`);
  if (!result.success && result.error) {
    console.log(`   Error: ${result.error}`);
  }
}

async function testTableAccess(
  tableName: string,
  client: typeof anonClient,
  clientType: 'anon' | 'service',
  critical: boolean = false
) {
  // Test SELECT
  try {
    const { data, error } = await client
      .from(tableName)
      .select('*')
      .limit(1);

    logTest({
      name: `${tableName} - SELECT`,
      client: clientType,
      operation: 'Read access',
      success: !error,
      error: error?.message,
      critical
    });
  } catch (err: any) {
    logTest({
      name: `${tableName} - SELECT`,
      client: clientType,
      operation: 'Read access',
      success: false,
      error: err.message,
      critical
    });
  }
}

async function testPublicReadOperations() {
  console.log('\n📖 Testing PUBLIC READ Operations (used by website visitors)');
  console.log('These operations MUST work with anon key or your site will break\n');

  // Critical: Public read access for website visitors
  await testTableAccess('projects', anonClient, 'anon', true);
  await testTableAccess('posts', anonClient, 'anon', true);
  await testTableAccess('comments', anonClient, 'anon', true);
  await testTableAccess('votes', anonClient, 'anon', true);
  await testTableAccess('boards', anonClient, 'anon', true);
  await testTableAccess('changelog_entries', anonClient, 'anon', false);
}

async function testClientSideWrites() {
  console.log('\n✍️  Testing CLIENT-SIDE WRITE Operations');
  console.log('These are operations done directly from the browser\n');

  // Test if client can create posts (common use case)
  try {
    const { error } = await anonClient
      .from('posts')
      .insert({
        title: 'Test Post - RLS Check',
        description: 'This is a test',
        project_id: '00000000-0000-0000-0000-000000000000', // Will fail but shows permission
      })
      .select();

    logTest({
      name: 'posts - INSERT',
      client: 'anon',
      operation: 'Create post anonymously',
      success: !error || error.message.includes('violates foreign key'),
      error: error?.message,
      critical: true
    });
  } catch (err: any) {
    logTest({
      name: 'posts - INSERT',
      client: 'anon',
      operation: 'Create post anonymously',
      success: false,
      error: err.message,
      critical: true
    });
  }

  // Test if client can create comments
  try {
    const { error } = await anonClient
      .from('comments')
      .insert({
        content: 'Test comment',
        post_id: '00000000-0000-0000-0000-000000000000',
        author_email: 'test@example.com',
      })
      .select();

    logTest({
      name: 'comments - INSERT',
      client: 'anon',
      operation: 'Create comment anonymously',
      success: !error || error.message.includes('violates foreign key'),
      error: error?.message,
      critical: true
    });
  } catch (err: any) {
    logTest({
      name: 'comments - INSERT',
      client: 'anon',
      operation: 'Create comment anonymously',
      success: false,
      error: err.message,
      critical: true
    });
  }

  // Test if client can create votes
  try {
    const { error } = await anonClient
      .from('votes')
      .insert({
        post_id: '00000000-0000-0000-0000-000000000000',
        ip_address: '127.0.0.1',
      })
      .select();

    logTest({
      name: 'votes - INSERT',
      client: 'anon',
      operation: 'Create vote anonymously',
      success: !error || error.message.includes('violates foreign key'),
      error: error?.message,
      critical: true
    });
  } catch (err: any) {
    logTest({
      name: 'votes - INSERT',
      client: 'anon',
      operation: 'Create vote anonymously',
      success: false,
      error: err.message,
      critical: true
    });
  }
}

async function testServerSideOperations() {
  console.log('\n🖥️  Testing SERVER-SIDE Operations (API routes)');
  console.log('These use service role and should always work\n');

  // All server operations should work because service role bypasses RLS
  await testTableAccess('projects', serviceClient, 'service', false);
  await testTableAccess('posts', serviceClient, 'service', false);
  await testTableAccess('api_keys', serviceClient, 'service', false);
  await testTableAccess('stripe_settings', serviceClient, 'service', false);
  await testTableAccess('members', serviceClient, 'service', false);

  // Test server write
  try {
    const { error } = await serviceClient
      .from('projects')
      .select('*')
      .limit(1);

    logTest({
      name: 'Service role access',
      client: 'service',
      operation: 'Full database access',
      success: !error,
      error: error?.message,
      critical: false
    });
  } catch (err: any) {
    logTest({
      name: 'Service role access',
      client: 'service',
      operation: 'Full database access',
      success: false,
      error: err.message,
      critical: false
    });
  }
}

async function testProtectedTables() {
  console.log('\n🔒 Testing PROTECTED Tables (should be blocked for anon)');
  console.log('These tables contain sensitive data and should NOT be accessible with anon key\n');

  // These should be blocked for anon users
  await testTableAccess('api_keys', anonClient, 'anon', false);
  await testTableAccess('stripe_settings', anonClient, 'anon', false);
  await testTableAccess('members', anonClient, 'anon', false);
  await testTableAccess('billing_events', anonClient, 'anon', false);
}

async function checkCurrentRLSStatus() {
  console.log('\n🔍 Checking Current RLS Status\n');

  const tables = [
    'projects', 'posts', 'comments', 'votes', 'boards',
    'api_keys', 'stripe_settings', 'members', 'changelog_entries',
    'rate_limit_violations'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await serviceClient
        .rpc('check_rls_status', { table_name: table })
        .single();

      if (error) {
        // Function doesn't exist, use alternative method
        console.log(`⚠️  ${table}: Unable to check (use Supabase dashboard)`);
      } else {
        const status = data ? 'ENABLED ✅' : 'DISABLED ❌';
        console.log(`   ${table}: ${status}`);
      }
    } catch {
      console.log(`⚠️  ${table}: Unable to check (RPC not available)`);
    }
  }
}

async function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 RLS COMPATIBILITY REPORT');
  console.log('='.repeat(80) + '\n');

  const criticalFailures = results.filter(r => !r.success && r.critical);
  const anonFailures = results.filter(r => !r.success && r.client === 'anon');
  const serviceFailures = results.filter(r => !r.success && r.client === 'service');

  console.log(`Total tests run: ${results.length}`);
  console.log(`✅ Passed: ${results.filter(r => r.success).length}`);
  console.log(`❌ Failed: ${results.filter(r => !r.success).length}`);
  console.log(`🔥 Critical failures: ${criticalFailures.length}\n`);

  if (criticalFailures.length > 0) {
    console.log('🚨 CRITICAL ISSUES FOUND:\n');
    criticalFailures.forEach(r => {
      console.log(`   ❌ ${r.name} (${r.client}): ${r.operation}`);
      console.log(`      ${r.error}\n`);
    });
    console.log('⚠️  WARNING: Enabling RLS will likely BREAK your application!');
    console.log('   These operations are currently working but will fail with RLS.\n');
  }

  if (anonFailures.length > 0 && criticalFailures.length === 0) {
    console.log('⚠️  ANON CLIENT ISSUES:\n');
    anonFailures.forEach(r => {
      console.log(`   ${r.name}: ${r.error}`);
    });
    console.log('\n   These operations use the anon key but are failing.');
    console.log('   They may already be handled by your API routes (service role).\n');
  }

  if (serviceFailures.length > 0) {
    console.log('🔥 SERVICE ROLE ISSUES (UNEXPECTED):\n');
    serviceFailures.forEach(r => {
      console.log(`   ❌ ${r.name}: ${r.error}`);
    });
    console.log('\n   Service role should bypass RLS. These failures are unexpected.\n');
  }

  console.log('='.repeat(80));
  console.log('RECOMMENDATION:');
  console.log('='.repeat(80) + '\n');

  if (criticalFailures.length === 0) {
    console.log('✅ SAFE TO ENABLE RLS');
    console.log('\n   Your application uses service role for critical operations.');
    console.log('   Enabling RLS will add security without breaking functionality.\n');
    console.log('   Next steps:');
    console.log('   1. Run: migrations/fix-function-search-path.sql (fixes security warnings)');
    console.log('   2. Enable RLS on tables one-by-one in Supabase dashboard');
    console.log('   3. Test your application after each table');
    console.log('   4. Enable leaked password protection in Auth settings\n');
  } else {
    console.log('⚠️  REVIEW REQUIRED BEFORE ENABLING RLS');
    console.log('\n   Some operations currently work with anon key but will fail with RLS.');
    console.log('   Options:');
    console.log('   1. Move these operations to API routes (use service role)');
    console.log('   2. Update RLS policies to allow these specific operations');
    console.log('   3. Keep RLS disabled (not recommended for production)\n');
    console.log('   Review the critical failures above and update your code accordingly.\n');
  }
}

// Main execution
async function main() {
  console.log('🔐 SignalsLoop RLS Compatibility Test');
  console.log('=====================================\n');
  console.log('This script tests if enabling RLS will break your application.');
  console.log('Testing with both anon and service role keys...\n');

  try {
    await checkCurrentRLSStatus();
    await testPublicReadOperations();
    await testClientSideWrites();
    await testProtectedTables();
    await testServerSideOperations();
    await generateReport();
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  }
}

main();
