/**
 * Hunter Actions API
 * Manage action recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import {
  GenerateRecommendationsRequest,
  GenerateRecommendationsResponse,
} from '@/types/hunter';
import { getOpenAI } from '@/lib/openai-client';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/hunter/actions?projectId=xxx
 * Get action recommendations for a project
 */
export async function GET(request: NextRequest) {
  try {
    // Use createServerClient for auth (reads cookies)
    const supabaseAuth = await createServerClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database connection error' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

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

    if (!project || project.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Build query
    let query = supabase
      .from('action_recommendations')
      .select('*')
      .eq('project_id', projectId);

    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    query = query.order('priority_score', { ascending: false });

    const { data: recommendations, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      recommendations: recommendations || [],
    });
  } catch (error) {
    console.error('[Hunter Actions] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch action recommendations',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hunter/actions
 * Generate new action recommendations
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = await createServerClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database connection error' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as GenerateRecommendationsRequest;
    const { projectId, minMentions = 3, lookbackDays = 7 } = body;

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

    if (!project || project.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get recent feedback
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

    const { data: feedback, error: feedbackError } = await supabase
      .from('discovered_feedback')
      .select('*')
      .eq('project_id', projectId)
      .gte('discovered_at', lookbackDate.toISOString())
      .eq('is_duplicate', false)
      .eq('is_archived', false);

    if (feedbackError) {
      throw feedbackError;
    }

    if (!feedback || feedback.length === 0) {
      return NextResponse.json<GenerateRecommendationsResponse>({
        success: true,
        recommendations: [],
        message: 'No recent feedback to analyze',
      });
    }

    // Group feedback by classification and extract patterns
    const grouped: Record<string, any[]> = feedback.reduce((acc: Record<string, any[]>, item) => {
      const key = item.classification || 'other';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    // Generate recommendations using AI
    const recommendations = [];

    for (const [classification, items] of Object.entries(grouped)) {
      if (items.length < minMentions) continue;

      // Use OpenAI to analyze and generate recommendation
      const feedbackTexts = items.slice(0, 20).map((f) => f.content);
      const avgSentiment =
        items.reduce((sum, f) => sum + (f.sentiment_score || 0), 0) /
        items.length;

      const prompt = `Analyze these ${items.length} customer feedback items classified as "${classification}":

${feedbackTexts.map((t, i) => `${i + 1}. ${t.substring(0, 200)}`).join('\n\n')}

Generate an action recommendation with:
- issue_summary: A concise summary of the common issue/theme
- issue_category: Category (e.g., "UX Issue", "Feature Gap", "Bug", "Pricing Concern")
- priority: urgent | high | medium | low (based on frequency, sentiment, and urgency)
- priority_reason: Brief explanation of priority
- suggested_actions: Array of 2-4 specific, actionable steps
- draft_response: A professional response acknowledging the feedback
- revenue_at_risk_estimate: Estimated $ amount (if applicable, otherwise 0)
- affected_users_estimate: Estimated number of affected users
- business_impact: Brief description of business impact

Return JSON only.`;

      try {
        const response = await getOpenAI().chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content:
                'You are a product manager analyzing customer feedback to generate actionable recommendations.',
            },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.5,
        });

        const analysis = JSON.parse(
          response.choices[0].message.content || '{}'
        );

        // Calculate priority score
        const priorityScores = { urgent: 100, high: 75, medium: 50, low: 25 };
        const priorityScore =
          priorityScores[analysis.priority as keyof typeof priorityScores] || 50;

        // Insert recommendation
        const { data: recommendation, error: insertError } = await supabase
          .from('action_recommendations')
          .insert({
            project_id: projectId,
            feedback_ids: items.map((f) => f.id),
            issue_summary: analysis.issue_summary,
            issue_category: analysis.issue_category,
            mention_count: items.length,
            avg_sentiment: avgSentiment,
            priority: analysis.priority,
            priority_score: priorityScore,
            priority_reason: analysis.priority_reason,
            suggested_actions: analysis.suggested_actions,
            draft_response: analysis.draft_response,
            draft_response_tone: 'professional',
            revenue_at_risk_estimate: analysis.revenue_at_risk_estimate || 0,
            affected_users_estimate: analysis.affected_users_estimate || items.length,
            business_impact: analysis.business_impact,
            status: 'pending',
          })
          .select()
          .single();

        if (!insertError && recommendation) {
          recommendations.push(recommendation);
        }
      } catch (error) {
        console.error(
          `[Hunter Actions] Error analyzing ${classification}:`,
          error
        );
      }
    }

    return NextResponse.json<GenerateRecommendationsResponse>({
      success: true,
      recommendations,
      message: `Generated ${recommendations.length} action recommendations`,
    });
  } catch (error) {
    console.error('[Hunter Actions] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate recommendations',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/hunter/actions?actionId=xxx
 * Update an action recommendation
 */
export async function PUT(request: NextRequest) {
  try {
    const supabaseAuth = await createServerClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database connection error' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const actionId = searchParams.get('actionId');
    const body = await request.json();

    if (!actionId) {
      return NextResponse.json(
        { success: false, error: 'actionId is required' },
        { status: 400 }
      );
    }

    // Get action and verify ownership
    const { data: action } = await supabase
      .from('action_recommendations')
      .select('project_id')
      .eq('id', actionId)
      .single();

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action not found' },
        { status: 404 }
      );
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', action.project_id)
      .single();

    if (!project || project.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update action
    const { data: updated, error } = await supabase
      .from('action_recommendations')
      .update(body)
      .eq('id', actionId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      recommendation: updated,
    });
  } catch (error) {
    console.error('[Hunter Actions] PUT error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update action',
      },
      { status: 500 }
    );
  }
}
