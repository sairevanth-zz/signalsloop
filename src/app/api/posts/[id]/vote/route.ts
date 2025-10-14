import { NextRequest, NextResponse } from 'next/server';
import { createClient, type PostgrestError } from '@supabase/supabase-js';
import { triggerWebhooks } from '@/lib/webhooks';
import { triggerSlackNotification } from '@/lib/slack';
import { triggerDiscordNotification } from '@/lib/discord';

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

function sanitizeIp(value: string | null | undefined): string | null {
  if (!value || value === 'unknown') {
    return null;
  }

  let ip = value.trim();

  if (ip.startsWith('::ffff:')) {
    ip = ip.slice(7);
  }

  if (ip === '::1') {
    return '127.0.0.1';
  }

  const percentIndex = ip.indexOf('%');
  if (percentIndex !== -1) {
    ip = ip.slice(0, percentIndex);
  }

  return ip.length > 0 ? ip : null;
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
    const rawIp = getClientIp(request);
    const normalizedIp = sanitizeIp(rawIp);
    const { id: anonymousId } = getAnonymousIdentity(request);
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
    } catch {
      // No body provided – fall back to default priority
    }

    const normalizedPriority: VotePriority = requestedPriority ?? 'important';

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Check if user has already voted (using IP + anonymous ID for better tracking)
    const { data: existingVote, error: voteError } = await supabase
      .from('votes')
      .select('id')
      .eq('post_id', postId)
      .eq('anonymous_id', anonymousId)
      .maybeSingle();

    if (voteError) {
      console.error('Error checking existing vote:', voteError);
      return NextResponse.json({ error: 'Failed to check vote status' }, { status: 500 });
    }

    if (existingVote) {
      return NextResponse.json({ message: 'Already voted' }, { status: 409 });
    }

    // Insert new vote
    let priorityColumnAvailable = true;

    const { data: insertedVote, error: insertError } = await supabase
      .from('votes')
      .insert({
        post_id: postId,
        ip_address: normalizedIp,
        anonymous_id: anonymousId,
        priority: normalizedPriority,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      // If the database is missing the new priority column, fall back to a plain vote insert
      if ((insertError as PostgrestError)?.code === '42703') {
        console.warn(
          'Votes table missing priority column, falling back to legacy structure. Please run latest database migration.'
        );
        priorityColumnAvailable = false;

        const { data: legacyVote, error: legacyInsertError } = await supabase
          .from('votes')
          .insert({
            post_id: postId,
            ip_address: normalizedIp,
            anonymous_id: anonymousId,
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (legacyInsertError) {
          console.error('Error inserting vote (legacy fallback):', legacyInsertError);
          return NextResponse.json(
            {
              error:
                legacyInsertError.message ||
                'Failed to record vote (legacy fallback failed). Please run the latest database migrations.',
            },
            { status: 500 }
          );
        }

      } else {
        console.error('Error inserting vote:', insertError);
        return NextResponse.json({ error: insertError.message || 'Failed to record vote' }, { status: 500 });
      }
    } else {
      // Successfully inserted with priority column present
    }

    // Increment vote_count in posts table
    const { error: updateError } = await supabase
      .rpc('increment_vote_count', { post_id_param: postId });

    if (updateError) {
      console.error('Error incrementing vote count:', updateError);
      return NextResponse.json({ error: updateError.message || 'Failed to update vote count' }, { status: 500 });
    }

    if (priorityColumnAvailable) {
      try {
        await supabase.rpc('update_post_priority_counts', { p_post_id: postId });
      } catch (priorityError) {
        console.error('Error updating priority counts:', priorityError);
      }
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

      triggerDiscordNotification(
        post.project_id,
        'vote.created',
        webhookPayload
      ).catch((discordError) => {
        console.error('Failed to notify Discord:', discordError);
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
    const { id: anonymousId } = getAnonymousIdentity(request);

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Delete the vote (check both IP and anonymous ID)
    const { error: deleteError } = await supabase
      .from('votes')
      .delete()
      .eq('post_id', postId)
      .eq('anonymous_id', anonymousId);

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
