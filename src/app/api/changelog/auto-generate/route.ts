import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { generateAutoReleaseNotes } from '@/lib/changelog/auto-generator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, lookbackDays, maxFeatures } = body || {};

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    let hasAccess = project.owner_id === user.id;

    if (!hasAccess) {
      const { data: membership } = await supabase
        .from('members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .limit(1);

      hasAccess = (membership && membership.length > 0) || false;
    }

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    let result;
    try {
      result = await generateAutoReleaseNotes(projectId, {
        lookbackDays,
        maxFeatures,
        triggeredBy: 'api',
      });
    } catch (genError: any) {
      console.error('[API changelog/auto-generate] Generation failed:', genError);
      return NextResponse.json(
        { success: false, error: genError?.message || 'Generation failed' },
        { status: 500 }
      );
    }

    const statusCode = result.success ? 200 : 400;

    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        release: result.release,
        entries: result.entries,
        communications: result.communications,
        detectedFeatures: result.detectedFeatures,
        rawModelOutput: result.rawModelOutput,
      },
      { status: statusCode }
    );
  } catch (error) {
    console.error('[API] changelog auto-generate failed:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
