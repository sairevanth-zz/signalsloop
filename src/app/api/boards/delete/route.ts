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

    console.log('🗑️ Deleting board and project with service role:', boardId);

    // First, get the project_id from the board
    const { data: boardData, error: boardQueryError } = await supabase
      .from('boards')
      .select('project_id')
      .eq('id', boardId)
      .single();

    if (boardQueryError || !boardData) {
      console.error('Error finding board:', boardQueryError);
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      );
    }

    const projectId = boardData.project_id;
    console.log('📍 Found project_id for board:', projectId);

    // Delete the project (this will cascade delete the board, posts, comments, votes, members, api_keys)
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error('Error deleting project:', error);
      return NextResponse.json(
        { error: `Failed to delete project: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Project and board deleted successfully:', { projectId, boardId });

    return NextResponse.json({ 
      success: true, 
      message: 'Project and board deleted successfully' 
    });

  } catch (error) {
    console.error('Error in board delete API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
