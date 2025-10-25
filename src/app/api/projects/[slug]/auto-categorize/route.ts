import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { categorizeFeedback } from '@/lib/ai-categorization';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;
const DEFAULT_BATCH_LIMIT = 40;

export async function OPTIONS() {
  return NextResponse.json({ success: true });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('slug', slug)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if user is owner or admin member
    const isOwner = project.owner_id === user.id;
    let isAdmin = false;

    if (!isOwner) {
      const { data: memberData } = await supabase
        .from('members')
        .select('role')
        .eq('project_id', project.id)
        .eq('user_id', user.id)
        .single();

      isAdmin = memberData?.role === 'admin';
    }

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const confidenceThreshold = typeof body?.confidenceThreshold === 'number'
      ? Math.min(Math.max(body.confidenceThreshold, 0), 1)
      : DEFAULT_CONFIDENCE_THRESHOLD;
    const batchLimit = typeof body?.limit === 'number'
      ? Math.max(1, Math.min(body.limit, 100))
      : DEFAULT_BATCH_LIMIT;

    const thresholdString = confidenceThreshold.toFixed(3);

    const filterConditions = [
      'category.eq.Other',
      'category.is.null',
      `ai_confidence.lt.${thresholdString}`,
      'ai_confidence.is.null',
      'ai_categorized.eq.false',
    ].join(',');

    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, title, description, category, ai_confidence, ai_categorized')
      .eq('project_id', project.id)
      .is('duplicate_of', null)
      .or(filterConditions)
      .order('created_at', { ascending: true })
      .limit(batchLimit);

    if (postsError) {
      console.error('Failed to load posts for auto-categorization:', postsError);
      return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 });
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({ processedCount: 0, updatedCount: 0, skippedCount: 0, remaining: 0 });
    }

    let updatedCount = 0;
    const errors: Array<{ id: string; message: string }> = [];

    for (const post of posts) {
      try {
        const { category, confidence, reasoning } = await categorizeFeedback(
          post.title as string,
          (post.description as string) || undefined
        );

        const { error: updateError } = await supabase
          .from('posts')
          .update({
            category,
            ai_confidence: confidence,
            ai_reasoning: reasoning || null,
            ai_categorized: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id);

        if (updateError) {
          throw updateError;
        }

        updatedCount += 1;
      } catch (error) {
        console.error('Auto-categorize failed for post', post.id, error);
        errors.push({
          id: String(post.id),
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Calculate remaining posts that still need work
    const { count: remainingCount } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project.id)
      .is('duplicate_of', null)
      .or(filterConditions);

    return NextResponse.json({
      processedCount: posts.length,
      updatedCount,
      skippedCount: posts.length - updatedCount,
      remaining: remainingCount || 0,
      errors,
    });
  } catch (error) {
    console.error('Auto-categorize route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
