/**
 * AI Poll Option Suggestions API
 * POST /api/polls/suggest-options - Generate poll options from themes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { getOpenAI } from '@/lib/openai-client';
import type { PollSuggestionRequest, PollSuggestionResponse, SuggestedPollOption } from '@/types/polls';

const MODEL = 'gpt-4o';

const SYSTEM_PROMPT = `You are an expert product manager helping create effective polls to gather user feedback.

Given a theme or context from user feedback, generate poll options that:
1. Are clear and mutually exclusive
2. Cover the key variations/use cases within the theme
3. Are actionable (can inform product decisions)
4. Include a balanced mix of options (not biased toward any outcome)

Return your suggestions as JSON with this structure:
{
  "suggested_title": "Clear poll question",
  "suggested_description": "Brief context for voters",
  "options": [
    {
      "option_text": "Short option text (max 80 chars)",
      "description": "Longer explanation of what this option means",
      "confidence": 0.0-1.0 (how well this captures the theme)
    }
  ]
}

Generate 4-6 options unless specified otherwise. Always include an "Other" or "None of these" option if appropriate.`;

// POST /api/polls/suggest-options
export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as PollSuggestionRequest;
        const { project_id, theme_id, context, num_options = 5 } = body;

        if (!project_id) {
            return NextResponse.json(
                { error: 'project_id is required' },
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

        const serviceClient = getSupabaseServiceRoleClient();

        // Build context for AI
        let promptContext = '';

        // If theme_id provided, fetch theme details
        if (theme_id) {
            const { data: theme } = await serviceClient
                .from('themes')
                .select('theme_name, description, frequency, avg_sentiment')
                .eq('id', theme_id)
                .single();

            if (theme) {
                promptContext += `Theme: "${theme.theme_name}"
Description: ${theme.description || 'No description'}
Frequency: ${theme.frequency} mentions
Average Sentiment: ${theme.avg_sentiment?.toFixed(2) || 'Unknown'}

`;
            }

            // Get related feedback for the theme
            const { data: feedbackThemes } = await serviceClient
                .from('feedback_themes')
                .select(`
          confidence,
          feedback:posts(id, title, description, category, vote_count)
        `)
                .eq('theme_id', theme_id)
                .order('confidence', { ascending: false })
                .limit(10);

            if (feedbackThemes && feedbackThemes.length > 0) {
                promptContext += `Related Feedback (${feedbackThemes.length} items):\n`;
                for (const ft of feedbackThemes) {
                    const f = ft.feedback as any;
                    if (f) {
                        promptContext += `- "${f.title}" (${f.vote_count} votes, ${f.category || 'uncategorized'})\n`;
                        if (f.description) {
                            promptContext += `  ${f.description.slice(0, 150)}...\n`;
                        }
                    }
                }
                promptContext += '\n';
            }
        }

        // Add custom context if provided
        if (context) {
            promptContext += `Additional Context:\n${context}\n`;
        }

        // If no context at all, get recent high-voted feedback
        if (!promptContext.trim()) {
            const { data: recentFeedback } = await serviceClient
                .from('posts')
                .select('id, title, description, category, vote_count')
                .eq('project_id', project_id)
                .order('vote_count', { ascending: false })
                .limit(15);

            if (recentFeedback && recentFeedback.length > 0) {
                promptContext = `Top Voted Feedback:\n`;
                for (const f of recentFeedback) {
                    promptContext += `- "${f.title}" (${f.vote_count} votes)\n`;
                }
            }
        }

        if (!promptContext.trim()) {
            return NextResponse.json(
                { error: 'Not enough context to generate options. Provide a theme_id or context.' },
                { status: 400 }
            );
        }

        // Call OpenAI
        const openai = getOpenAI();
        const response = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: `Based on this feedback context, suggest ${num_options} poll options:

${promptContext}

Generate options that would help prioritize or clarify user needs within this theme.`
                }
            ],
            temperature: 0.7,
            max_tokens: 1000,
            response_format: { type: 'json_object' }
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from OpenAI');
        }

        const aiResult = JSON.parse(content);

        // Format response
        const options: SuggestedPollOption[] = (aiResult.options || []).map((opt: any) => ({
            option_text: opt.option_text || opt.text || '',
            description: opt.description || '',
            confidence: opt.confidence || 0.8,
            supporting_feedback_ids: [], // Could be enhanced to link feedback
            source_theme: theme_id ? theme_id : undefined
        }));

        const result: PollSuggestionResponse = {
            options,
            suggested_title: aiResult.suggested_title || aiResult.title,
            suggested_description: aiResult.suggested_description || aiResult.description
        };

        console.log(`[Poll Suggest API] ✓ Generated ${options.length} options for project ${project_id}`);

        return NextResponse.json(result);

    } catch (error) {
        console.error('[Poll Suggest API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate suggestions' },
            { status: 500 }
        );
    }
}
