import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

/**
 * GET /api/admin/user-intelligence
 *
 * Fetch all users with their intelligence data (admin only)
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

    // Fetch all users
    const { data: users, error: usersError, count: totalUsers } = await supabase
      .from('users')
      .select('id, email, full_name, plan, created_at', { count: 'exact' })
      .order(sortField, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (usersError) {
      console.error('[Admin] Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Fetch intelligence data for these users
    const userIds = users?.map(u => u.id) || [];
    let enrichmentMap = new Map<string, any>();

    if (userIds.length > 0) {
      const { data: intelligence, error: intelligenceError } = await supabase
        .from('user_intelligence')
        .select('*')
        .in('user_id', userIds);

      if (!intelligenceError && intelligence) {
        enrichmentMap = new Map(intelligence.map(intel => [intel.user_id, intel]));
      }
    }

    // Merge users with their intelligence data
    const mergedData = (users || []).map(user => {
      const intel = enrichmentMap.get(user.id);
      return {
        // User fields
        user_id: user.id,
        email: user.email,
        name: user.full_name,
        plan: user.plan,
        created_at: user.created_at,

        // Intelligence fields (null if not enriched)
        company_name: intel?.company_name || null,
        company_domain: intel?.company_domain || null,
        company_size: intel?.company_size || null,
        industry: intel?.industry || null,
        role: intel?.role || null,
        seniority_level: intel?.seniority_level || null,
        linkedin_url: intel?.linkedin_url || null,
        twitter_url: intel?.twitter_url || null,
        github_url: intel?.github_url || null,
        github_username: intel?.github_username || null,
        bio: intel?.bio || null,
        location: intel?.location || null,
        website: intel?.website || null,
        confidence_score: intel?.confidence_score || null,
        data_sources: intel?.data_sources || [],
        enriched_at: intel?.enriched_at || null,
        has_enrichment: !!intel
      };
    });

    return NextResponse.json({
      data: mergedData,
      total: totalUsers || 0,
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
