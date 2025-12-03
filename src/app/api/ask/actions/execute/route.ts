/**
 * API Route: Execute Action
 * POST /api/ask/actions/execute
 *
 * Executes an action after user confirmation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { executeAction } from '@/lib/ask/action-executor';
import { isValidActionType } from '@/lib/ask/action-router';
import type { ExecuteActionRequest, ExecuteActionResponse } from '@/types/ask';

// ============================================================================
// Configuration
// ============================================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    console.log('[Execute Action] Request received');

    // 1. Authenticate user
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Execute Action] Authentication failed:', authError);
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        } as ExecuteActionResponse,
        { status: 401 }
      );
    }

    console.log('[Execute Action] User authenticated:', user.id);

    // 2. Parse request body
    const body = (await request.json()) as ExecuteActionRequest;
    const { messageId, projectId, actionType, parameters } = body;

    if (!messageId || !projectId || !actionType || !parameters) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: messageId, projectId, actionType, parameters',
        } as ExecuteActionResponse,
        { status: 400 }
      );
    }

    // 3. Validate action type
    if (!isValidActionType(actionType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid action type: ${actionType}`,
        } as ExecuteActionResponse,
        { status: 400 }
      );
    }

    // 4. Verify project access
    const { data: projectAccess, error: accessError } = await supabase
      .from('projects')
      .select('id, name, owner_id')
      .eq('id', projectId)
      .single();

    if (accessError || !projectAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found',
        } as ExecuteActionResponse,
        { status: 404 }
      );
    }

    // Check if user owns this project or is a member
    if (projectAccess.owner_id !== user.id) {
      const { data: memberAccess } = await supabase
        .from('members')
        .select('project_id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

      if (!memberAccess) {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied',
          } as ExecuteActionResponse,
          { status: 403 }
        );
      }
    }

    // 5. Verify message exists and belongs to this conversation
    const { data: message, error: messageError } = await supabase
      .from('ask_messages')
      .select('id, conversation_id')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message not found',
        } as ExecuteActionResponse,
        { status: 404 }
      );
    }

    console.log('[Execute Action] Executing action:', actionType);

    // 6. Execute the action
    const result = await executeAction(
      actionType,
      parameters,
      projectId,
      user.id,
      messageId
    );

    console.log('[Execute Action] Action execution result:', {
      success: result.success,
      action_type: result.action_type,
      created_resource_id: result.created_resource_id,
    });

    // 7. Update message with action result
    await supabase
      .from('ask_messages')
      .update({
        action_executed: actionType,
        action_result: result,
        action_status: result.success ? 'completed' : 'failed',
      })
      .eq('id', messageId);

    // 8. Return result
    return NextResponse.json({
      success: true,
      result,
    } as ExecuteActionResponse);
  } catch (error) {
    console.error('[Execute Action] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to execute action',
      } as ExecuteActionResponse,
      { status: 500 }
    );
  }
}

// ============================================================================
// OPTIONS Handler (for CORS)
// ============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
