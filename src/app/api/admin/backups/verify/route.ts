import { NextResponse } from 'next/server';
import { z } from 'zod';
import { secureAPI, validateAdminAuth } from '@/lib/api-security';
import { verifyBackup } from '@/lib/backup-utils';

/**
 * GET /api/admin/backups/verify?filename=backup_full_2025-01-01_00-00-00.json
 * Verify backup integrity
 */
export const GET = secureAPI(
  async ({ query }) => {
    const { filename } = query!;

    // Verify backup
    const result = await verifyBackup(filename);

    return NextResponse.json({
      valid: result.valid,
      metadata: result.metadata,
      errors: result.errors,
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
