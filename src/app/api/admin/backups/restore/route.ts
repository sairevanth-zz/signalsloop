import { NextResponse } from 'next/server';
import { z } from 'zod';
import { secureAPI, validateAdminAuth } from '@/lib/api-security';
import { restoreBackup, verifyBackup } from '@/lib/backup-utils';

/**
 * POST /api/admin/backups/restore
 * Restore database from backup
 */
export const POST = secureAPI(
  async ({ body }) => {
    const { filename, dryRun, tables } = body!;

    // Verify backup first
    console.log(`Verifying backup: ${filename}`);
    const verification = await verifyBackup(filename);

    if (!verification.valid) {
      return NextResponse.json(
        {
          error: 'Invalid backup file',
          errors: verification.errors,
        },
        { status: 400 }
      );
    }

    // Restore backup
    console.log(`Starting restore from ${filename} (dryRun: ${dryRun})`);
    const result = await restoreBackup(filename, { dryRun, tables });

    return NextResponse.json({
      success: result.success,
      dryRun: result.dryRun,
      tablesRestored: result.tablesRestored,
      recordsRestored: result.recordsRestored,
      errors: result.errors,
      message: result.success
        ? dryRun
          ? 'Dry run successful. No changes made to database.'
          : 'Database restored successfully'
        : 'Restore failed',
    });
  },
  {
    enableRateLimit: true,
    rateLimitType: 'api',
    requireAuth: true,
    authValidator: validateAdminAuth,
    bodySchema: z.object({
      filename: z.string().min(1),
      dryRun: z.boolean().default(true),
      tables: z.array(z.string()).optional(),
    }),
  }
);
