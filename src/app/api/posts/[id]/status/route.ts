import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendStatusChangeEmail } from '@/lib/email';
import { triggerWebhooks } from '@/lib/webhooks';
import { triggerSlackNotification } from '@/lib/slack';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function PATCH(request: NextRequest) {
  try {
    const { postId, newStatus, projectId, adminNote } = await request.json();
    
    if (!postId || !newStatus || !projectId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate status
    const validStatuses = ['open', 'planned', 'in_progress', 'done', 'declined'];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Use service role client for direct database access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    // Get the post details before updating
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('*, projects(slug, name)')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      console.error('Error fetching post:', fetchError);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const oldStatus = post.status;

    // Update the post status directly (bypassing auth for now)
    const { error: updateError } = await supabase
      .from('posts')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .eq('project_id', projectId);

    if (updateError) {
      console.error('Error updating post status:', updateError);
      return NextResponse.json({ error: 'Failed to update post status' }, { status: 500 });
    }

    // Send email notification if status actually changed
    if (oldStatus !== newStatus && post.author_email) {
      try {
        await sendStatusChangeEmail({
          toEmail: post.author_email,
          toName: post.author_name,
          userId: post.user_id,
          postTitle: post.title,
          postId: post.id,
          projectId: projectId,
          projectSlug: post.projects?.slug || '',
          oldStatus: oldStatus,
          newStatus: newStatus,
          adminNote: adminNote,
        });
        console.log(`✅ Status change email sent to ${post.author_email}`);
      } catch (emailError) {
        // Don't fail the request if email fails
        console.error('Failed to send status change email:', emailError);
      }
    }

    // Trigger webhooks for post.status_changed event
    if (oldStatus !== newStatus) {
      const webhookPayload = {
        post: {
          id: post.id,
          title: post.title,
          description: post.description,
          old_status: oldStatus,
          new_status: newStatus,
          author_name: post.author_name,
          author_email: post.author_email,
          updated_at: new Date().toISOString(),
        },
        project: {
          id: projectId,
        },
      };

      try {
        await triggerWebhooks(projectId, 'post.status_changed', webhookPayload);
        console.log(`✅ Webhooks triggered for post.status_changed: ${post.id}`);
      } catch (webhookError) {
        // Don't fail the request if webhooks fail
        console.error('Failed to trigger webhooks:', webhookError);
      }

      triggerSlackNotification(
        projectId,
        'post.status_changed',
        webhookPayload
      ).catch((slackError) => {
        console.error('Failed to notify Slack:', slackError);
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Post status updated successfully'
    });

  } catch (error) {
    console.error('Update post status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
