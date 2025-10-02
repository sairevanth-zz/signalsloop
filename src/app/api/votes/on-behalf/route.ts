import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { createHash } from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface VoteOnBehalfRequest {
  postId: string;
  projectId: string;
  customerEmail: string;
  customerName: string;
  customerCompany?: string;
  priority: 'must_have' | 'important' | 'nice_to_have';
  voteSource: string;
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

    const body: VoteOnBehalfRequest = await request.json();
    const {
      postId,
      projectId,
      customerEmail,
      customerName,
      customerCompany,
      priority,
      voteSource,
      internalNote,
      notifyCustomer,
    } = body;

    // Validate required fields
    if (!postId || !projectId || !customerEmail || !customerName || !priority) {
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

    // Generate voter hash from customer email
    const voterHash = createHash('sha256')
      .update(customerEmail.toLowerCase().trim())
      .digest('hex');

    // Check if customer has already voted
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id')
      .eq('post_id', postId)
      .eq('voter_hash', voterHash)
      .single();

    if (existingVote) {
      return NextResponse.json(
        { error: 'This customer has already voted on this post' },
        { status: 400 }
      );
    }

    // Create the vote
    const { data: vote, error: voteError } = await supabase
      .from('votes')
      .insert({
        post_id: postId,
        voter_hash: voterHash,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (voteError || !vote) {
      console.error('Error creating vote:', voteError);
      return NextResponse.json({ error: 'Failed to create vote' }, { status: 500 });
    }

    // Create vote metadata
    const { data: metadata, error: metadataError } = await supabase
      .from('vote_metadata')
      .insert({
        vote_id: vote.id,
        voted_by_admin_id: admin.id,
        voted_by_admin_email: admin.email,
        voted_by_admin_name: admin.user_metadata?.full_name || admin.email,
        customer_email: customerEmail.toLowerCase().trim(),
        customer_name: customerName.trim(),
        customer_company: customerCompany?.trim() || null,
        priority: priority,
        vote_source: voteSource,
        internal_note: internalNote?.trim() || null,
        customer_notified: false,
      })
      .select()
      .single();

    if (metadataError) {
      console.error('Error creating vote metadata:', metadataError);
      // Don't fail the request, vote is already created
    }

    // Update post priority counts
    try {
      await supabase.rpc('update_post_priority_counts', { p_post_id: postId });
    } catch (error) {
      console.error('Error updating priority counts:', error);
    }

    // Update regular vote count
    try {
      await supabase.rpc('increment_vote_count', { post_id: postId });
    } catch (error) {
      console.error('Error incrementing vote count:', error);
    }

    // Send customer notification email if requested
    if (notifyCustomer && metadata) {
      try {
        // Get post details for email
        const { data: post } = await supabase
          .from('posts')
          .select('title, description')
          .eq('id', postId)
          .single();

        if (post) {
          // Send email (implement later)
          await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/emails/vote-on-behalf`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customerEmail,
              customerName,
              postTitle: post.title,
              postId,
              projectSlug: project.slug,
              projectName: project.name,
              adminName: admin.user_metadata?.full_name || 'Your team',
            }),
          }).catch(err => console.error('Failed to send email:', err));

          // Mark as notified
          await supabase
            .from('vote_metadata')
            .update({
              customer_notified: true,
              customer_notified_at: new Date().toISOString(),
            })
            .eq('id', metadata.id);
        }
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
        // Don't fail the request
      }
    }

    // Track analytics (PostHog)
    try {
      // TODO: Integrate with PostHog
      console.log('Analytics: Vote on behalf', {
        admin_id: admin.id,
        post_id: postId,
        priority,
        vote_source: voteSource,
        has_company: !!customerCompany,
        notified_customer: notifyCustomer,
      });
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }

    return NextResponse.json({
      success: true,
      vote,
      metadata,
      message: 'Vote submitted successfully',
    });

  } catch (error) {
    console.error('Vote on behalf API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

