/**
 * API Route: Projects List
 * GET /api/projects?limit=<number>
 *
 * Lists projects for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================================================
// GET - List projects for authenticated user
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    console.log('[Projects API] GET request received');

    const supabase = await createServerClient();
    console.log('[Projects API] Supabase client created');

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log('[Projects API] Auth check:', {
      hasUser: !!user,
      userId: user?.id,
      authError: authError?.message
    });

    if (authError || !user) {
      console.error('[Projects API] Authentication failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get limit from query params (default: 10)
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Get projects where user is owner or member
    const { data: ownedProjects, error: ownedError } = await supabase
      .from('projects')
      .select('id, name, slug, created_at, owner_id')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (ownedError) {
      console.error('[Projects API] Error fetching owned projects:', ownedError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch projects' },
        { status: 500 }
      );
    }

    // Get projects where user is a member
    const { data: memberships, error: memberError } = await supabase
      .from('members')
      .select('project_id, projects(id, name, slug, created_at, owner_id)')
      .eq('user_id', user.id)
      .limit(limit);

    if (memberError) {
      console.error('[Projects API] Error fetching member projects:', memberError);
    }

    // Combine owned and member projects
    const memberProjects = memberships?.map((m: any) => m.projects).filter(Boolean) || [];
    const allProjects = [...(ownedProjects || []), ...memberProjects];

    // Remove duplicates and limit
    const uniqueProjects = Array.from(
      new Map(allProjects.map(p => [p.id, p])).values()
    ).slice(0, limit);

    console.log('[Projects API] Found projects:', uniqueProjects.length);

    return NextResponse.json({
      success: true,
      projects: uniqueProjects,
    });
  } catch (error) {
    console.error('[Projects API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
