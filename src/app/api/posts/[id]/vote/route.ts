import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { triggerWebhooks } from '@/lib/webhooks';

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
function getAnonymousUserId(request: NextRequest): string {
  const cookieHeader = request.headers.get('cookie');
  const cookies = cookieHeader?.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>) || {};

  let anonymousId = cookies['signalsloop_anonymous_id'];
  
  if (!anonymousId) {
    // Generate a new anonymous ID
    anonymousId = 'anon_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  return anonymousId;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params; // Await params for Next.js 15
    const postId = resolvedParams.id;
    const ipAddress = getClientIp(request);
    const anonymousId = getAnonymousUserId(request);

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Check if user has already voted (using IP + anonymous ID for better tracking)
    const { data: existingVote, error: voteError } = await supabase
      .from('votes')
      .select('id')
      .eq('post_id', postId)
      .or(`ip_address.eq.${ipAddress},anonymous_id.eq.${anonymousId}`)
      .maybeSingle();

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
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error inserting vote:', insertError);
      return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 });
    }

    // Increment vote_count in posts table
    const { data: updatedPost, error: updateError } = await supabase
      .rpc('increment_vote_count', { post_id_param: postId });

    if (updateError) {
      console.error('Error incrementing vote count:', updateError);
      // Optionally, delete the vote if increment failed to maintain consistency
      await supabase.from('votes').delete().eq('post_id', postId).eq('ip_address', ipAddress);
      return NextResponse.json({ error: 'Failed to update vote count' }, { status: 500 });
    }

    // Get post details for webhooks
    const { data: post } = await supabase
      .from('posts')
      .select('id, title, project_id, vote_count')
      .eq('id', postId)
      .single();

    // Trigger webhooks for vote.created event
    if (post) {
      try {
        await triggerWebhooks(post.project_id, 'vote.created', {
          vote: {
            post_id: postId,
            vote_count: post.vote_count || 0,
            created_at: new Date().toISOString(),
          },
          post: {
            id: post.id,
            title: post.title,
          },
          project: {
            id: post.project_id,
          },
        });
        console.log(`✅ Webhooks triggered for vote.created on post: ${postId}`);
      } catch (webhookError) {
        // Don't fail the request if webhooks fail
        console.error('Failed to trigger webhooks:', webhookError);
      }
    }

    // Set cookie for anonymous user ID
    const response = NextResponse.json({
      message: 'Vote recorded successfully',
      new_vote_count: updatedPost
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
    const ipAddress = getClientIp(request);
    const anonymousId = getAnonymousUserId(request);

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

    return NextResponse.json({ 
      message: 'Vote removed successfully', 
      new_vote_count: updatedPost 
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