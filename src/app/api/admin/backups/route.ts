import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { applySecurityHeaders } from '@/lib/security-headers';
import { createFullBackup, listBackups, exportTables } from '@/lib/backup-utils';

/**
 * Admin backup management endpoints
 */

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];

async function isAdmin(userId: string): Promise<boolean> {
  return ADMIN_USER_IDS.includes(userId);
}

/**
 * GET /api/admin/backups
 * List all backups
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      );
    }

    if (!await isAdmin(user.id)) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: 'Forbidden', message: 'Admin access required' },
          { status: 403 }
        )
      );
    }

    // List backups
    const backups = await listBackups();

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        backups: backups.map(backup => ({
          filename: backup.filename,
          size: backup.size,
          sizeFormatted: `${(backup.size / 1024 / 1024).toFixed(2)} MB`,
          lastModified: backup.lastModified,
          key: backup.key,
        })),
      })
    );

  } catch (error) {
    console.error('Error listing backups:', error);
    return applySecurityHeaders(
      NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    );
  }
}

/**
 * POST /api/admin/backups
 * Create a new backup
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
        NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      );
    }

    if (!await isAdmin(user.id)) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: 'Forbidden', message: 'Admin access required' },
          { status: 403 }
        )
      );
    }

    // Create backup
    const result = await createFullBackup();

    if (!result.success) {
      throw new Error(result.error);
    }

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        backup: {
          filename: result.filename,
          r2Key: result.r2Key,
          records: result.metadata.recordCount,
          size: result.metadata.size,
          sizeFormatted: `${(result.metadata.size / 1024 / 1024).toFixed(2)} MB`,
        },
      })
    );

  } catch (error) {
    console.error('Error creating backup:', error);
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: 'Backup creation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    );
  }
}
