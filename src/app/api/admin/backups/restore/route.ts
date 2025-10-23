import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { applySecurityHeaders } from '@/lib/security-headers';
import { restoreBackup, verifyBackup } from '@/lib/backup-utils';

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];

async function isAdmin(userId: string): Promise<boolean> {
  return ADMIN_USER_IDS.includes(userId);
}

/**
 * POST /api/admin/backups/restore
 * Restore database from backup
 *
 * Body: {
 *   filename: string,
 *   dryRun?: boolean,
 *   tables?: string[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return applySecurityHeaders(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user || !await isAdmin(user.id)) {
      return applySecurityHeaders(
        NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      );
    }

    // Get parameters
    const body = await request.json();
    const { filename, dryRun = true, tables } = body;

    if (!filename) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: 'Missing filename parameter' },
          { status: 400 }
        )
      );
    }

    // Verify backup first
    console.log(`Verifying backup: ${filename}`);
    const verification = await verifyBackup(filename);

    if (!verification.valid) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: 'Invalid backup file',
            errors: verification.errors,
          },
          { status: 400 }
        )
      );
    }

    // Restore backup
    console.log(`Starting restore from ${filename} (dryRun: ${dryRun})`);
    const result = await restoreBackup(filename, { dryRun, tables });

    return applySecurityHeaders(
      NextResponse.json({
        success: result.success,
        dryRun,
        restoredTables: result.restoredTables,
        restoredRecords: result.restoredRecords,
        errors: result.errors,
        metadata: verification.metadata,
      })
    );

  } catch (error) {
    console.error('Error restoring backup:', error);
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: 'Restore failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    );
  }
}
