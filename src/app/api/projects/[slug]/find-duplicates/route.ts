import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { detectDuplicateClusters, type DuplicateCandidate } from '@/lib/enhanced-duplicate-detection';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for Pro plan

const DEFAULT_BATCH_LIMIT = 50;
const DEFAULT_SIMILARITY_THRESHOLD = 0.70; // 70% similarity - balanced to avoid false positives

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

    // Get board for this project
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('id')
      .eq('project_id', project.id)
      .single();

    if (boardError || !board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const batchLimit = typeof body?.limit === 'number'
      ? Math.max(1, Math.min(body.limit, 200))
      : DEFAULT_BATCH_LIMIT;
    const threshold = typeof body?.threshold === 'number'
      ? Math.min(Math.max(body.threshold, 0.5), 0.95)
      : DEFAULT_SIMILARITY_THRESHOLD;

    // Fetch posts for duplicate detection (non-duplicates only)
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, title, description, category, created_at, vote_count')
      .eq('board_id', board.id)
      .is('duplicate_of', null)
      .order('created_at', { ascending: false })
      .limit(batchLimit);

    if (postsError) {
      console.error('Failed to load posts for duplicate detection:', postsError);
      return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 });
    }

    if (!posts || posts.length < 2) {
      return NextResponse.json({
        processedCount: posts?.length || 0,
        clustersFound: 0,
        duplicatesMarked: 0,
        message: 'Not enough posts to detect duplicates'
      });
    }

    // Convert posts to DuplicateCandidate format
    const candidates: DuplicateCandidate[] = posts.map((post) => ({
      id: post.id as string,
      title: (post.title as string) || '',
      description: (post.description as string) || '',
      category: (post.category as string | null) || undefined,
      voteCount: (post.vote_count as number) || 0,
      createdAt: post.created_at ? new Date(post.created_at as string) : new Date(),
    }));

    // Detect duplicate clusters
    const clusters = await detectDuplicateClusters(candidates, {
      clusterThreshold: threshold,
      minClusterSize: 2,
    });

    // Mark duplicates in database
    let duplicatesMarked = 0;
    const errors: Array<{ id: string; message: string }> = [];
    const processedIds = new Set<string>(posts.map((post) => String(post.id)));

    for (const cluster of clusters) {
      if (cluster.duplicates.length === 0) continue;

      // The cluster already has primaryPost (oldest) identified
      const primaryPost = cluster.primaryPost;
      const duplicatePosts = cluster.duplicates.map(d => d.post);
      processedIds.add(primaryPost.id);

      // Mark duplicates
      for (const duplicate of duplicatePosts) {
        try {
          const { error: updateError } = await supabase
            .from('posts')
            .update({
              duplicate_of: primaryPost.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', duplicate.id);

          if (updateError) {
            throw updateError;
          }

          duplicatesMarked += 1;
          processedIds.add(duplicate.id);
        } catch (error) {
          console.error('Failed to mark duplicate', duplicate.id, error);
          errors.push({
            id: String(duplicate.id),
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    if (processedIds.size > 0) {
      const nowIso = new Date().toISOString();
      const { error: timestampError } = await supabase
        .from('posts')
        .update({ ai_duplicate_checked_at: nowIso })
        .in('id', Array.from(processedIds));

      if (timestampError) {
        console.error('Failed to update duplicate check timestamps:', timestampError);
      }
    }

    return NextResponse.json({
      processedCount: posts.length,
      clustersFound: clusters.length,
      duplicatesMarked,
      errors,
    });
  } catch (error) {
    console.error('Find duplicates route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
