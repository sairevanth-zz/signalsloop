import { NextRequest, NextResponse } from 'next/server';
import { createFullBackup, cleanupOldBackups } from '@/lib/backup-utils';

/**
 * Vercel Cron Job for Daily Backups
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/daily-backup",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    // Verify this is coming from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting daily backup via cron...');

    // Create backup
    const result = await createFullBackup();

    if (!result.success) {
      throw new Error(result.error || 'Backup failed');
    }

    // Cleanup old backups
    const deleted = await cleanupOldBackups(30);

    return NextResponse.json({
      success: true,
      backup: {
        filename: result.filename,
        r2Key: result.r2Key,
        records: result.metadata.recordCount,
        size: result.metadata.size,
      },
      cleanup: {
        deleted,
      },
    });

  } catch (error) {
    console.error('Daily backup cron failed:', error);

    return NextResponse.json(
      {
        error: 'Backup failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
