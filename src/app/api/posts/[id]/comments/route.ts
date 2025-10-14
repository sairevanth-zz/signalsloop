import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { sendCommentEmail } from '@/lib/email';
import { triggerWebhooks } from '@/lib/webhooks';
import { triggerSlackNotification } from '@/lib/slack';
import { triggerDiscordNotification } from '@/lib/discord';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    // Fetch comments for this post (including parent_id for replies)
    const { data: comments, error } = await supabase
      .from('comments')
      .select('id, content, author_name, author_email, created_at, parent_id')
      .eq('post_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    return NextResponse.json({ comments: comments || [] }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/posts/[id]/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    const body = await request.json();
    const { content, name, email, parent_id } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Get the post details for email notification
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*, projects(slug, name, owner_id)')
      .eq('id', id)
      .single();

    if (postError) {
      console.error('Error fetching post:', postError);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Insert comment or reply
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id: id,
        content: content.trim(),
        author_name: name.trim(),
        author_email: email || null,
        parent_id: parent_id || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    // Send email notification to post author (if not commenting on their own post)
    if (post.author_email && post.author_email !== email) {
      try {
        // Check if commenter is the project owner (admin)
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(post.projects?.owner_id || '');
        const isAdmin = authUser?.email === email;

        await sendCommentEmail({
          toEmail: post.author_email,
          toName: post.author_name,
          userId: post.user_id,
          postTitle: post.title,
          postId: post.id,
          projectId: post.project_id,
          projectSlug: post.projects?.slug || '',
          commentId: comment.id,
          commentText: content.trim(),
          commenterName: name.trim(),
          isAdmin: isAdmin || false,
        });
        console.log(`✅ Comment email sent to ${post.author_email}`);
      } catch (emailError) {
        // Don't fail the request if email fails
        console.error('Failed to send comment email:', emailError);
      }
    }

    // Trigger webhooks for comment.created event
    const webhookPayload = {
      comment: {
        id: comment.id,
        content: comment.content,
        author_name: comment.author_name,
        author_email: comment.author_email,
        parent_id: comment.parent_id,
        created_at: comment.created_at,
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
      await triggerWebhooks(post.project_id, 'comment.created', webhookPayload);
      console.log(`✅ Webhooks triggered for comment.created: ${comment.id}`);
    } catch (webhookError) {
      // Don't fail the request if webhooks fail
      console.error('Failed to trigger webhooks:', webhookError);
    }

    triggerSlackNotification(
      post.project_id,
      'comment.created',
      webhookPayload
    ).catch((slackError) => {
      console.error('Failed to notify Slack:', slackError);
    });

    triggerDiscordNotification(
      post.project_id,
      'comment.created',
      webhookPayload
    ).catch((discordError) => {
      console.error('Failed to notify Discord:', discordError);
    });

    return NextResponse.json({ success: true, comment }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/posts/[id]/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
