/**
 * Single Survey API Routes
 * GET /api/surveys/[id] - Get survey details with questions
 * PATCH /api/surveys/[id] - Update survey
 * DELETE /api/surveys/[id] - Delete survey
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import type { UpdateSurveyInput } from '@/types/polls';

interface RouteContext {
    params: Promise<{ id: string }>;
}

// GET /api/surveys/[id]
export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;

        const supabase = await getSupabaseServerClient();

        // Fetch survey with questions
        const { data: survey, error } = await supabase
            .from('surveys')
            .select(`
        *,
        questions:survey_questions(*)
      `)
            .eq('id', id)
            .single();

        if (error || !survey) {
            return NextResponse.json(
                { error: 'Survey not found' },
                { status: 404 }
            );
        }

        // Sort questions by display_order
        if (survey.questions) {
            survey.questions.sort((a: any, b: any) => a.display_order - b.display_order);
        }

        return NextResponse.json({ survey });

    } catch (error) {
        console.error('[Survey API] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PATCH /api/surveys/[id]
export async function PATCH(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;
        const body = await request.json() as UpdateSurveyInput;

        const supabase = await getSupabaseServerClient();

        // Verify user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check survey exists
        const { data: existingSurvey } = await supabase
            .from('surveys')
            .select('id, project_id')
            .eq('id', id)
            .single();

        if (!existingSurvey) {
            return NextResponse.json(
                { error: 'Survey not found' },
                { status: 404 }
            );
        }

        // Verify user owns the project
        const { data: project } = await supabase
            .from('projects')
            .select('id, owner_id')
            .eq('id', existingSurvey.project_id)
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
        if (body.thank_you_message !== undefined) updates.thank_you_message = body.thank_you_message;
        if (body.closes_at !== undefined) updates.closes_at = body.closes_at;
        if (body.allow_anonymous !== undefined) updates.allow_anonymous = body.allow_anonymous;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { error: 'No valid fields to update' },
                { status: 400 }
            );
        }

        // Update survey
        const serviceClient = getSupabaseServiceRoleClient();
        const { data: updatedSurvey, error: updateError } = await serviceClient
            .from('surveys')
            .update(updates)
            .eq('id', id)
            .select(`
        *,
        questions:survey_questions(*)
      `)
            .single();

        if (updateError) {
            console.error('[Survey API] Error updating survey:', updateError);
            return NextResponse.json(
                { error: 'Failed to update survey' },
                { status: 500 }
            );
        }

        console.log(`[Survey API] ✓ Updated survey: ${id}`);

        return NextResponse.json({ survey: updatedSurvey });

    } catch (error) {
        console.error('[Survey API] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE /api/surveys/[id]
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

        // Check survey exists
        const { data: existingSurvey } = await supabase
            .from('surveys')
            .select('id, project_id')
            .eq('id', id)
            .single();

        if (!existingSurvey) {
            return NextResponse.json(
                { error: 'Survey not found' },
                { status: 404 }
            );
        }

        // Verify user owns the project
        const { data: project } = await supabase
            .from('projects')
            .select('id, owner_id')
            .eq('id', existingSurvey.project_id)
            .single();

        if (!project || project.owner_id !== user.id) {
            return NextResponse.json(
                { error: 'Access denied' },
                { status: 403 }
            );
        }

        // Delete survey (cascades to questions and responses)
        const serviceClient = getSupabaseServiceRoleClient();
        const { error: deleteError } = await serviceClient
            .from('surveys')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('[Survey API] Error deleting survey:', deleteError);
            return NextResponse.json(
                { error: 'Failed to delete survey' },
                { status: 500 }
            );
        }

        console.log(`[Survey API] ✓ Deleted survey: ${id}`);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[Survey API] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
