import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    if (!project_slug || !finalContent) {
      return NextResponse.json(
        { error: 'Project slug and content are required' },
        { status: 400 }
      );
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, slug')
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
      console.error('Error creating post:', postError);
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      );
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

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      post_id: post.id
    });

  } catch (error) {
    console.error('Feedback submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
