import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { triggerWebhooks } from '@/lib/webhooks';
import { triggerSlackNotification } from '@/lib/slack';

const PRIORITY_VALUES = ['must_have', 'important', 'nice_to_have'] as const;
type VotePriority = typeof PRIORITY_VALUES[number];

const isValidPriority = (value: unknown): value is VotePriority =>
  typeof value === 'string' && PRIORITY_VALUES.includes(value as VotePriority);

export const runtime = 'nodejs';
export const maxDuration = 30;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

// Helper to get client IP address
function getClientIp(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  return request.ip || 'unknown';
}

// Helper to get or create anonymous user ID from cookies
function getAnonymousIdentity(request: NextRequest): { id: string; hadCookie: boolean } {
  const cookieHeader = request.headers.get('cookie');
  const cookies = cookieHeader?.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>) || {};

  const existingId = cookies['signalsloop_anonymous_id'];

  if (existingId) {
    return { id: existingId, hadCookie: true };
  }

  // Generate a new anonymous ID for this request
  const newId =
    'anon_' +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

  return { id: newId, hadCookie: false };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params; // Await params for Next.js 15
    const postId = resolvedParams.id;
    let ipAddress = getClientIp(request);
    const { id: anonymousId } = getAnonymousIdentity(request);

    if (!ipAddress || ipAddress === 'unknown') {
      ipAddress = `anon-${anonymousId}`;
    }
    let requestedPriority: VotePriority | undefined;

    try {
      const body = await request.json();
      if (body && isValidPriority(body.priority)) {
        requestedPriority = body.priority;
      } else if (body && typeof body.priority === 'string') {
        const lower = body.priority.toLowerCase();
        if (isValidPriority(lower)) {
          requestedPriority = lower;
        }
      }
    } catch (_error) {
      // No body provided – fall back to default priority
    }

    const normalizedPriority: VotePriority = requestedPriority ?? 'important';

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Check if user has already voted (using IP + anonymous ID for better tracking)
    let voteQuery = supabase
      .from('votes')
      .select('id')
      .eq('post_id', postId);

    voteQuery = voteQuery.or(`ip_address.eq.${ipAddress},anonymous_id.eq.${anonymousId}`);

    const { data: existingVote, error: voteError } = await voteQuery.maybeSingle();

    if (voteError) {
      console.error('Error checking existing vote:', voteError);
      return NextResponse.json({ error: 'Failed to check vote status' }, { status: 500 });
    }

    if (existingVote) {
      return NextResponse.json({ message: 'Already voted' }, { status: 409 });
    }

    // Insert new vote
    const { error: insertError } = await supabase
      .from('votes')
      .insert({ 
        post_id: postId, 
        ip_address: ipAddress,
        anonymous_id: anonymousId,
        priority: normalizedPriority,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error inserting vote:', insertError);
      return NextResponse.json({ error: insertError.message || 'Failed to record vote' }, { status: 500 });
    }

    // Increment vote_count in posts table
    const { error: updateError } = await supabase
      .rpc('increment_vote_count', { post_id_param: postId });

    if (updateError) {
      console.error('Error incrementing vote count:', updateError);
      return NextResponse.json({ error: updateError.message || 'Failed to update vote count' }, { status: 500 });
    }

    try {
      await supabase.rpc('update_post_priority_counts', { p_post_id: postId });
    } catch (priorityError) {
      console.error('Error updating priority counts:', priorityError);
    }

    const { count: totalVotes, error: countError } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (countError) {
      console.error('Error counting votes:', countError);
    }

    const safeTotalVotes = totalVotes ?? 0;

    // Get post details for webhooks
    const { data: post } = await supabase
      .from('posts')
      .select('id, title, project_id')
      .eq('id', postId)
      .single();

    // Trigger webhooks for vote.created event
    if (post) {
      const webhookPayload = {
        vote: {
          post_id: postId,
          priority: normalizedPriority,
          vote_count: safeTotalVotes,
          created_at: new Date().toISOString(),
        },
        post: {
          id: post.id,
          title: post.title,
        },
        project: {
          id: post.project_id,
        },
      };

      try {
        await triggerWebhooks(post.project_id, 'vote.created', webhookPayload);
        console.log(`✅ Webhooks triggered for vote.created on post: ${postId}`);
      } catch (webhookError) {
        // Don't fail the request if webhooks fail
        console.error('Failed to trigger webhooks:', webhookError);
      }

      triggerSlackNotification(
        post.project_id,
        'vote.created',
        webhookPayload
      ).catch((slackError) => {
        console.error('Failed to notify Slack:', slackError);
      });
    }

    // Set cookie for anonymous user ID
    const response = NextResponse.json({
      message: 'Vote recorded successfully',
      new_vote_count: safeTotalVotes,
      priority: normalizedPriority
    }, { status: 200 });

    response.cookies.set('signalsloop_anonymous_id', anonymousId, {
      maxAge: 365 * 24 * 60 * 60, // 1 year
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return response;

  } catch (error) {
    console.error('Error in POST /api/posts/[id]/vote:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params; // Await params for Next.js 15
    const postId = resolvedParams.id;
    let ipAddress = getClientIp(request);
    const { id: anonymousId } = getAnonymousIdentity(request);

    if (!ipAddress || ipAddress === 'unknown') {
      ipAddress = `anon-${anonymousId}`;
    }

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Delete the vote (check both IP and anonymous ID)
    const { error: deleteError } = await supabase
      .from('votes')
      .delete()
      .eq('post_id', postId)
      .or(`ip_address.eq.${ipAddress},anonymous_id.eq.${anonymousId}`);

    if (deleteError) {
      console.error('Error deleting vote:', deleteError);
      return NextResponse.json({ error: 'Failed to remove vote' }, { status: 500 });
    }

    // Decrement vote_count in posts table
    const { data: updatedPost, error: updateError } = await supabase
      .rpc('decrement_vote_count', { post_id_param: postId });

    if (updateError) {
      console.error('Error decrementing vote count:', updateError);
      return NextResponse.json({ error: 'Failed to update vote count' }, { status: 500 });
    }

    try {
      await supabase.rpc('update_post_priority_counts', { p_post_id: postId });
    } catch (priorityError) {
      console.error('Error updating priority counts:', priorityError);
    }

    const { count: totalVotes, error: countError } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (countError) {
      console.error('Error counting votes after removal:', countError);
    }

    return NextResponse.json({ 
      message: 'Vote removed successfully', 
      new_vote_count: totalVotes ?? updatedPost ?? 0 
    }, { status: 200 });

  } catch (error) {
    console.error('Error in DELETE /api/posts/[id]/vote:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// OPTIONS endpoint for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
