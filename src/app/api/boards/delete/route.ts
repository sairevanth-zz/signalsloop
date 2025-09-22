import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(request: Request) {
  try {
    const { boardId } = await request.json();
    
    if (!boardId) {
      return NextResponse.json(
        { error: 'Board ID is required' },
        { status: 400 }
      );
    }

    // Create Supabase client with service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    console.log('🗑️ Deleting board with service role:', boardId);

    // Delete the board (this will cascade delete all posts, comments, votes)
    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', boardId);

    if (error) {
      console.error('Error deleting board:', error);
      return NextResponse.json(
        { error: `Failed to delete board: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Board deleted successfully:', boardId);

    return NextResponse.json({ 
      success: true, 
      message: 'Board deleted successfully' 
    });

  } catch (error) {
    console.error('Error in board delete API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
