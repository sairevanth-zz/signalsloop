import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Debug endpoint to check auth and admin status
 * GET /api/admin/debug-auth
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    const authHeader = request.headers.get('authorization');

    const debugInfo: any = {
      hasAuthHeader: !!authHeader,
      authHeaderFormat: authHeader?.substring(0, 20) + '...',
      envVars: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE,
        hasAdminUserIds: !!process.env.ADMIN_USER_IDS,
        adminUserIds: process.env.ADMIN_USER_IDS || 'NOT SET',
      }
    };

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        ...debugInfo,
        error: 'No Bearer token found',
        message: 'Add Authorization: Bearer <token> header'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    debugInfo.tokenLength = token.length;

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({
        ...debugInfo,
        error: 'Auth failed',
        authError: authError?.message,
        message: 'Invalid token or user not found'
      });
    }

    debugInfo.user = {
      id: user.id,
      email: user.email,
    };

    // Check if user is admin
    const adminIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];
    const isAdmin = adminIds.includes(user.id);

    debugInfo.adminCheck = {
      configuredAdminIds: adminIds,
      userIdInList: isAdmin,
      exactMatch: adminIds.map(id => ({
        configured: id,
        matches: id === user.id,
        comparison: `"${id}" === "${user.id}"`,
      }))
    };

    return NextResponse.json({
      success: true,
      isAdmin,
      ...debugInfo
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
