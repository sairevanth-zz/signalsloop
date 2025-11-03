import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { detectDuplicates, detectDuplicateClusters } from '@/lib/enhanced-duplicate-detection';
import { checkAIUsageLimit, incrementAIUsage } from '@/lib/ai-rate-limit';
import { checkDemoRateLimit, incrementDemoUsage, getClientIP, getTimeUntilReset } from '@/lib/demo-rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

type SavedSimilarityRecord = {
  id: string;
  post_id: string;
  similar_post_id: string;
  similarity_score: number;
  similarity_reason: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
};

/**
 * POST /api/ai/duplicate-detection
 * Detect duplicate feedback posts using semantic analysis
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode = 'single', newPost, existingPosts, posts, options = {}, projectId } = body;
    let demoUsageInfo: { limit: number; remaining: number; resetAt: number } | null = null;

    // Check rate limit if projectId is provided
    if (projectId) {
      const usageCheck = await checkAIUsageLimit(projectId, 'duplicate_detection');

      if (!usageCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: `You've reached your monthly limit of ${usageCheck.limit} AI duplicate detections. ${
              usageCheck.isPro ? 'Please try again next month.' : 'Upgrade to Pro for unlimited duplicate detection!'
            }`,
            current: usageCheck.current,
            limit: usageCheck.limit,
            remaining: usageCheck.remaining,
            isPro: usageCheck.isPro
          },
          { status: 429 }
        );
      }
    } else {
      // Demo/unauthenticated user - use IP-based rate limiting
      const clientIP = getClientIP(request);
      const demoCheck = checkDemoRateLimit(clientIP, 'duplicate_detection');

      if (!demoCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Demo rate limit exceeded',
            message: `You've reached the demo limit of ${demoCheck.limit} duplicate detections per hour. Try again in ${getTimeUntilReset(demoCheck.resetAt)} or sign up for unlimited access!`,
            limit: demoCheck.limit,
            remaining: demoCheck.remaining,
            resetAt: demoCheck.resetAt,
            isDemo: true
          },
          { status: 429 }
        );
      }

      demoUsageInfo = {
        limit: demoCheck.limit,
        remaining: Math.max(demoCheck.remaining, 0),
        resetAt: demoCheck.resetAt
      };
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;
    const supabaseService = supabaseUrl && serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : null;

    if (mode === 'cluster') {
      // Cluster detection mode
      if (!posts || !Array.isArray(posts)) {
        return NextResponse.json(
          { error: 'Posts array is required for cluster mode' },
          { status: 400 }
        );
      }

      const clusters = await detectDuplicateClusters(posts, options);

      if (projectId) {
        await incrementAIUsage(projectId, 'duplicate_detection', posts.length);
      } else {
        const clientIP = getClientIP(request);
        incrementDemoUsage(clientIP, 'duplicate_detection', Math.min(posts.length, 5));
        if (demoUsageInfo) {
          demoUsageInfo = {
            ...demoUsageInfo,
            remaining: Math.max(demoUsageInfo.remaining - Math.max(posts.length - 1, 0), 0)
          };
        }
      }

      return NextResponse.json({
        success: true,
        mode: 'cluster',
        clusters,
        metadata: {
          totalPosts: posts.length,
          clustersFound: clusters.length,
          timestamp: new Date().toISOString()
        },
        usage: demoUsageInfo || undefined
      });
    } else {
      // Single duplicate detection mode
      if (!newPost) {
        return NextResponse.json(
          { error: 'newPost is required for single mode' },
          { status: 400 }
        );
      }

      if (!existingPosts || !Array.isArray(existingPosts)) {
        return NextResponse.json(
          { error: 'existingPosts array is required for single mode' },
          { status: 400 }
        );
      }

      if (newPost?.id && supabaseService) {
        const { data: postRecord, error: postError } = await supabaseService
          .from('posts')
          .select('id, duplicate_of')
          .eq('id', newPost.id)
          .maybeSingle();

        if (postError) {
          console.error('[DUPLICATE DETECTION] Failed to verify post duplicate status:', postError);
        } else if (postRecord?.duplicate_of) {
          return NextResponse.json(
            {
              error: 'This post has been merged into another post. Duplicate analysis is disabled.',
            },
            { status: 403 }
          );
        }
      }

      const duplicates = await detectDuplicates(newPost, existingPosts, options);
      const savedSimilarities: SavedSimilarityRecord[] = [];

      if (
        projectId &&
        supabaseService &&
        newPost?.id &&
        Array.isArray(duplicates) &&
        duplicates.length > 0 &&
        options?.persist !== false
      ) {
        for (const entry of duplicates) {
          const targetPostId = entry?.post?.id;
          if (!targetPostId || targetPostId === newPost.id) continue;

          const normalizedScore = Math.min(
            Math.max(entry.analysis?.similarityScore ?? 0, 0),
            1
          );
          const similarityReason =
            entry.analysis?.explanation ||
            'Flagged as similar by AI';

          const persistPayload = {
            similarity_score: normalizedScore,
            similarity_reason: similarityReason,
            status: 'detected' as const,
          };

          let savedRow: SavedSimilarityRecord | null = null;

          try {
            const { data: existingForward, error: existingForwardError } = await supabaseService
              .from('post_similarities')
              .select('id, post_id, similar_post_id, similarity_score, similarity_reason, status, created_at, updated_at')
              .eq('post_id', newPost.id)
              .eq('similar_post_id', targetPostId)
              .maybeSingle<SavedSimilarityRecord>();

            if (existingForwardError) {
              console.error('[DUPLICATE DETECTION] Similarity lookup error (forward):', existingForwardError);
            }

            if (existingForward) {
              const { data: updated, error: updateError } = await supabaseService
                .from('post_similarities')
                .update(persistPayload)
                .eq('id', existingForward.id)
                .select('id, post_id, similar_post_id, similarity_score, similarity_reason, status, created_at, updated_at')
                .single<SavedSimilarityRecord>();

              if (updateError) {
                console.error('[DUPLICATE DETECTION] Similarity update error (forward):', updateError);
              } else if (updated) {
                savedRow = updated;
              }
            } else {
              const { data: existingReverse, error: existingReverseError } = await supabaseService
                .from('post_similarities')
                .select('id, post_id, similar_post_id, similarity_score, similarity_reason, status, created_at, updated_at')
                .eq('post_id', targetPostId)
                .eq('similar_post_id', newPost.id)
                .maybeSingle<SavedSimilarityRecord>();

              if (existingReverseError) {
                console.error('[DUPLICATE DETECTION] Similarity lookup error (reverse):', existingReverseError);
              }

              if (existingReverse) {
                const { data: updated, error: updateError } = await supabaseService
                  .from('post_similarities')
                  .update(persistPayload)
                  .eq('id', existingReverse.id)
                  .select('id, post_id, similar_post_id, similarity_score, similarity_reason, status, created_at, updated_at')
                  .single<SavedSimilarityRecord>();

                if (updateError) {
                  console.error('[DUPLICATE DETECTION] Similarity update error (reverse):', updateError);
                } else if (updated) {
                  savedRow = updated;
                }
              } else {
                const { data: inserted, error: insertError } = await supabaseService
                  .from('post_similarities')
                  .insert({
                    post_id: newPost.id,
                    similar_post_id: targetPostId,
                    ...persistPayload,
                  })
                  .select('id, post_id, similar_post_id, similarity_score, similarity_reason, status, created_at, updated_at')
                  .single<SavedSimilarityRecord>();

                if (insertError) {
                  console.error('[DUPLICATE DETECTION] Similarity insert error:', insertError);
                } else if (inserted) {
                  savedRow = inserted;
                }
              }
            }
          } catch (persistError) {
            console.error('[DUPLICATE DETECTION] Similarity persistence error:', persistError);
          }

          if (savedRow) {
            savedSimilarities.push(savedRow);
          }
        }
      }

      if (projectId) {
        await incrementAIUsage(projectId, 'duplicate_detection');
      } else {
        const clientIP = getClientIP(request);
        incrementDemoUsage(clientIP, 'duplicate_detection');
        if (demoUsageInfo) {
          demoUsageInfo = {
            ...demoUsageInfo,
            remaining: Math.max(demoUsageInfo.remaining, 0)
          };
        }
      }

      let duplicatesWithIds = duplicates;
      if (savedSimilarities.length > 0 && newPost?.id) {
        const idMap = new Map<string, string>();
        savedSimilarities.forEach((record) => {
          const forwardKey = `${record.post_id}|${record.similar_post_id}`;
          const reverseKey = `${record.similar_post_id}|${record.post_id}`;
          idMap.set(forwardKey, record.id);
          idMap.set(reverseKey, record.id);
        });

        duplicatesWithIds = duplicates.map((dup) => {
          const targetPostId = dup?.post?.id;
          if (!targetPostId) return dup;
          const matchId = idMap.get(`${newPost.id}|${targetPostId}`);
          if (matchId) {
            return {
              ...dup,
              similarityId: matchId,
            };
          }
          return dup;
        });
      }

      return NextResponse.json({
        success: true,
        mode: 'single',
        duplicates: duplicatesWithIds,
        metadata: {
          candidatesAnalyzed: existingPosts.length,
          duplicatesFound: duplicates.length,
          timestamp: new Date().toISOString()
        },
        savedSimilarities: savedSimilarities.length > 0 ? savedSimilarities : undefined,
        usage: demoUsageInfo || undefined
      });
    }

  } catch (error) {
    console.error('[DUPLICATE DETECTION] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to detect duplicates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ai/duplicate-detection
 * Update similarity status or merge duplicate posts
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      status,
      sourcePostId,
      targetPostId,
      similarityScore,
      similarityReason,
      similarityId
    } = body;

    const requestedAction = (action || status || '').toString().toLowerCase();

    if (!requestedAction) {
      return NextResponse.json(
        { error: 'Action or status is required' },
        { status: 400 }
      );
    }

    const authHeader =
      request.headers.get('authorization') ||
      request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.slice('Bearer '.length).trim();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[DUPLICATE DETECTION] Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const {
      data: userData,
      error: authError
    } = await supabase.auth.getUser(accessToken);

    if (authError || !userData?.user) {
      console.error('[DUPLICATE DETECTION] Auth error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    const userId = userData.user.id;

    if (!sourcePostId || !targetPostId) {
      return NextResponse.json(
        { error: 'sourcePostId and targetPostId are required' },
        { status: 400 }
      );
    }

    const postIds = [sourcePostId, targetPostId];

    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('id, project_id, duplicate_of')
      .in('id', postIds);

    if (postsError) {
      console.error('[DUPLICATE DETECTION] Posts fetch error:', postsError);
      return NextResponse.json(
        { error: 'Failed to load posts' },
        { status: 500 }
      );
    }

    if (!postsData || postsData.length === 0) {
      return NextResponse.json(
        { error: 'Associated posts not found' },
        { status: 404 }
      );
    }

    const projectIds = Array.from(
      new Set(
        postsData
          .map((post) => post.project_id)
          .filter((projectId): projectId is string => Boolean(projectId))
      )
    );

    if (projectIds.length === 0) {
      return NextResponse.json(
        { error: 'Unable to determine project ownership' },
        { status: 400 }
      );
    }

    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('id, owner_id')
      .in('id', projectIds);

    if (projectsError) {
      console.error('[DUPLICATE DETECTION] Projects fetch error:', projectsError);
      return NextResponse.json(
        { error: 'Failed to verify ownership' },
        { status: 500 }
      );
    }

    const unauthorizedProject = (projectsData || []).find(
      (project) => project.owner_id !== userId
    );

    if (unauthorizedProject) {
      return NextResponse.json(
        { error: 'You do not have permission to update these posts' },
        { status: 403 }
      );
    }

    const sourcePost = postsData.find((post) => post.id === sourcePostId);
    const targetPost = postsData.find((post) => post.id === targetPostId);

    if (!sourcePost || !targetPost) {
      return NextResponse.json(
        { error: 'Source or target post not found' },
        { status: 404 }
      );
    }

    if (sourcePost.project_id !== targetPost.project_id) {
      return NextResponse.json(
        { error: 'Posts must belong to the same project to update similarities' },
        { status: 400 }
      );
    }

    let similarityRecord:
      | { id: string; post_id: string; similar_post_id: string | null; status: string }
      | null = null;

    if (similarityId) {
      const { data, error } = await supabase
        .from('post_similarities')
        .select('id, post_id, similar_post_id, status')
        .eq('id', similarityId)
        .limit(1);

      if (error) {
        console.error('[DUPLICATE DETECTION] Similarity lookup error:', error);
      } else if (data && data.length > 0) {
        similarityRecord = data[0];
      }
    }

    if (!similarityRecord) {
      const { data, error } = await supabase
        .from('post_similarities')
        .select('id, post_id, similar_post_id, status')
        .eq('post_id', sourcePostId)
        .eq('similar_post_id', targetPostId)
        .limit(1);

      if (error) {
        console.error('[DUPLICATE DETECTION] Forward similarity lookup error:', error);
      } else if (data && data.length > 0) {
        similarityRecord = data[0];
      }
    }

    if (!similarityRecord) {
      const { data, error } = await supabase
        .from('post_similarities')
        .select('id, post_id, similar_post_id, status')
        .eq('post_id', targetPostId)
        .eq('similar_post_id', sourcePostId)
        .limit(1);

      if (error) {
        console.error('[DUPLICATE DETECTION] Reverse similarity lookup error:', error);
      } else if (data && data.length > 0) {
        similarityRecord = data[0];
      }
    }

    const normalizedScore =
      typeof similarityScore === 'number'
        ? Math.min(Math.max(similarityScore > 1 ? similarityScore / 100 : similarityScore, 0), 1)
        : null;

    const similarityPayload = {
      post_id: sourcePostId,
      similar_post_id: targetPostId,
      similarity_score: normalizedScore ?? 0,
      similarity_reason: similarityReason || 'Manually reviewed by project owner'
    };

    // Handle merge operation
    if (requestedAction === 'merge' || requestedAction === 'merged') {
      const { error: duplicateUpdateError } = await supabase
        .from('posts')
        .update({ duplicate_of: targetPostId })
        .eq('id', sourcePostId);

      if (duplicateUpdateError) {
        console.error('[DUPLICATE DETECTION] Duplicate flag update error:', duplicateUpdateError);
        return NextResponse.json(
          { error: 'Failed to mark post as duplicate' },
          { status: 500 }
        );
      }

      if (similarityRecord) {
        const { error: similarityUpdateError } = await supabase
          .from('post_similarities')
          .update({ status: 'merged' })
          .eq('id', similarityRecord.id);

        if (similarityUpdateError) {
          console.error('[DUPLICATE DETECTION] Similarity merge update error:', similarityUpdateError);
          return NextResponse.json(
            { error: 'Duplicate merged but similarity status update failed' },
            { status: 500 }
          );
        }
      } else {
        const { error: insertError } = await supabase
          .from('post_similarities')
          .insert({
            ...similarityPayload,
            status: 'merged'
          });

        if (insertError) {
          console.error('[DUPLICATE DETECTION] Similarity merge insert error:', insertError);
          return NextResponse.json(
            { error: 'Duplicate merged but similarity record creation failed' },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        action: 'merged',
        message: 'Post merged successfully'
      });
    }

    if (!['confirmed', 'dismissed'].includes(requestedAction)) {
      return NextResponse.json(
        { error: 'Unsupported action' },
        { status: 400 }
      );
    }

    if (similarityRecord) {
      const { error: similarityStatusError } = await supabase
        .from('post_similarities')
        .update({ status: requestedAction })
        .eq('id', similarityRecord.id);

      if (similarityStatusError) {
        console.error('[DUPLICATE DETECTION] Similarity status update error:', similarityStatusError);
        return NextResponse.json(
          { error: 'Failed to update similarity status' },
          { status: 500 }
        );
      }
    } else {
      const { error: insertStatusError } = await supabase
        .from('post_similarities')
        .insert({
          ...similarityPayload,
          status: requestedAction
        });

      if (insertStatusError) {
        console.error('[DUPLICATE DETECTION] Similarity status insert error:', insertStatusError);
        return NextResponse.json(
          { error: 'Failed to save similarity status' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      action: requestedAction,
      message: `Similarity ${requestedAction}`
    });
  } catch (error) {
    console.error('[DUPLICATE DETECTION] PUT handler error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update duplicate status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
