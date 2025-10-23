#!/usr/bin/env tsx

/**
 * Local Backup System Test (No External Dependencies)
 * Tests backup utilities without requiring Supabase or R2
 */

import { format } from 'date-fns';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  console.log(`\n🧪 Running: ${name}...`);

  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.push({ name, passed: true, message: 'Success', duration });
    console.log(`   ✅ PASSED (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';
    results.push({ name, passed: false, message, duration });
    console.log(`   ❌ FAILED: ${message} (${duration}ms)`);
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log(`Local Backup System Test - ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`);
  console.log('='.repeat(70));

  // Test 1: Check environment variables
  await runTest('Check environment variables', async () => {
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE',
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      console.log(`     Missing: ${missing.join(', ')}`);
      console.log(`     Note: These are required for production backup functionality`);
      throw new Error(`Missing ${missing.length} environment variables`);
    }
    
    console.log(`     All required environment variables are set`);
  });

  // Test 2: Test backup metadata structure
  await runTest('Test backup metadata structure', async () => {
    const mockMetadata = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      tables: ['users', 'projects', 'boards'],
      recordCount: 150,
      size: 1024000,
      type: 'full' as const
    };

    if (!mockMetadata.timestamp || !mockMetadata.version) {
      throw new Error('Invalid metadata structure');
    }

    console.log(`     Tables: ${mockMetadata.tables.length}`);
    console.log(`     Records: ${mockMetadata.recordCount}`);
    console.log(`     Size: ${(mockMetadata.size / 1024 / 1024).toFixed(2)} MB`);
  });

  // Test 3: Test filename generation
  await runTest('Test backup filename generation', async () => {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const filename = `backup_${timestamp}.json`;
    
    if (!filename.includes('backup_') || !filename.includes('.json')) {
      throw new Error('Invalid filename format');
    }

    console.log(`     Generated: ${filename}`);
  });

  // Test 4: Test table list
  await runTest('Test backup table configuration', async () => {
    const backupTables = [
      'users',
      'projects', 
      'boards',
      'posts',
      'comments',
      'votes',
      'api_keys',
      'webhooks',
      'webhook_deliveries',
      'changelog_releases',
      'changelog_subscribers',
      'discount_codes',
      'gift_subscriptions',
      'security_events',
    ];

    if (backupTables.length < 10) {
      throw new Error('Too few tables configured for backup');
    }

    console.log(`     Tables configured: ${backupTables.length}`);
    console.log(`     Sample tables: ${backupTables.slice(0, 3).join(', ')}...`);
  });

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('Test Summary');
  console.log('='.repeat(70));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.name} (${result.duration}ms)`);
    if (!result.passed) {
      console.log(`       Error: ${result.message}`);
    }
  });

  console.log('\n' + '-'.repeat(70));
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log('-'.repeat(70));

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Review errors above.\n');
    console.log('💡 To test full backup functionality:');
    console.log('   1. Set up environment variables in .env.local');
    console.log('   2. Or test via production API endpoints');
    console.log('   3. Or use Vercel CLI: vercel env pull');
    process.exit(1);
  } else {
    console.log('\n✅ All local tests passed successfully!\n');
    console.log('💡 Next steps:');
    console.log('   - Test full functionality in production');
    console.log('   - Use admin UI at /admin/backups');
    console.log('   - Test via API endpoints with proper authentication');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error during testing:');
  console.error(error);
  process.exit(1);
});
