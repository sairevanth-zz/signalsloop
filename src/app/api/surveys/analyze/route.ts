/**
 * Survey Analysis API
 * POST /api/surveys/analyze - Analyze survey responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { getOpenAI } from '@/lib/openai-client';
import type { SurveyAnalysis, QuestionSummary, ThemeSummary } from '@/types/polls';

// POST /api/surveys/analyze
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { surveyId } = body;

        if (!surveyId) {
            return NextResponse.json(
                { error: 'surveyId is required' },
                { status: 400 }
            );
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

        const serviceClient = getSupabaseServiceRoleClient();

        // Fetch survey with questions
        const { data: survey, error: surveyError } = await serviceClient
            .from('surveys')
            .select(`
        *,
        questions:survey_questions(*)
      `)
            .eq('id', surveyId)
            .single();

        if (surveyError || !survey) {
            return NextResponse.json(
                { error: 'Survey not found' },
                { status: 404 }
            );
        }

        // Verify user owns the project
        const { data: project } = await serviceClient
            .from('projects')
            .select('owner_id')
            .eq('id', survey.project_id)
            .single();

        if (!project || project.owner_id !== user.id) {
            return NextResponse.json(
                { error: 'Access denied' },
                { status: 403 }
            );
        }

        // Fetch all responses
        const { data: responses, error: responsesError } = await serviceClient
            .from('survey_responses')
            .select('*')
            .eq('survey_id', surveyId)
            .eq('is_complete', true);

        if (responsesError) {
            console.error('[Survey Analysis] Error fetching responses:', responsesError);
            return NextResponse.json(
                { error: 'Failed to fetch responses' },
                { status: 500 }
            );
        }

        const questions = survey.questions as any[];
        const questionSummaries: QuestionSummary[] = [];
        const textResponses: { questionId: string; text: string }[] = [];

        // Process each question
        for (const question of questions) {
            const summary: QuestionSummary = {
                question_id: question.id,
                question_text: question.question_text,
                question_type: question.question_type,
                response_count: 0
            };

            const questionAnswers: any[] = [];

            for (const response of responses || []) {
                const answer = response.answers?.[question.id];
                if (answer !== undefined && answer !== null && answer !== '') {
                    questionAnswers.push(answer);
                    summary.response_count++;

                    // Collect text responses for theme detection
                    if (question.question_type === 'text') {
                        textResponses.push({
                            questionId: question.id,
                            text: String(answer)
                        });
                    }
                }
            }

            // Process based on question type
            if (question.question_type === 'single_select' || question.question_type === 'multi_select') {
                const optionCounts: Record<string, number> = {};
                const options = question.options || [];

                for (const opt of options) {
                    optionCounts[opt] = 0;
                }

                for (const answer of questionAnswers) {
                    if (question.question_type === 'multi_select' && Array.isArray(answer)) {
                        for (const opt of answer) {
                            optionCounts[opt] = (optionCounts[opt] || 0) + 1;
                        }
                    } else {
                        optionCounts[String(answer)] = (optionCounts[String(answer)] || 0) + 1;
                    }
                }

                summary.option_counts = optionCounts;
            }

            if (question.question_type === 'rating' || question.question_type === 'nps') {
                const numericAnswers = questionAnswers.map(Number).filter(n => !isNaN(n));
                if (numericAnswers.length > 0) {
                    summary.average_score = numericAnswers.reduce((a, b) => a + b, 0) / numericAnswers.length;

                    // Score distribution
                    const distribution: Record<number, number> = {};
                    for (const score of numericAnswers) {
                        distribution[score] = (distribution[score] || 0) + 1;
                    }
                    summary.score_distribution = distribution;
                }
            }

            if (question.question_type === 'text') {
                // Sample responses (first 5)
                summary.sample_responses = questionAnswers.slice(0, 5).map(String);

                // Calculate average sentiment from responses with sentiment scores
                const sentimentScores = (responses || [])
                    .filter(r => r.answers?.[question.id] && r.sentiment_score !== null)
                    .map(r => r.sentiment_score as number);

                if (sentimentScores.length > 0) {
                    summary.sentiment_avg = sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length;
                }
            }

            questionSummaries.push(summary);
        }

        // Detect themes from text responses using AI
        let detectedThemes: ThemeSummary[] = [];

        if (textResponses.length >= 3) {
            try {
                const openai = getOpenAI();
                const combinedText = textResponses
                    .map(t => t.text)
                    .slice(0, 50)
                    .join('\n---\n');

                const response = await openai.chat.completions.create({
                    model: 'gpt-4o',
                    messages: [
                        {
                            role: 'system',
                            content: `Analyze survey text responses and identify common themes. Return JSON:
{
  "themes": [
    {
      "theme": "Theme name",
      "count": approximate_count,
      "sentiment_avg": -1 to 1,
      "sample_quotes": ["quote1", "quote2"]
    }
  ]
}
Identify 3-5 key themes. Focus on actionable insights.`
                        },
                        {
                            role: 'user',
                            content: `Analyze these ${textResponses.length} survey responses:\n\n${combinedText}`
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 800,
                    response_format: { type: 'json_object' }
                });

                const content = response.choices[0]?.message?.content;
                if (content) {
                    const result = JSON.parse(content);
                    detectedThemes = (result.themes || []).map((t: any) => ({
                        theme: t.theme,
                        count: t.count || 1,
                        sentiment_avg: t.sentiment_avg || 0,
                        sample_quotes: t.sample_quotes || []
                    }));
                }
            } catch (error) {
                console.error('[Survey Analysis] Theme detection error:', error);
            }
        }

        // Calculate overall metrics
        const completedResponses = (responses || []).filter(r => r.is_complete);
        const avgSentiment = completedResponses
            .filter(r => r.sentiment_score !== null)
            .reduce((sum, r, _, arr) => sum + (r.sentiment_score || 0) / arr.length, 0);

        const analysis: SurveyAnalysis = {
            survey: {
                id: survey.id,
                project_id: survey.project_id,
                title: survey.title,
                description: survey.description,
                status: survey.status,
                thank_you_message: survey.thank_you_message,
                closes_at: survey.closes_at,
                created_by: survey.created_by,
                response_count: survey.response_count,
                completion_rate: survey.completion_rate,
                avg_sentiment: survey.avg_sentiment,
                allow_anonymous: survey.allow_anonymous,
                created_at: survey.created_at,
                updated_at: survey.updated_at
            },
            response_count: completedResponses.length,
            completion_rate: survey.completion_rate || 0,
            avg_sentiment: avgSentiment,
            question_summaries: questionSummaries,
            detected_themes: detectedThemes
        };

        console.log(`[Survey Analysis] ✓ Analyzed survey ${surveyId}: ${completedResponses.length} responses, ${detectedThemes.length} themes`);

        return NextResponse.json(analysis);

    } catch (error) {
        console.error('[Survey Analysis] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
