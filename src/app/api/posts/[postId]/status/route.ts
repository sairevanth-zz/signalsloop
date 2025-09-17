import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const { status, estimated_completion, completion_date } = await request.json();

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    const validStatuses = ['open', 'planned', 'in_progress', 'done', 'declined'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
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

    // Update the post status
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    // Add completion date if status is 'done' and completion_date is provided
    if (status === 'done' && completion_date) {
      updateData.completion_date = completion_date;
    }

    // Add estimated completion for planned/in_progress
    if ((status === 'planned' || status === 'in_progress') && estimated_completion) {
      updateData.estimated_completion = estimated_completion;
    }

    const { data, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', params.postId)
      .select()
      .single();

    if (error) {
      console.error('Error updating post status:', error);
      return NextResponse.json(
        { error: 'Failed to update post status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      post: data 
    });

  } catch (error) {
    console.error('Update status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const { updates } = await request.json();

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Updates object is required' },
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

    // Validate status if provided
    if (updates.status) {
      const validStatuses = ['open', 'planned', 'in_progress', 'done', 'declined'];
      if (!validStatuses.includes(updates.status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        );
      }
    }

    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', params.postId)
      .select()
      .single();

    if (error) {
      console.error('Error updating post:', error);
      return NextResponse.json(
        { error: 'Failed to update post' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      post: data 
    });

  } catch (error) {
    console.error('Update post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
