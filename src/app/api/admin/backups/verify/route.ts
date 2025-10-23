import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { applySecurityHeaders } from '@/lib/security-headers';
import { verifyBackup } from '@/lib/backup-utils';

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];

async function isAdmin(userId: string): Promise<boolean> {
  return ADMIN_USER_IDS.includes(userId);
}

/**
 * GET /api/admin/backups/verify?filename=backup_full_2025-01-01_00-00-00.json
 * Verify backup integrity
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

    // Get filename
    const url = new URL(request.url);
    const filename = url.searchParams.get('filename');

    if (!filename) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: 'Missing filename parameter' },
          { status: 400 }
        )
      );
    }

    // Verify backup
    const result = await verifyBackup(filename);

    return applySecurityHeaders(
      NextResponse.json({
        valid: result.valid,
        metadata: result.metadata,
        errors: result.errors,
      })
    );

  } catch (error) {
    console.error('Error verifying backup:', error);
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: 'Verification failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    );
  }
}
