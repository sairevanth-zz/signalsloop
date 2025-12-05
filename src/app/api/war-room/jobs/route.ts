/**
 * War Room Job Postings API
 * GET - List job postings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { warRoomService } from '@/lib/war-room';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    const options: any = {};
    const competitor = request.nextUrl.searchParams.get('competitor');
    if (competitor) options.competitor_name = competitor;
    const department = request.nextUrl.searchParams.get('department');
    if (department) options.department = department;
    const active = request.nextUrl.searchParams.get('active');
    if (active !== null) options.is_active = active === 'true';
    
    options.limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
    options.offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');

    const { postings, total } = await warRoomService.listJobPostings(projectId, options);

    return NextResponse.json({
      success: true,
      postings,
      total,
      pagination: {
        limit: options.limit,
        offset: options.offset,
        hasMore: options.offset + options.limit < total,
      },
    });
  } catch (error) {
    console.error('[API] List job postings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
