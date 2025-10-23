import { getSupabaseServiceRoleClient } from './secure-supabase';
import { getR2Client } from './r2-client';
import { format } from 'date-fns';
import archiver from 'archiver';
import { Readable } from 'stream';

/**
 * Database Backup Utilities
 * Handles backup creation, storage, and restoration
 */

export interface BackupMetadata {
  timestamp: string;
  version: string;
  tables: string[];
  recordCount: number;
  size: number;
  type: 'full' | 'incremental';
}

export interface BackupResult {
  success: boolean;
  filename: string;
  metadata: BackupMetadata;
  r2Key?: string;
  error?: string;
}

/**
 * Tables to backup
 */
const BACKUP_TABLES = [
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

/**
 * Create a full database backup
 */
export async function createFullBackup(): Promise<BackupResult> {
  try {
    const supabase = getSupabaseServiceRoleClient();
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const filename = `backup_full_${timestamp}.json`;

    console.log('Starting full backup...');

    const backupData: Record<string, any[]> = {};
    let totalRecords = 0;

    // Backup each table
    for (const table of BACKUP_TABLES) {
      try {
        console.log(`Backing up table: ${table}`);
        const { data, error } = await supabase.from(table).select('*');

        if (error) {
          console.error(`Error backing up ${table}:`, error);
          backupData[table] = [];
        } else {
          backupData[table] = data || [];
          totalRecords += (data || []).length;
          console.log(`  ✓ Backed up ${(data || []).length} records from ${table}`);
        }
      } catch (tableError) {
        console.error(`Failed to backup ${table}:`, tableError);
        backupData[table] = [];
      }
    }

    // Create metadata
    const metadata: BackupMetadata = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      tables: BACKUP_TABLES,
      recordCount: totalRecords,
      size: 0,
      type: 'full',
    };

    // Create backup package
    const backupPackage = {
      metadata,
      data: backupData,
    };

    // Convert to JSON
    const backupJson = JSON.stringify(backupPackage, null, 2);
    const backupBuffer = Buffer.from(backupJson, 'utf-8');
    metadata.size = backupBuffer.length;

    // Upload to R2
    const r2Client = getR2Client();
    const r2Key = `backups/${filename}`;
    await r2Client.upload(r2Key, backupBuffer, 'application/json');

    console.log(`✓ Backup created successfully: ${filename}`);
    console.log(`  - Total records: ${totalRecords}`);
    console.log(`  - Size: ${(backupBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - R2 key: ${r2Key}`);

    return {
      success: true,
      filename,
      metadata,
      r2Key,
    };
  } catch (error) {
    console.error('Backup failed:', error);
    return {
      success: false,
      filename: '',
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        tables: [],
        recordCount: 0,
        size: 0,
        type: 'full',
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Export specific tables
 */
export async function exportTables(tables: string[]): Promise<Buffer> {
  const supabase = getSupabaseServiceRoleClient();
  const exportData: Record<string, any[]> = {};

  for (const table of tables) {
    if (!BACKUP_TABLES.includes(table)) {
      throw new Error(`Table ${table} is not in the backup list`);
    }

    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;
    exportData[table] = data || [];
  }

  const exportPackage = {
    metadata: {
      timestamp: new Date().toISOString(),
      tables,
      recordCount: Object.values(exportData).reduce((sum, records) => sum + records.length, 0),
    },
    data: exportData,
  };

  return Buffer.from(JSON.stringify(exportPackage, null, 2), 'utf-8');
}

/**
 * List all backups in R2
 */
export async function listBackups(): Promise<Array<{
  key: string;
  filename: string;
  size: number;
  lastModified: Date;
}>> {
  const r2Client = getR2Client();
  const files = await r2Client.list('backups/');

  return files.map((file) => ({
    key: file.key,
    filename: file.key.replace('backups/', ''),
    size: file.size,
    lastModified: file.lastModified,
  }));
}

/**
 * Download backup from R2
 */
export async function downloadBackup(filename: string): Promise<Buffer> {
  const r2Client = getR2Client();
  const r2Key = filename.startsWith('backups/') ? filename : `backups/${filename}`;
  return r2Client.download(r2Key);
}

/**
 * Delete old backups (keep last N backups)
 */
export async function cleanupOldBackups(keepLast: number = 30): Promise<number> {
  const backups = await listBackups();

  // Sort by date (newest first)
  backups.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

  // Delete old backups
  const toDelete = backups.slice(keepLast);
  const r2Client = getR2Client();

  for (const backup of toDelete) {
    await r2Client.delete(backup.key);
  }

  return toDelete.length;
}

/**
 * Restore backup from R2
 * WARNING: This will overwrite existing data!
 */
export async function restoreBackup(filename: string, options: {
  dryRun?: boolean;
  tables?: string[];
} = {}): Promise<{
  success: boolean;
  restoredTables: string[];
  restoredRecords: number;
  errors: string[];
}> {
  const { dryRun = false, tables: tablesToRestore } = options;

  try {
    // Download backup
    const backupBuffer = await downloadBackup(filename);
    const backupPackage = JSON.parse(backupBuffer.toString('utf-8'));

    if (!backupPackage.metadata || !backupPackage.data) {
      throw new Error('Invalid backup format');
    }

    const supabase = getSupabaseServiceRoleClient();
    const restoredTables: string[] = [];
    const errors: string[] = [];
    let restoredRecords = 0;

    // Determine which tables to restore
    const tables = tablesToRestore || Object.keys(backupPackage.data);

    console.log(`Starting restore from ${filename}${dryRun ? ' (DRY RUN)' : ''}...`);

    for (const table of tables) {
      const records = backupPackage.data[table];
      if (!records || records.length === 0) {
        console.log(`  ⊘ Skipping ${table} (no data)`);
        continue;
      }

      try {
        console.log(`  Restoring ${table} (${records.length} records)...`);

        if (!dryRun) {
          // Delete existing data
          const { error: deleteError } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (deleteError) {
            console.error(`    ✗ Error deleting ${table}:`, deleteError);
            errors.push(`${table}: ${deleteError.message}`);
            continue;
          }

          // Insert backup data
          const { error: insertError } = await supabase.from(table).insert(records);
          if (insertError) {
            console.error(`    ✗ Error inserting ${table}:`, insertError);
            errors.push(`${table}: ${insertError.message}`);
            continue;
          }
        }

        restoredTables.push(table);
        restoredRecords += records.length;
        console.log(`    ✓ Restored ${records.length} records to ${table}`);
      } catch (tableError) {
        console.error(`    ✗ Failed to restore ${table}:`, tableError);
        errors.push(`${table}: ${tableError instanceof Error ? tableError.message : 'Unknown error'}`);
      }
    }

    console.log(`${dryRun ? 'DRY RUN ' : ''}Restore completed!`);
    console.log(`  - Tables restored: ${restoredTables.length}`);
    console.log(`  - Records restored: ${restoredRecords}`);
    console.log(`  - Errors: ${errors.length}`);

    return {
      success: errors.length === 0,
      restoredTables,
      restoredRecords,
      errors,
    };
  } catch (error) {
    console.error('Restore failed:', error);
    return {
      success: false,
      restoredTables: [],
      restoredRecords: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Verify backup integrity
 */
export async function verifyBackup(filename: string): Promise<{
  valid: boolean;
  metadata?: BackupMetadata;
  errors: string[];
}> {
  try {
    const backupBuffer = await downloadBackup(filename);
    const backupPackage = JSON.parse(backupBuffer.toString('utf-8'));

    const errors: string[] = [];

    // Check metadata
    if (!backupPackage.metadata) {
      errors.push('Missing metadata');
    }

    // Check data
    if (!backupPackage.data) {
      errors.push('Missing data');
    }

    // Verify tables
    if (backupPackage.data) {
      for (const table of BACKUP_TABLES) {
        if (!backupPackage.data[table]) {
          errors.push(`Missing table: ${table}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      metadata: backupPackage.metadata,
      errors,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
