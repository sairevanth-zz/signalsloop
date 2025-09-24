import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    
    // Get client IP for anonymous voting
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'anonymous';

    // Check if user already voted (using IP as identifier for anonymous voting)
    const { data: existingVote, error: voteCheckError } = await supabase
      .from('votes')
      .select('id')
      .eq('post_id', postId)
      .eq('ip_address', clientIp)
      .single();

    if (voteCheckError && voteCheckError.code !== 'PGRST116') {
      console.error('Error checking existing vote:', voteCheckError);
      return NextResponse.json({ error: 'Failed to check vote status' }, { status: 500 });
    }

    if (existingVote) {
      return NextResponse.json({ error: 'Already voted' }, { status: 400 });
    }

    // Insert new vote
    const { data: newVote, error: insertError } = await supabase
      .from('votes')
      .insert({
        post_id: postId,
        ip_address: clientIp,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting vote:', insertError);
      return NextResponse.json({ error: 'Failed to vote' }, { status: 500 });
    }

    // Update post vote count
    const { data: post, error: updateError } = await supabase
      .from('posts')
      .select('vote_count')
      .eq('id', postId)
      .single();

    if (updateError) {
      console.error('Error fetching post:', updateError);
      return NextResponse.json({ error: 'Failed to update vote count' }, { status: 500 });
    }

    const newVoteCount = (post?.vote_count || 0) + 1;

    const { error: countUpdateError } = await supabase
      .from('posts')
      .update({ vote_count: newVoteCount })
      .eq('id', postId);

    if (countUpdateError) {
      console.error('Error updating vote count:', countUpdateError);
      return NextResponse.json({ error: 'Failed to update vote count' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      vote_count: newVoteCount,
      user_voted: true
    });

  } catch (error) {
    console.error('Vote submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    
    // Get client IP for anonymous voting
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'anonymous';

    // Find and delete the vote
    const { data: deletedVote, error: deleteError } = await supabase
      .from('votes')
      .delete()
      .eq('post_id', postId)
      .eq('ip_address', clientIp)
      .select()
      .single();

    if (deleteError && deleteError.code !== 'PGRST116') {
      console.error('Error deleting vote:', deleteError);
      return NextResponse.json({ error: 'Failed to remove vote' }, { status: 500 });
    }

    if (!deletedVote) {
      return NextResponse.json({ error: 'Vote not found' }, { status: 404 });
    }

    // Update post vote count
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('vote_count')
      .eq('id', postId)
      .single();

    if (fetchError) {
      console.error('Error fetching post:', fetchError);
      return NextResponse.json({ error: 'Failed to update vote count' }, { status: 500 });
    }

    const newVoteCount = Math.max(0, (post?.vote_count || 1) - 1);

    const { error: countUpdateError } = await supabase
      .from('posts')
      .update({ vote_count: newVoteCount })
      .eq('id', postId);

    if (countUpdateError) {
      console.error('Error updating vote count:', countUpdateError);
      return NextResponse.json({ error: 'Failed to update vote count' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      vote_count: newVoteCount,
      user_voted: false
    });

  } catch (error) {
    console.error('Vote removal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
