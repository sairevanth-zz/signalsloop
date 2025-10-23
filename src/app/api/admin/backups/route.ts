import { NextResponse } from 'next/server';
import { secureAPI, validateAdminAuth } from '@/lib/api-security';
import { createFullBackup, listBackups } from '@/lib/backup-utils';

/**
 * GET /api/admin/backups
 * List all backups
 */
export const GET = secureAPI(
  async () => {
    const backups = await listBackups();

    return NextResponse.json({
      success: true,
      backups: backups.map(backup => ({
        filename: backup.filename,
        size: backup.size,
        sizeFormatted: `${(backup.size / 1024 / 1024).toFixed(2)} MB`,
        lastModified: backup.lastModified,
        key: backup.key,
      })),
    });
  },
  {
    enableRateLimit: true,
    rateLimitType: 'api',
    requireAuth: true,
    authValidator: validateAdminAuth,
  }
);

/**
 * POST /api/admin/backups
 * Create a new backup
 */
export const POST = secureAPI(
  async () => {
    const result = await createFullBackup();

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Backup creation failed',
          message: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      backup: {
        filename: result.filename,
        r2Key: result.r2Key,
        records: result.metadata.recordCount,
        size: result.metadata.size,
        sizeFormatted: `${(result.metadata.size / 1024 / 1024).toFixed(2)} MB`,
      },
    });
  },
  {
    enableRateLimit: true,
    rateLimitType: 'api',
    requireAuth: true,
    authValidator: validateAdminAuth,
  }
);
