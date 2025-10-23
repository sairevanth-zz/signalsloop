import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { exportTables } from '@/lib/backup-utils';
import { format } from 'date-fns';

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];

async function isAdmin(userId: string): Promise<boolean> {
  return ADMIN_USER_IDS.includes(userId);
}

/**
 * POST /api/admin/backups/export
 * Export specific tables as JSON
 *
 * Body: { tables: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user || !await isAdmin(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get tables from request body
    const body = await request.json();
    const tables = body.tables || [];

    if (!Array.isArray(tables) || tables.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Provide tables array.' },
        { status: 400 }
      );
    }

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

  } catch (error) {
    console.error('Error exporting tables:', error);
    return NextResponse.json(
      {
        error: 'Export failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
