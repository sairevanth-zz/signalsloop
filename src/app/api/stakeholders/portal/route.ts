import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ success: false, error: 'token is required' }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    // Validate token and get stakeholder/project
    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select('id, name, email, role, project_id, token_expires_at')
      .eq('access_token', token)
      .single();

    if (!stakeholder) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 404 });
    }

    if (stakeholder.token_expires_at && new Date(stakeholder.token_expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: 'Token expired' }, { status: 403 });
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id, name, slug')
      .eq('id', stakeholder.project_id)
      .single();

    // Get top roadmap suggestions
    const { data: roadmap } = await supabase
      .from('roadmap_suggestions')
      .select('id, theme_id, priority_level, priority_score, recommendation_text, status, generated_at')
      .eq('project_id', stakeholder.project_id)
      .order('priority_score', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      stakeholder: {
        id: stakeholder.id,
        name: stakeholder.name,
        role: stakeholder.role,
      },
      project,
      roadmap: roadmap || [],
    });
  } catch (error) {
    console.error('[Stakeholder Portal] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load portal data' }, { status: 500 });
  }
}
