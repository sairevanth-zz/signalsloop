import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

/**
 * GET /api/admin/user-intelligence
 *
 * Fetch all user intelligence data (admin only)
 *
 * Query params:
 * - limit: number of records to return (default: 50)
 * - offset: offset for pagination (default: 0)
 * - sort: sort field (default: created_at)
 * - order: sort order (asc/desc, default: desc)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortField = searchParams.get('sort') || 'created_at';
    const sortOrder = (searchParams.get('order') || 'desc') as 'asc' | 'desc';

    // Fetch user intelligence with user data
    const { data: intelligence, error: intelligenceError, count } = await supabase
      .from('user_intelligence')
      .select(`
        *,
        users!inner(email, full_name, plan, created_at)
      `, { count: 'exact' })
      .order(sortField, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (intelligenceError) {
      console.error('[Admin] Error fetching user intelligence:', intelligenceError);
      return NextResponse.json(
        { error: 'Failed to fetch user intelligence' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: intelligence || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error('[Admin] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
