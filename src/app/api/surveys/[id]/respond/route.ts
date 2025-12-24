/**
 * Survey Response API
 * POST /api/surveys/[id]/respond - Submit a survey response
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { getOpenAI } from '@/lib/openai-client';
import crypto from 'crypto';
import type { SubmitSurveyResponseInput, SurveyQuestion } from '@/types/polls';

interface RouteContext {
    params: Promise<{ id: string }>;
}

/**
 * Generate respondent hash for deduplication
 */
function generateRespondentHash(
    email?: string,
    ip?: string,
    userAgent?: string,
    userId?: string
): string {
    if (userId) {
        return crypto.createHash('sha256').update(`user:${userId}`).digest('hex');
    }
    if (email) {
        return crypto.createHash('sha256').update(`email:${email.toLowerCase()}`).digest('hex');
    }
    const identifier = `${ip || 'unknown'}:${userAgent || 'unknown'}`;
    return crypto.createHash('sha256').update(identifier).digest('hex');
}

/**
 * Analyze text responses for sentiment
 */
async function analyzeTextSentiment(textResponses: string[]): Promise<number | null> {
    if (textResponses.length === 0) return null;

    try {
        const openai = getOpenAI();
        const combinedText = textResponses.join('\n\n');

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Analyze the sentiment of the following survey responses. Return a JSON object with a single "score" field containing a number between -1 (very negative) and 1 (very positive). 0 is neutral.'
                },
                {
                    role: 'user',
                    content: combinedText.slice(0, 2000)
                }
            ],
            temperature: 0.1,
            max_tokens: 50,
            response_format: { type: 'json_object' }
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
            const result = JSON.parse(content);
            return result.score;
        }
    } catch (error) {
        console.error('[Survey Response] Sentiment analysis error:', error);
    }

    return null;
}

// POST /api/surveys/[id]/respond
export async function POST(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id: surveyId } = await context.params;
        const body = await request.json() as SubmitSurveyResponseInput;

        // Get IP and user agent
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
            request.headers.get('x-real-ip') ||
            'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';

        const supabase = await getSupabaseServerClient();
        const serviceClient = getSupabaseServiceRoleClient();

        // Get current user (may be null for anonymous)
        const { data: { user } } = await supabase.auth.getUser();

        // Fetch the survey with questions
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

        // Validate survey is active
        if (survey.status !== 'active') {
            return NextResponse.json(
                { error: 'This survey is not currently accepting responses' },
                { status: 400 }
            );
        }

        // Check if survey is closed
        if (survey.closes_at && new Date(survey.closes_at) < new Date()) {
            return NextResponse.json(
                { error: 'This survey has closed' },
                { status: 400 }
            );
        }

        // Check anonymous permission
        if (!user && !survey.allow_anonymous) {
            return NextResponse.json(
                { error: 'This survey requires authentication' },
                { status: 401 }
            );
        }

        // Generate respondent hash
        const respondentHash = generateRespondentHash(
            body.respondent_email,
            ip,
            userAgent,
            user?.id
        );

        // Check for existing response
        const { data: existingResponse } = await serviceClient
            .from('survey_responses')
            .select('id')
            .eq('survey_id', surveyId)
            .eq('respondent_hash', respondentHash)
            .single();

        if (existingResponse) {
            return NextResponse.json(
                { error: 'You have already responded to this survey' },
                { status: 409 }
            );
        }

        // Validate answers
        const questions = survey.questions as SurveyQuestion[];
        const questionMap = new Map(questions.map(q => [q.id, q]));
        const answers = body.answers || {};
        const textResponses: string[] = [];

        // Check required questions
        for (const question of questions) {
            if (question.required) {
                const answer = answers[question.id];
                if (answer === undefined || answer === null || answer === '') {
                    return NextResponse.json(
                        { error: `Question "${question.question_text.slice(0, 50)}..." is required` },
                        { status: 400 }
                    );
                }
            }

            // Collect text responses for sentiment analysis
            if (question.question_type === 'text' && answers[question.id]) {
                textResponses.push(String(answers[question.id]));
            }

            // Validate select options
            if (question.question_type === 'single_select' && answers[question.id]) {
                const options = question.options || [];
                if (!options.includes(String(answers[question.id]))) {
                    return NextResponse.json(
                        { error: `Invalid option for question: ${question.question_text.slice(0, 30)}...` },
                        { status: 400 }
                    );
                }
            }

            // Validate rating range
            if ((question.question_type === 'rating' || question.question_type === 'nps') && answers[question.id]) {
                const value = Number(answers[question.id]);
                const min = question.min_value || 1;
                const max = question.max_value || (question.question_type === 'nps' ? 10 : 5);
                if (isNaN(value) || value < min || value > max) {
                    return NextResponse.json(
                        { error: `Rating must be between ${min} and ${max}` },
                        { status: 400 }
                    );
                }
            }
        }

        // Analyze sentiment from text responses
        const sentimentScore = await analyzeTextSentiment(textResponses);

        // Try to get customer info
        let customerId = null;
        let customerMrr = null;
        let customerSegment = null;

        if (user?.email || body.respondent_email) {
            const email = user?.email || body.respondent_email;
            const { data: customer } = await serviceClient
                .from('customers')
                .select('id, mrr, segment')
                .eq('email', email)
                .single();

            if (customer) {
                customerId = customer.id;
                customerMrr = customer.mrr;
                customerSegment = customer.segment;
            }
        }

        // Insert response
        const { data: response, error: responseError } = await serviceClient
            .from('survey_responses')
            .insert({
                survey_id: surveyId,
                respondent_id: user?.id || null,
                respondent_email: body.respondent_email || null,
                respondent_hash: respondentHash,
                answers,
                sentiment_score: sentimentScore,
                customer_id: customerId,
                customer_mrr: customerMrr,
                customer_segment: customerSegment,
                is_complete: true,
                completed_at: new Date().toISOString()
            })
            .select()
            .single();

        if (responseError) {
            console.error('[Survey Response API] Error creating response:', responseError);

            if (responseError.code === '23505') {
                return NextResponse.json(
                    { error: 'You have already responded to this survey' },
                    { status: 409 }
                );
            }

            return NextResponse.json(
                { error: 'Failed to submit response' },
                { status: 500 }
            );
        }

        console.log(`[Survey Response API] ✓ Response submitted for survey ${surveyId}`);

        return NextResponse.json({
            success: true,
            response_id: response.id,
            thank_you_message: survey.thank_you_message
        }, { status: 201 });

    } catch (error) {
        console.error('[Survey Response API] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
