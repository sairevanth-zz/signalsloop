/**
 * Polls API Routes
 * GET /api/polls - List polls for a project
 * POST /api/polls - Create a new poll
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import type { CreatePollInput, Poll, PollWithOptions } from '@/types/polls';

// GET /api/polls?projectId=xxx
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const status = searchParams.get('status'); // draft, active, closed
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        if (!projectId) {
            return NextResponse.json(
                { error: 'projectId is required' },
                { status: 400 }
            );
        }

        const supabase = await createServerClient();

        // Verify user has access to project
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Build query
        let query = supabase
            .from('polls')
            .select(`
        *,
        options:poll_options(*)
      `)
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data: polls, error, count } = await query;

        if (error) {
            console.error('[Polls API] Error fetching polls:', error);
            return NextResponse.json(
                { error: 'Failed to fetch polls' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            polls: polls || [],
            total: count,
            limit,
            offset
        });

    } catch (error) {
        console.error('[Polls API] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/polls
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            projectId,
            title,
            description,
            poll_type,
            closes_at,
            target_segments,
            target_customer_ids,
            related_theme_id,
            related_feedback_ids,
            allow_anonymous,
            require_explanation,
            show_results_before_vote,
            options
        } = body as CreatePollInput & { projectId: string };

        // Validation
        if (!projectId || !title || !poll_type || !options || options.length < 2) {
            return NextResponse.json(
                { error: 'projectId, title, poll_type, and at least 2 options are required' },
                { status: 400 }
            );
        }

        if (!['single_choice', 'multiple_choice', 'ranked'].includes(poll_type)) {
            return NextResponse.json(
                { error: 'poll_type must be single_choice, multiple_choice, or ranked' },
                { status: 400 }
            );
        }

        const supabase = await createServerClient();

        // Verify user is authenticated and has project access
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Verify user owns the project
        const { data: project } = await supabase
            .from('projects')
            .select('id, owner_id')
            .eq('id', projectId)
            .single();

        if (!project || project.owner_id !== user.id) {
            return NextResponse.json(
                { error: 'Project not found or access denied' },
                { status: 403 }
            );
        }

        // Use service role for insert to bypass RLS during creation
        const serviceClient = getSupabaseServiceRoleClient();

        // Create the poll
        const { data: poll, error: pollError } = await serviceClient
            .from('polls')
            .insert({
                project_id: projectId,
                title,
                description: description || null,
                poll_type,
                status: 'draft',
                closes_at: closes_at || null,
                created_by: user.id,
                target_segments: target_segments || [],
                target_customer_ids: target_customer_ids || [],
                related_theme_id: related_theme_id || null,
                related_feedback_ids: related_feedback_ids || [],
                allow_anonymous: allow_anonymous ?? true,
                require_explanation: require_explanation ?? false,
                show_results_before_vote: show_results_before_vote ?? false
            })
            .select()
            .single();

        if (pollError) {
            console.error('[Polls API] Error creating poll:', pollError);
            return NextResponse.json(
                { error: 'Failed to create poll' },
                { status: 500 }
            );
        }

        // Create poll options
        const optionsToInsert = options.map((opt, index) => ({
            poll_id: poll.id,
            option_text: opt.option_text,
            description: opt.description || null,
            linked_feedback_ids: opt.linked_feedback_ids || [],
            ai_generated: opt.ai_generated || false,
            display_order: index
        }));

        const { data: createdOptions, error: optionsError } = await serviceClient
            .from('poll_options')
            .insert(optionsToInsert)
            .select();

        if (optionsError) {
            console.error('[Polls API] Error creating options:', optionsError);
            // Rollback poll creation
            await serviceClient.from('polls').delete().eq('id', poll.id);
            return NextResponse.json(
                { error: 'Failed to create poll options' },
                { status: 500 }
            );
        }

        console.log(`[Polls API] ✓ Created poll: ${poll.id} with ${createdOptions.length} options`);

        return NextResponse.json({
            poll: {
                ...poll,
                options: createdOptions
            }
        }, { status: 201 });

    } catch (error) {
        console.error('[Polls API] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
