import { NextRequest, NextResponse } from 'next/server';
import { notifyStatusChangeParticipants, sendStatusChangeEmail } from '@/lib/email';
import { triggerWebhooks } from '@/lib/webhooks';
import { triggerSlackNotification } from '@/lib/slack';
import { triggerDiscordNotification } from '@/lib/discord';
import { getServiceRoleClient } from '@/lib/supabase-singleton';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function PATCH(request: NextRequest) {
  try {
    const { postId, newStatus, projectId, adminNote } = await request.json();

    if (!postId || !newStatus || !projectId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Normalize/validate status (UI sometimes uses "completed")
    const normalizedStatus = newStatus === 'completed' ? 'done' : newStatus;
    const validStatuses = ['open', 'planned', 'in_progress', 'done', 'declined'];
    if (!validStatuses.includes(normalizedStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Use service role client for direct database access
    const supabase = getServiceRoleClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

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
        status: normalizedStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .eq('project_id', projectId);

    if (updateError) {
      console.error('Error updating post status:', updateError);
      return NextResponse.json(
        { error: `Failed to update post status: ${updateError.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    const statusChanged = oldStatus !== newStatus;

    // Send email notification if status actually changed
    if (statusChanged && post.author_email) {
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

    if (statusChanged) {
      try {
        await notifyStatusChangeParticipants({
          postId: post.id,
          projectId,
          projectSlug: post.projects?.slug || '',
          postTitle: post.title,
          oldStatus,
          newStatus,
          adminNote,
          authorEmail: post.author_email,
        });
      } catch (participantError) {
        console.error('Failed to notify additional participants about status change:', participantError);
      }
    }

    // Trigger webhooks for post.status_changed event
    if (statusChanged) {
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

      triggerDiscordNotification(
        projectId,
        'post.status_changed',
        webhookPayload
      ).catch((discordError) => {
        console.error('Failed to notify Discord:', discordError);
      });
    }

    // If status changed to 'done', trigger outcome creation
    if (normalizedStatus === 'done' && oldStatus !== 'done') {
      try {
        // Create outcome monitor for this completed feature
        await createOutcomeFromPost(post.id, projectId, post.title, post.category);
        console.log(`✅ Feature outcome created for post: ${post.id}`);
      } catch (outcomeError) {
        // Don't fail the status update if outcome creation fails
        console.error('Failed to create feature outcome:', outcomeError);
      }
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

/**
 * Helper to create an outcome monitor from a roadmap post
 */
async function createOutcomeFromPost(
  postId: string,
  projectId: string,
  featureName: string,
  category: string | null
) {
  const supabase = getServiceRoleClient();

  if (!supabase) return; // Cannot create outcome without db access

  // Check if outcome already exists
  const { data: existing } = await supabase
    .from('feature_outcomes')
    .select('id')
    .eq('post_id', postId)
    .single();

  if (existing) return; // Already tracked

  // Create new outcome record
  const monitorEnd = new Date();
  monitorEnd.setDate(monitorEnd.getDate() + 30); // 30 day monitoring window

  // Basic pre-ship metrics (placeholder until proper calculation)
  // In a real implementation, we would calculate these from history
  const preShipMetrics = {
    sentiment: 0,
    themeVolume: 0,
    churnRisk: 0,
    relatedThemes: category ? [category] : [],
    relatedFeedbackIds: [],
    sampleFeedback: []
  };

  await supabase.from('feature_outcomes').insert({
    project_id: projectId,
    post_id: postId,
    shipped_at: new Date().toISOString(),
    monitor_start: new Date().toISOString(),
    monitor_end: monitorEnd.toISOString(),
    pre_ship_sentiment: preShipMetrics.sentiment,
    pre_ship_theme_volume: preShipMetrics.themeVolume,
    pre_ship_churn_risk: preShipMetrics.churnRisk,
    related_themes: preShipMetrics.relatedThemes,
    related_feedback_ids: preShipMetrics.relatedFeedbackIds,
    sample_feedback: preShipMetrics.sampleFeedback,
    status: 'monitoring',
    outcome_classification: 'pending',
  });
}
