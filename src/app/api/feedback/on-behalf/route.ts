import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface FeedbackOnBehalfRequest {
  projectId: string;
  customerEmail: string;
  customerName: string;
  customerCompany?: string;
  feedbackTitle: string;
  feedbackDescription: string;
  priority: 'must_have' | 'important' | 'nice_to_have';
  feedbackSource: string;
  internalNote?: string;
  notifyCustomer: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Get the authenticated admin user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: admin }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: FeedbackOnBehalfRequest = await request.json();
    const {
      projectId,
      customerEmail,
      customerName,
      customerCompany,
      feedbackTitle,
      feedbackDescription,
      priority,
      feedbackSource,
      internalNote,
      notifyCustomer,
    } = body;

    // Validate required fields
    if (!projectId || !customerEmail || !customerName || !feedbackTitle || !feedbackDescription || !priority) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify admin owns this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('owner_id, slug, name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.owner_id !== admin.id) {
      return NextResponse.json({ error: 'Not authorized for this project' }, { status: 403 });
    }

    console.log('Creating feedback post with data:', {
      projectId,
      feedbackTitle,
      customerEmail: customerEmail.toLowerCase().trim(),
    });

    // Create the post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        project_id: projectId,
        title: feedbackTitle.trim(),
        description: feedbackDescription.trim(),
        author_name: customerName.trim(),
        author_email: customerEmail.toLowerCase().trim(),
        status: 'under_review',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (postError || !post) {
      console.error('❌ Error creating post:', postError);
      console.error('Post error details:', {
        message: postError?.message,
        details: postError?.details,
        hint: postError?.hint,
        code: postError?.code,
      });
      return NextResponse.json({
        error: 'Failed to create feedback post',
        details: postError?.message,
        hint: postError?.hint
      }, { status: 500 });
    }

    console.log('✅ Post created successfully:', post.id);

    // Create feedback metadata
    const { data: metadata, error: metadataError } = await supabase
      .from('feedback_metadata')
      .insert({
        post_id: post.id,
        submitted_by_admin_id: admin.id,
        submitted_by_admin_email: admin.email,
        submitted_by_admin_name: admin.user_metadata?.full_name || admin.email,
        customer_email: customerEmail.toLowerCase().trim(),
        customer_name: customerName.trim(),
        customer_company: customerCompany?.trim() || null,
        priority: priority,
        feedback_source: feedbackSource,
        internal_note: internalNote?.trim() || null,
        customer_notified: false,
      })
      .select()
      .single();

    if (metadataError) {
      console.error('Error creating feedback metadata:', metadataError);
      // Don't fail the request, post is already created
    }

    console.log('✅ Feedback metadata created successfully');

    // Send customer notification email if requested
    if (notifyCustomer && metadata) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/emails/feedback-on-behalf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerEmail,
            customerName,
            feedbackTitle,
            feedbackDescription,
            postId: post.id,
            projectSlug: project.slug,
            projectName: project.name,
            adminName: admin.user_metadata?.full_name || 'Your team',
          }),
        }).catch(err => console.error('Failed to send email:', err));

        // Mark as notified
        await supabase
          .from('feedback_metadata')
          .update({
            customer_notified: true,
            customer_notified_at: new Date().toISOString(),
          })
          .eq('id', metadata.id);
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
        // Don't fail the request
      }
    }

    // Track analytics
    try {
      console.log('Analytics: Feedback on behalf', {
        admin_id: admin.id,
        post_id: post.id,
        priority,
        feedback_source: feedbackSource,
        has_company: !!customerCompany,
        notified_customer: notifyCustomer,
      });
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }

    return NextResponse.json({
      success: true,
      post,
      metadata,
      message: 'Feedback submitted successfully',
    });

  } catch (error) {
    console.error('Feedback on behalf API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
