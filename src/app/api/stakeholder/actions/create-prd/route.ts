import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 60; // Vercel Pro tier - 60s for PRD generation

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

    const prdPrompt = `Create a concise Product Requirements Document (PRD) for: ${project.name}

Context: ${context.query || 'N/A'}
Key Themes: ${context.themes?.join(', ') || 'N/A'}
Feedback: ${context.feedback?.length || 0} items

Create a PRD with these sections (be concise):

1. **Executive Summary** (2-3 sentences)
2. **Problem Statement** (what pain points we're addressing)
3. **Goals** (3-5 key objectives)
4. **User Stories** (3-5 key stories with acceptance criteria)
5. **Feature Requirements** (must-haves and nice-to-haves)
6. **Success Metrics** (how we'll measure success)

Format in clean markdown. Keep it under 1000 words.`;

    // Generate PRD (simplified - removed timeout race condition)
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prdPrompt,
        },
      ],
    });

    const prdContent = message.content[0].type === 'text' ? message.content[0].text : '';

    if (!prdContent) {
      throw new Error('Failed to generate PRD content');
    }

    console.log('[Create PRD] Generated PRD with', prdContent.length, 'characters');

    // Try to save to database, but don't fail if table doesn't exist
    let savedPRD = null;
    try {
      const { data, error: saveError } = await supabase
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

      if (saveError) {
        console.warn('[Create PRD] Failed to save to database:', saveError);
      } else {
        savedPRD = data;
      }
    } catch (dbError) {
      console.warn('[Create PRD] Database save error (table may not exist):', dbError);
      // Continue anyway - we still have the PRD content
    }

    return NextResponse.json({
      success: true,
      message: 'PRD created successfully! Check your downloads folder or copy the content below.',
      prd: {
        id: savedPRD?.id,
        content: prdContent,
        createdAt: new Date().toISOString(),
        wordCount: prdContent.split(/\s+/).length,
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
