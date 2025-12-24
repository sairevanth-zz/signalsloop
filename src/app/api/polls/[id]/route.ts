/**
 * Single Poll API Routes
 * GET /api/polls/[id] - Get poll details with options
 * PATCH /api/polls/[id] - Update poll
 * DELETE /api/polls/[id] - Delete poll
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import type { UpdatePollInput, PollWithOptions } from '@/types/polls';

interface RouteContext {
    params: Promise<{ id: string }>;
}

// GET /api/polls/[id]
export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;

        const supabase = await getSupabaseServerClient();

        // Fetch poll with options
        const { data: poll, error } = await supabase
            .from('polls')
            .select(`
        *,
        options:poll_options(*)
      `)
            .eq('id', id)
            .single();

        if (error || !poll) {
            return NextResponse.json(
                { error: 'Poll not found' },
                { status: 404 }
            );
        }

        // Sort options by display_order
        if (poll.options) {
            poll.options.sort((a: any, b: any) => a.display_order - b.display_order);
        }

        return NextResponse.json({ poll });

    } catch (error) {
        console.error('[Poll API] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PATCH /api/polls/[id]
export async function PATCH(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;
        const body = await request.json() as UpdatePollInput;

        const supabase = await getSupabaseServerClient();

        // Verify user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check poll exists and user has access
        const { data: existingPoll } = await supabase
            .from('polls')
            .select('id, project_id')
            .eq('id', id)
            .single();

        if (!existingPoll) {
            return NextResponse.json(
                { error: 'Poll not found' },
                { status: 404 }
            );
        }

        // Verify user owns the project
        const { data: project } = await supabase
            .from('projects')
            .select('id, owner_id')
            .eq('id', existingPoll.project_id)
            .single();

        if (!project || project.owner_id !== user.id) {
            return NextResponse.json(
                { error: 'Access denied' },
                { status: 403 }
            );
        }

        // Build update object
        const updates: Record<string, any> = {};
        if (body.title !== undefined) updates.title = body.title;
        if (body.description !== undefined) updates.description = body.description;
        if (body.status !== undefined) updates.status = body.status;
        if (body.closes_at !== undefined) updates.closes_at = body.closes_at;
        if (body.target_segments !== undefined) updates.target_segments = body.target_segments;
        if (body.allow_anonymous !== undefined) updates.allow_anonymous = body.allow_anonymous;
        if (body.require_explanation !== undefined) updates.require_explanation = body.require_explanation;
        if (body.show_results_before_vote !== undefined) updates.show_results_before_vote = body.show_results_before_vote;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { error: 'No valid fields to update' },
                { status: 400 }
            );
        }

        // Update poll using service role
        const serviceClient = getSupabaseServiceRoleClient();
        const { data: updatedPoll, error: updateError } = await serviceClient
            .from('polls')
            .update(updates)
            .eq('id', id)
            .select(`
        *,
        options:poll_options(*)
      `)
            .single();

        if (updateError) {
            console.error('[Poll API] Error updating poll:', updateError);
            return NextResponse.json(
                { error: 'Failed to update poll' },
                { status: 500 }
            );
        }

        console.log(`[Poll API] ✓ Updated poll: ${id}`);

        return NextResponse.json({ poll: updatedPoll });

    } catch (error) {
        console.error('[Poll API] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE /api/polls/[id]
export async function DELETE(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;

        const supabase = await getSupabaseServerClient();

        // Verify user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check poll exists and get project
        const { data: existingPoll } = await supabase
            .from('polls')
            .select('id, project_id')
            .eq('id', id)
            .single();

        if (!existingPoll) {
            return NextResponse.json(
                { error: 'Poll not found' },
                { status: 404 }
            );
        }

        // Verify user owns the project
        const { data: project } = await supabase
            .from('projects')
            .select('id, owner_id')
            .eq('id', existingPoll.project_id)
            .single();

        if (!project || project.owner_id !== user.id) {
            return NextResponse.json(
                { error: 'Access denied' },
                { status: 403 }
            );
        }

        // Delete poll (cascades to options and votes)
        const serviceClient = getSupabaseServiceRoleClient();
        const { error: deleteError } = await serviceClient
            .from('polls')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('[Poll API] Error deleting poll:', deleteError);
            return NextResponse.json(
                { error: 'Failed to delete poll' },
                { status: 500 }
            );
        }

        console.log(`[Poll API] ✓ Deleted poll: ${id}`);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[Poll API] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
