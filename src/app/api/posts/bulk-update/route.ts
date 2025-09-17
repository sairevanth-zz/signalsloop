import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';

export async function PATCH(request: NextRequest) {
  try {
    const { postIds, updates } = await request.json();

    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json(
        { error: 'Post IDs array is required' },
        { status: 400 }
      );
    }

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
      .in('id', postIds)
      .select();

    if (error) {
      console.error('Error bulk updating posts:', error);
      return NextResponse.json(
        { error: 'Failed to update posts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      updatedCount: data?.length || 0,
      posts: data 
    });

  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
