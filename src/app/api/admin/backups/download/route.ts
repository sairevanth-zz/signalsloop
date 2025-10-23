import { NextResponse } from 'next/server';
import { z } from 'zod';
import { secureAPI, validateAdminAuth } from '@/lib/api-security';
import { downloadBackup } from '@/lib/backup-utils';

/**
 * GET /api/admin/backups/download?filename=backup_full_2025-01-01_00-00-00.json
 * Download a backup file
 */
export const GET = secureAPI(
  async ({ query }) => {
    const { filename } = query!;

    // Download from R2
    const backupBuffer = await downloadBackup(filename);

    // Return file
    return new NextResponse(backupBuffer, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': backupBuffer.length.toString(),
      },
    });
  },
  {
    enableRateLimit: true,
    rateLimitType: 'api',
    requireAuth: true,
    authValidator: validateAdminAuth,
    querySchema: z.object({
      filename: z.string().min(1),
    }),
  }
);
