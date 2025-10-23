import { NextResponse } from 'next/server';
import { z } from 'zod';
import { format } from 'date-fns';
import { secureAPI, validateAdminAuth } from '@/lib/api-security';
import { exportTables } from '@/lib/backup-utils';

/**
 * POST /api/admin/backups/export
 * Export specific tables as JSON
 */
export const POST = secureAPI(
  async ({ body }) => {
    const { tables } = body!;

    // Export tables
    const exportBuffer = await exportTables(tables);
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const filename = `export_${tables.join('_')}_${timestamp}.json`;

    // Return file
    return new NextResponse(exportBuffer, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': exportBuffer.length.toString(),
      },
    });
  },
  {
    enableRateLimit: true,
    rateLimitType: 'api',
    requireAuth: true,
    authValidator: validateAdminAuth,
    bodySchema: z.object({
      tables: z.array(z.string()).min(1),
    }),
  }
);
