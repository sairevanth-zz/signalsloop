#!/usr/bin/env tsx

/**
 * Daily Backup Script
 * Run this script daily via cron or Vercel Cron
 *
 * Usage:
 *   tsx scripts/daily-backup.ts
 *
 * Or add to crontab:
 *   0 2 * * * cd /path/to/signalloop && tsx scripts/daily-backup.ts >> logs/backup.log 2>&1
 */

import { createFullBackup, cleanupOldBackups } from '../src/lib/backup-utils';
import { format } from 'date-fns';

async function main() {
  console.log('='.repeat(60));
  console.log(`Daily Backup - ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`);
  console.log('='.repeat(60));

  try {
    // Create backup
    console.log('\n📦 Creating full database backup...\n');
    const result = await createFullBackup();

    if (result.success) {
      console.log('\n✅ Backup completed successfully!');
      console.log(`   Filename: ${result.filename}`);
      console.log(`   R2 Key: ${result.r2Key}`);
      console.log(`   Records: ${result.metadata.recordCount}`);
      console.log(`   Size: ${(result.metadata.size / 1024 / 1024).toFixed(2)} MB`);
    } else {
      console.error('\n❌ Backup failed!');
      console.error(`   Error: ${result.error}`);
      process.exit(1);
    }

    // Cleanup old backups (keep last 30)
    console.log('\n🧹 Cleaning up old backups...\n');
    const deleted = await cleanupOldBackups(30);
    console.log(`   Deleted ${deleted} old backup(s)`);

    console.log('\n' + '='.repeat(60));
    console.log('Daily backup completed successfully!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Fatal error during backup:');
    console.error(error);
    process.exit(1);
  }
}

main();
