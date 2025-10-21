import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getAllProjectNotificationRecipients,
  getProjectNotificationRecipientsByType,
  sendPostConfirmationEmail,
  sendTeamFeedbackAlertEmail,
} from '@/lib/email';
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function POST(request: NextRequest) {
  // Apply rate limiting based on IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.ip || 'unknown';
  const identifier = `feedback:${ip}`;

  const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.public.feedback);

  if (!rateLimitResult.success) {
    const headers = getRateLimitHeaders(rateLimitResult);
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `Too many feedback submissions. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        limit: rateLimitResult.limit,
        reset: rateLimitResult.reset,
      },
      {
        status: 429,
        headers,
      }
    );
  }
  try {
    const body = await request.json();
    console.log('[FEEDBACK] Received submission:', body);

    const {
      project_slug,
      title,
      content,
      category = 'other',
      priority = 'medium',
      author_name,
      user_email
    } = body;

    // Support both title and content fields
    const finalContent = content || title;
    const finalTitle = title || content?.substring(0, 100) || 'Feedback';

    console.log('[FEEDBACK] Processed:', { project_slug, finalTitle, finalContent, category });

    if (!project_slug || !finalContent) {
      console.error('[FEEDBACK] Missing required fields');
      return NextResponse.json(
        { error: 'Project slug and content are required' },
        { status: 400 }
      );
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, slug, owner_id')
      .eq('slug', project_slug)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get the board for this project
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('id')
      .eq('project_id', project.id)
      .single();

    if (boardError || !board) {
      console.error('Board not found for project:', project.id);
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      );
    }

    let projectOwnerEmail: string | null = null;
    let projectOwnerName: string | null = null;

    if (project.owner_id) {
      try {
        const { data: ownerData, error: ownerError } = await supabase.auth.admin.getUserById(project.owner_id);
        if (ownerError) {
          throw ownerError;
        }
        const ownerUser = ownerData?.user;
        if (ownerUser) {
          projectOwnerEmail =
            ownerUser.email ||
            (typeof ownerUser.user_metadata?.email === 'string' ? ownerUser.user_metadata.email : null);
          projectOwnerName =
            (typeof ownerUser.user_metadata?.full_name === 'string'
              ? ownerUser.user_metadata.full_name
              : null) ||
            ownerUser.email ||
            null;
        }
      } catch (ownerLookupError) {
        console.error('[FEEDBACK] Failed to load project owner for alerts:', ownerLookupError);
      }
    }

    // Create feedback post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        project_id: project.id,
        board_id: board.id,
        title: finalTitle.trim(),
        description: finalContent.trim(),
        category: category,
        priority: priority,
        author_name: author_name || null,
        author_email: user_email || null,
        status: 'open', // Auto-publish widget submissions
        vote_count: 0,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (postError) {
      console.error('[FEEDBACK] Error creating post:', postError);
      return NextResponse.json(
        { error: 'Failed to submit feedback', details: postError.message },
        { status: 500 }
      );
    }

    console.log('[FEEDBACK] Post created successfully:', post.id);

    if (user_email) {
      try {
        await sendPostConfirmationEmail({
          toEmail: user_email.trim(),
          toName: author_name?.trim() || null,
          postTitle: post.title,
          postId: post.id,
          projectId: project.id,
          projectSlug: project.slug,
          projectName: project.name,
          voteCount: post.vote_count ?? 0,
        });
        console.log(`✅ Confirmation email sent to ${user_email}`);
      } catch (emailError) {
        console.error('[FEEDBACK] Failed to send confirmation email:', emailError);
      }
    }

    try {
      const [allRecipients, typeRecipients] = await Promise.all([
        getAllProjectNotificationRecipients(project.id),
        getProjectNotificationRecipientsByType(project.id, 'team_alert'),
      ]);

      const targets = new Map<string, { email: string; name: string | null }>();

      typeRecipients.forEach((recipient) => {
        const normalized = recipient.email.trim().toLowerCase();
        if (!normalized) return;
        if (!targets.has(normalized)) {
          targets.set(normalized, {
            email: recipient.email,
            name: recipient.name,
          });
        }
      });

      if (targets.size === 0 && allRecipients.length === 0 && projectOwnerEmail) {
        targets.set(projectOwnerEmail.trim().toLowerCase(), {
          email: projectOwnerEmail.trim().toLowerCase(),
          name: projectOwnerName,
        });
      }

      for (const target of targets.values()) {
        try {
          await sendTeamFeedbackAlertEmail({
            toEmail: target.email,
            toName: target.name,
            userId: project.owner_id || null,
            projectId: project.id,
            projectSlug: project.slug,
            projectName: project.name,
            postId: post.id,
            feedbackTitle: post.title,
            feedbackDescription: post.description,
            submitterName: author_name?.trim() || null,
            submitterEmail: user_email?.trim() || null,
            submissionType: 'public_widget',
            submissionSource: 'Public Widget',
            feedbackCategory: category,
            feedbackPriority: priority,
          });
        } catch (teamEmailError) {
          console.error('[FEEDBACK] Failed to send team feedback alert:', teamEmailError);
        }
      }
    } catch (recipientError) {
      console.error('[FEEDBACK] Unable to load team alert recipients:', recipientError);
    }

    // If project has AI categorization enabled, trigger it
    try {
      const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://signalsloop.com'}/api/ai/categorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_id: post.id,
          content: finalContent.trim(),
          project_slug: project_slug
        }),
      });

      if (!aiResponse.ok) {
        console.warn('AI categorization failed, but feedback was submitted');
      }
    } catch (aiError) {
      console.warn('AI categorization error:', aiError);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      post_id: post.id
    });

    // Add rate limit headers to response
    const headers = getRateLimitHeaders(rateLimitResult);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    console.error('Feedback submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
