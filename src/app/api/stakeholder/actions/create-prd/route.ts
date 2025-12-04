import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@/lib/supabase-client';

export const maxDuration = 10;

/**
 * Create Product Requirements Document (PRD)
 *
 * Uses Claude to generate a comprehensive PRD based on:
 * - User query/intent
 * - Customer feedback themes
 * - Sentiment analysis
 * - Competitive insights
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, context } = body;

    if (!projectId || !context) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Authenticate user
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify project access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, owner_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project || project.owner_id !== user.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Generate PRD using Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prdPrompt = `You are a product manager creating a Product Requirements Document (PRD).

Project: ${project.name}

Context from analysis:
- User Query: ${context.query || 'N/A'}
- Key Themes: ${context.themes?.join(', ') || 'N/A'}
- Insights: ${context.insights || 'N/A'}
- Feedback Count: ${context.feedback?.length || 0}

Based on this analysis, create a comprehensive PRD with the following sections:

1. **Executive Summary**
   - Brief overview of the problem and proposed solution

2. **Problem Statement**
   - What customer pain points are we addressing?
   - Why is this important now?

3. **Goals and Objectives**
   - What are we trying to achieve?
   - Success metrics

4. **User Stories**
   - Key user personas and their needs
   - Acceptance criteria

5. **Feature Requirements**
   - Must-have features
   - Nice-to-have features
   - Out of scope

6. **Technical Considerations**
   - Dependencies
   - Constraints
   - Implementation notes

7. **Timeline and Milestones**
   - Suggested phases
   - Key deliverables

8. **Success Metrics**
   - KPIs to track
   - How we'll measure success

Format the response in clean markdown.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prdPrompt,
        },
      ],
    });

    const prdContent = message.content[0].type === 'text' ? message.content[0].text : '';

    // Save PRD to database (optional)
    const { data: savedPRD } = await supabase
      .from('documents')
      .insert({
        project_id: projectId,
        user_id: user.id,
        title: `PRD - ${new Date().toISOString().split('T')[0]}`,
        content: prdContent,
        type: 'prd',
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      prd: {
        id: savedPRD?.id,
        content: prdContent,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Create PRD] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create PRD',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
