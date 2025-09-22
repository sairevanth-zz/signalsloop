import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { categorizeFeedback } from '@/lib/ai-categorization';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, board_id, title, description, author_email } = body;

    // Validate required fields
    if (!project_id || !board_id || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: project_id, board_id, title' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Check post limits for free accounts
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('plan')
      .eq('id', project_id)
      .single();

    if (projectError) {
      console.error('Error fetching project:', projectError);
      return NextResponse.json(
        { error: 'Failed to validate project' },
        { status: 500 }
      );
    }

    // Enforce 50 post limit for free accounts
    if (projectData.plan === 'free') {
      const { data: existingPosts, error: countError } = await supabase
        .from('posts')
        .select('id', { count: 'exact' })
        .eq('project_id', project_id);

      if (!countError && existingPosts && existingPosts.length >= 50) {
        return NextResponse.json(
          { error: 'Free accounts are limited to 50 posts. Upgrade to Pro for unlimited posts.' },
          { status: 403 }
        );
      }
    }

    // First, create the post without AI categorization
    const { data: newPost, error: insertError } = await supabase
      .from('posts')
      .insert({
        project_id,
        board_id,
        title: title.trim(),
        description: description?.trim() || null,
        author_email: author_email?.trim() || null,
        status: 'open',
        category: null,
        ai_categorized: false,
        ai_confidence: null,
        ai_reasoning: null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating post:', insertError);
      return NextResponse.json(
        { error: 'Failed to create post' },
        { status: 500 }
      );
    }

    // Check if project has Pro plan for AI categorization
    const { data: proProjectData, error: proProjectError } = await supabase
      .from('projects')
      .select('plan')
      .eq('id', project_id)
      .single();

    // Only attempt AI features for Pro accounts
    if (!proProjectError && proProjectData && proProjectData.plan === 'pro') {
      // 1. AI Categorization in background
      categorizeFeedback(title, description)
        .then(async (aiResult) => {
          try {
            // Update the post with AI categorization results
            const { error: updateError } = await supabase
              .from('posts')
              .update({
                category: aiResult.category,
                ai_categorized: true,
                ai_confidence: aiResult.confidence,
                ai_reasoning: aiResult.reasoning
              })
              .eq('id', newPost.id);

            if (updateError) {
              console.error('Error updating post with AI categorization:', updateError);
            } else {
              console.log(`✅ Post ${newPost.id} categorized as: ${aiResult.category} (${Math.round(aiResult.confidence * 100)}% confidence)`);
            }
          } catch (updateError) {
            console.error('Error updating post with AI categorization:', updateError);
          }
        })
        .catch((aiError) => {
          console.error('AI categorization failed for post:', newPost.id, aiError);
        });

      // 2. Trigger AI Duplicate Detection (async)
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/ai/duplicate-detection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`
        },
        body: JSON.stringify({ 
          postId: newPost.id, 
          projectId: project_id 
        })
      }).then(response => {
        if (response.ok) {
          console.log('✅ AI duplicate detection triggered for post:', newPost.id);
        } else {
          console.error('❌ AI duplicate detection failed for post:', newPost.id);
        }
      }).catch(error => {
        console.error('Error triggering duplicate detection:', error);
      });

      // 3. Trigger AI Priority Scoring (async)
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/ai/priority-scoring`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`
        },
        body: JSON.stringify({ 
          postId: newPost.id, 
          projectId: project_id 
        })
      }).then(response => {
        if (response.ok) {
          console.log('✅ AI priority scoring triggered for post:', newPost.id);
        } else {
          console.error('❌ AI priority scoring failed for post:', newPost.id);
        }
      }).catch(error => {
        console.error('Error triggering priority scoring:', error);
      });

    } else {
      console.log(`Post ${newPost.id} created for free account - skipping AI features`);
    }

    // Return the post immediately (without AI categorization)
    return NextResponse.json({
      success: true,
      post: newPost,
      message: 'Post created successfully. AI categorization will be processed in the background.'
    });

  } catch (error) {
    console.error('Error in POST /api/posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional: Add GET endpoint to retrieve posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const boardId = searchParams.get('board_id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    let query = supabase
      .from('posts')
      .select(`
        *,
        vote_count:votes(count),
        comment_count:comments(count)
      `)
      .eq('project_id', projectId)
      .is('duplicate_of', null);

    if (boardId) {
      query = query.eq('board_id', boardId);
    }

    const { data: posts, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ posts });

  } catch (error) {
    console.error('Error in GET /api/posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
