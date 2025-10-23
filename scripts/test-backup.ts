#!/usr/bin/env tsx

/**
 * Backup System Test Script
 * Tests the complete backup and restore workflow
 *
 * Usage:
 *   tsx scripts/test-backup.ts
 */

import { createFullBackup, listBackups, verifyBackup, restoreBackup, cleanupOldBackups } from '../src/lib/backup-utils';
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
  console.log(`Backup System Test - ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`);
  console.log('='.repeat(70));

  // Test 1: Create backup
  await runTest('Create full backup', async () => {
    const result = await createFullBackup();
    if (!result.success) {
      throw new Error(result.error || 'Backup creation failed');
    }
    if (!result.r2Key) {
      throw new Error('No R2 key returned');
    }
    console.log(`     Created: ${result.filename}`);
    console.log(`     Records: ${result.metadata.recordCount}`);
    console.log(`     Size: ${(result.metadata.size / 1024 / 1024).toFixed(2)} MB`);
  });

  // Test 2: List backups
  let latestBackup: string | undefined;
  await runTest('List backups from R2', async () => {
    const backups = await listBackups();
    if (backups.length === 0) {
      throw new Error('No backups found');
    }
    latestBackup = backups[0].filename;
    console.log(`     Found ${backups.length} backup(s)`);
    console.log(`     Latest: ${latestBackup}`);
  });

  // Test 3: Verify backup
  if (latestBackup) {
    await runTest('Verify backup integrity', async () => {
      const verification = await verifyBackup(latestBackup!);
      if (!verification.valid) {
        throw new Error(`Backup verification failed: ${verification.errors.join(', ')}`);
      }
      if (!verification.metadata) {
        throw new Error('No metadata found in backup');
      }
      console.log(`     Tables: ${verification.metadata.tables.length}`);
      console.log(`     Records: ${verification.metadata.recordCount}`);
    });

    // Test 4: Dry-run restore
    await runTest('Dry-run restore (no changes)', async () => {
      const result = await restoreBackup(latestBackup!, { dryRun: true });
      if (!result.success && result.errors.length > 0) {
        throw new Error(`Dry-run failed: ${result.errors.join(', ')}`);
      }
      console.log(`     Tables checked: ${result.restoredTables.length}`);
      console.log(`     Records checked: ${result.restoredRecords}`);
    });

    // Test 5: Restore specific table (dry-run)
    await runTest('Restore single table (dry-run)', async () => {
      const result = await restoreBackup(latestBackup!, {
        dryRun: true,
        tables: ['security_events']
      });
      if (!result.success && result.errors.length > 0) {
        throw new Error(`Single table dry-run failed: ${result.errors.join(', ')}`);
      }
      console.log(`     Tables checked: ${result.restoredTables.join(', ')}`);
    });
  }

  // Test 6: Cleanup test
  await runTest('Test cleanup old backups', async () => {
    const deleted = await cleanupOldBackups(100); // Keep last 100 (won't delete anything in test)
    console.log(`     Would delete ${deleted} old backup(s)`);
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
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed successfully!\n');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error during testing:');
  console.error(error);
  process.exit(1);
});
