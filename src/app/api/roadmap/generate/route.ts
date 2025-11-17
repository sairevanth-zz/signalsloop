/**
 * Roadmap Generation API
 * POST /api/roadmap/generate
 *
 * Triggers roadmap suggestion generation for a project
 * - Calculates priority scores for all themes
 * - Optionally generates AI reasoning (can be deferred to background)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateRoadmapSuggestions, generateAllReasoning } from '@/lib/roadmap';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for generation

interface GenerateRequest {
  projectId: string;
  generateReasoning?: boolean; // Whether to generate AI reasoning immediately
}

/**
 * POST /api/roadmap/generate
 * Generate roadmap suggestions for a project
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as GenerateRequest;
    const { projectId, generateReasoning = false } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Verify user owns the project
    const { data: project } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Generate priority scores
    console.log(`Generating roadmap suggestions for project ${projectId}...`);
    const suggestions = await generateRoadmapSuggestions(projectId);

    // Optionally generate AI reasoning
    if (generateReasoning && suggestions && suggestions.length > 0) {
      console.log('Generating AI reasoning for suggestions...');
      await generateAllReasoning(projectId);
    }

    return NextResponse.json({
      success: true,
      suggestions: suggestions,
      message: generateReasoning
        ? 'Roadmap generated with AI reasoning'
        : 'Roadmap generated. AI reasoning can be generated separately.'
    });

  } catch (error) {
    console.error('Error generating roadmap:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
