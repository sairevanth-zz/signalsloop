/**
 * Surveys API Routes
 * GET /api/surveys - List surveys for a project
 * POST /api/surveys - Create a new survey
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import type { CreateSurveyInput, Survey, SurveyWithQuestions } from '@/types/polls';

// GET /api/surveys?projectId=xxx
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        if (!projectId) {
            return NextResponse.json(
                { error: 'projectId is required' },
                { status: 400 }
            );
        }

        const supabase = await getSupabaseServerClient();

        // Verify user has access
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Build query
        let query = supabase
            .from('surveys')
            .select(`
        *,
        questions:survey_questions(*)
      `)
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data: surveys, error, count } = await query;

        if (error) {
            console.error('[Surveys API] Error fetching surveys:', error);
            return NextResponse.json(
                { error: 'Failed to fetch surveys' },
                { status: 500 }
            );
        }

        // Sort questions by display_order
        if (surveys) {
            for (const survey of surveys) {
                if (survey.questions) {
                    survey.questions.sort((a: any, b: any) => a.display_order - b.display_order);
                }
            }
        }

        return NextResponse.json({
            surveys: surveys || [],
            total: count,
            limit,
            offset
        });

    } catch (error) {
        console.error('[Surveys API] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/surveys
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            projectId,
            title,
            description,
            thank_you_message,
            closes_at,
            allow_anonymous,
            questions
        } = body as CreateSurveyInput & { projectId: string };

        // Validation
        if (!projectId || !title || !questions || questions.length === 0) {
            return NextResponse.json(
                { error: 'projectId, title, and at least one question are required' },
                { status: 400 }
            );
        }

        // Validate question types
        const validQuestionTypes = ['text', 'single_select', 'multi_select', 'rating', 'nps'];
        for (const q of questions) {
            if (!validQuestionTypes.includes(q.question_type)) {
                return NextResponse.json(
                    { error: `Invalid question_type: ${q.question_type}` },
                    { status: 400 }
                );
            }
            if (!q.question_text?.trim()) {
                return NextResponse.json(
                    { error: 'All questions must have question_text' },
                    { status: 400 }
                );
            }
            // Select types need options
            if ((q.question_type === 'single_select' || q.question_type === 'multi_select') &&
                (!q.options || q.options.length < 2)) {
                return NextResponse.json(
                    { error: 'Select questions must have at least 2 options' },
                    { status: 400 }
                );
            }
        }

        const supabase = await getSupabaseServerClient();

        // Verify user is authenticated
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

        const serviceClient = getSupabaseServiceRoleClient();

        // Create the survey
        const { data: survey, error: surveyError } = await serviceClient
            .from('surveys')
            .insert({
                project_id: projectId,
                title,
                description: description || null,
                thank_you_message: thank_you_message || 'Thank you for your feedback!',
                status: 'draft',
                closes_at: closes_at || null,
                created_by: user.id,
                allow_anonymous: allow_anonymous ?? true
            })
            .select()
            .single();

        if (surveyError) {
            console.error('[Surveys API] Error creating survey:', surveyError);
            return NextResponse.json(
                { error: 'Failed to create survey' },
                { status: 500 }
            );
        }

        // Create questions
        const questionsToInsert = questions.map((q, index) => ({
            survey_id: survey.id,
            question_type: q.question_type,
            question_text: q.question_text,
            options: q.options || null,
            required: q.required ?? false,
            min_value: q.min_value ?? 1,
            max_value: q.max_value ?? (q.question_type === 'nps' ? 10 : 5),
            min_label: q.min_label || null,
            max_label: q.max_label || null,
            display_order: index
        }));

        const { data: createdQuestions, error: questionsError } = await serviceClient
            .from('survey_questions')
            .insert(questionsToInsert)
            .select();

        if (questionsError) {
            console.error('[Surveys API] Error creating questions:', questionsError);
            // Rollback survey creation
            await serviceClient.from('surveys').delete().eq('id', survey.id);
            return NextResponse.json(
                { error: 'Failed to create survey questions' },
                { status: 500 }
            );
        }

        console.log(`[Surveys API] ✓ Created survey: ${survey.id} with ${createdQuestions.length} questions`);

        return NextResponse.json({
            survey: {
                ...survey,
                questions: createdQuestions
            }
        }, { status: 201 });

    } catch (error) {
        console.error('[Surveys API] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
