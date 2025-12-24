/**
 * Knowledge Gap Detection API
 * POST /api/polls/detect-gaps - Run knowledge gap detection for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { detectKnowledgeGaps, getPollSuggestions } from '@/lib/polls/knowledge-gap-detection';

// POST /api/polls/detect-gaps
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { projectId, minFeedbackCount, maxSpecificity, createActions } = body;

        if (!projectId) {
            return NextResponse.json(
                { error: 'projectId is required' },
                { status: 400 }
            );
        }

        const supabase = await createServerClient();

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

        // Run knowledge gap detection
        const result = await detectKnowledgeGaps(projectId, {
            minFeedbackCount: minFeedbackCount || 5,
            maxSpecificity: maxSpecificity || 0.4,
            createActions: createActions ?? true
        });

        console.log(`[Knowledge Gap API] ✓ Detected ${result.gaps.length} gaps, created ${result.actions_created} actions`);

        return NextResponse.json(result);

    } catch (error) {
        console.error('[Knowledge Gap API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to detect knowledge gaps' },
            { status: 500 }
        );
    }
}

// GET /api/polls/detect-gaps?projectId=xxx
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json(
                { error: 'projectId is required' },
                { status: 400 }
            );
        }

        const supabase = await createServerClient();

        // Verify user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get existing poll suggestions
        const suggestions = await getPollSuggestions(projectId);

        return NextResponse.json({ suggestions });

    } catch (error) {
        console.error('[Knowledge Gap API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to get suggestions' },
            { status: 500 }
        );
    }
}
