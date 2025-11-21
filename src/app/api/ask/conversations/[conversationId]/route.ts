/**
 * API Route: Ask Conversation Detail
 * GET /api/ask/conversations/[conversationId] - Get conversation with messages
 * PATCH /api/ask/conversations/[conversationId] - Update conversation
 * DELETE /api/ask/conversations/[conversationId] - Delete conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================================================
// Helper: Verify conversation ownership
// ============================================================================

async function verifyConversationOwnership(
  supabase: any,
  conversationId: string,
  userId: string
) {
  const { data: conversation, error } = await supabase
    .from('ask_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error || !conversation) {
    return { conversation: null, error: 'Conversation not found' };
  }

  if (conversation.user_id !== userId) {
    return { conversation: null, error: 'Access denied' };
  }

  return { conversation, error: null };
}

// ============================================================================
// GET - Get conversation with messages
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const supabase = getSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { conversationId } = await params;

    // Verify ownership
    const { conversation, error: verifyError } = await verifyConversationOwnership(
      supabase,
      conversationId,
      user.id
    );

    if (verifyError) {
      return NextResponse.json(
        { success: false, error: verifyError },
        { status: verifyError === 'Conversation not found' ? 404 : 403 }
      );
    }

    // Get messages for this conversation
    const { data: messages, error: messagesError } = await supabase
      .from('ask_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation,
      messages: messages || [],
    });
  } catch (error) {
    console.error('Error in GET /api/ask/conversations/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Update conversation (pin/unpin, title)
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const supabase = getSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { conversationId } = await params;

    // Verify ownership
    const { conversation, error: verifyError } = await verifyConversationOwnership(
      supabase,
      conversationId,
      user.id
    );

    if (verifyError) {
      return NextResponse.json(
        { success: false, error: verifyError },
        { status: verifyError === 'Conversation not found' ? 404 : 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const updates: any = {};

    // Allow updating is_pinned and title
    if (typeof body.is_pinned === 'boolean') {
      updates.is_pinned = body.is_pinned;
    }

    if (typeof body.title === 'string') {
      updates.title = body.title.trim();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString();

    // Update conversation
    const { data: updatedConversation, error: updateError } = await supabase
      .from('ask_conversations')
      .update(updates)
      .eq('id', conversationId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating conversation:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation: updatedConversation,
    });
  } catch (error) {
    console.error('Error in PATCH /api/ask/conversations/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Delete conversation (cascades to messages)
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const supabase = getSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { conversationId } = await params;

    // Verify ownership
    const { conversation, error: verifyError } = await verifyConversationOwnership(
      supabase,
      conversationId,
      user.id
    );

    if (verifyError) {
      return NextResponse.json(
        { success: false, error: verifyError },
        { status: verifyError === 'Conversation not found' ? 404 : 403 }
      );
    }

    // Delete conversation (will cascade to messages via ON DELETE CASCADE)
    const { error: deleteError } = await supabase
      .from('ask_conversations')
      .delete()
      .eq('id', conversationId);

    if (deleteError) {
      console.error('Error deleting conversation:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/ask/conversations/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
