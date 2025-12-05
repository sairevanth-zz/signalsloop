/**
 * API: Executive Briefs
 * Generate and manage executive briefings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { executiveBriefService } from '@/lib/briefs/executive-brief-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }
    
    const briefs = await executiveBriefService.listBriefs(projectId, limit);
    
    return NextResponse.json({ briefs });
    
  } catch (error) {
    console.error('[API] List briefs error:', error);
    return NextResponse.json(
      { error: 'Failed to list briefs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { projectId, briefType, config } = body;
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }
    
    const brief = await executiveBriefService.generateBrief(
      projectId,
      briefType || 'weekly',
      config || {}
    );
    
    return NextResponse.json({ brief }, { status: 201 });
    
  } catch (error) {
    console.error('[API] Generate brief error:', error);
    return NextResponse.json(
      { error: 'Failed to generate brief' },
      { status: 500 }
    );
  }
}
