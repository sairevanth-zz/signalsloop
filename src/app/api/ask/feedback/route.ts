/**
 * API Route: Ask Feedback
 * POST /api/ask/feedback - Submit rating for AI response
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================================================
// POST - Submit feedback rating for a message
// ============================================================================

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { messageId, rating } = body;

    // Validate inputs
    if (!messageId || typeof messageId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message ID is required' },
        { status: 400 }
      );
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be a number between 1 and 5' },
        { status: 400 }
      );
    }

    // Get the message to verify ownership
    const { data: message, error: messageError } = await supabase
      .from('ask_messages')
      .select('id, conversation_id')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    // Verify user owns the conversation
    const { data: conversation, error: conversationError } = await supabase
      .from('ask_conversations')
      .select('id, user_id')
      .eq('id', message.conversation_id)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    if (conversation.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update analytics with rating
    const { error: updateError } = await supabase
      .from('ask_analytics')
      .update({
        response_rating: rating,
        updated_at: new Date().toISOString(),
      })
      .eq('message_id', messageId);

    if (updateError) {
      console.error('Error updating feedback:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/ask/feedback:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
