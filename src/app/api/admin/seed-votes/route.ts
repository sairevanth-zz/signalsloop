import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { postId, count } = body;

    // Validate required fields
    if (!postId || !count || count < 0) {
      return NextResponse.json(
        { error: 'Post ID and valid vote count are required' },
        { status: 400 }
      );
    }

    // Limit vote count to prevent abuse
    const voteCount = Math.min(Math.max(count, 0), 1000);

    // Generate realistic IP addresses for votes
    const votes = [];
    for (let i = 0; i < voteCount; i++) {
      votes.push({
        post_id: postId,
        ip_address: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() // Random date within last 30 days
      });
    }

    // Insert votes
    const { error } = await supabase
      .from('votes')
      .insert(votes);

    if (error) {
      console.error('Error creating votes:', error);
      return NextResponse.json(
        { error: 'Failed to create votes', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      votes_created: voteCount
    });

  } catch (error) {
    console.error('Seed votes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
