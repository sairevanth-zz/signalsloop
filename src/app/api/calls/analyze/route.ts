/**
 * Call Analysis API
 * POST /api/calls/analyze
 *
 * Analyzes call transcripts using AI to extract:
 * - Sentiment analysis
 * - Competitor mentions
 * - Objections
 * - Expansion signals
 * - Churn signals
 * - Feature requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { getOpenAI } from '@/lib/openai-client';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface AnalysisResult {
    sentiment: number; // -1 to 1
    sentiment_label: string;
    competitors: Array<{ name: string; context: string }>;
    objections: Array<{ type: string; severity: string; context: string }>;
    expansion_signals: { score: number; signals: string[] };
    churn_signals: { score: number; signals: string[] };
    feature_requests: Array<{ title: string; description: string }>;
    key_highlights: string[];
    summary: string;
}

async function analyzeTranscript(transcript: string, customer: string | null): Promise<AnalysisResult> {
    const openai = getOpenAI();

    const systemPrompt = `You are an expert sales call analyst. Analyze the following call transcript and extract key insights.

Return a JSON object with EXACTLY these fields:
{
  "sentiment": <number between -1 (very negative) and 1 (very positive)>,
  "sentiment_label": "<one of: Very Negative, Negative, Neutral, Positive, Very Positive>",
  "competitors": [{"name": "<competitor name>", "context": "<why they were mentioned>"}],
  "objections": [{"type": "<objection category>", "severity": "<low/medium/high>", "context": "<what was said>"}],
  "expansion_signals": {"score": <0-100>, "signals": ["<signal 1>", "<signal 2>"]},
  "churn_signals": {"score": <0-100>, "signals": ["<signal 1>", "<signal 2>"]},
  "feature_requests": [{"title": "<feature name>", "description": "<what they want>"}],
  "key_highlights": ["<key point 1>", "<key point 2>"],
  "summary": "<2-3 sentence summary of the call>"
}

Important:
- Expansion signals indicate upsell/expansion opportunities (adding seats, upgrading, happy customer)
- Churn signals indicate risk of losing the customer (complaints, comparing competitors, budget issues)
- Be specific with competitor names if mentioned
- Common objection types: pricing, features, support, integration, security, timeline
- Return empty arrays if nothing found for a category`;

    const userPrompt = `Analyze this call transcript${customer ? ` from ${customer}` : ''}:

"${transcript}"`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
            max_tokens: 1500,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from AI');
        }

        return JSON.parse(content) as AnalysisResult;
    } catch (error) {
        console.error('[Call Analysis] AI error:', error);
        // Return default analysis on error
        return {
            sentiment: 0,
            sentiment_label: 'Neutral',
            competitors: [],
            objections: [],
            expansion_signals: { score: 0, signals: [] },
            churn_signals: { score: 0, signals: [] },
            feature_requests: [],
            key_highlights: [],
            summary: 'Analysis failed - please retry',
        };
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { projectId, limit = 10 } = body;

        if (!projectId) {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }

        const supabase = getSupabaseServerClient();
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database connection not available' },
                { status: 500 }
            );
        }

        // Fetch unanalyzed call records
        const { data: pendingRecords, error: fetchError } = await supabase
            .from('call_records')
            .select('*')
            .eq('project_id', projectId)
            .is('analyzed_at', null)
            .limit(limit);

        if (fetchError) {
            console.error('[Call Analysis] Fetch error:', fetchError);
            return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
        }

        if (!pendingRecords || pendingRecords.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No pending calls to analyze',
                analyzed: 0,
                remaining: 0,
            });
        }

        console.log(`[Call Analysis] Analyzing ${pendingRecords.length} calls for project ${projectId}`);

        // Analyze each record
        const results = [];
        for (const record of pendingRecords) {
            try {
                const analysis = await analyzeTranscript(record.transcript, record.customer);

                // Update the record with analysis results
                // Only update columns that exist in the call_records table
                const { error: updateError } = await supabase
                    .from('call_records')
                    .update({
                        sentiment: analysis.sentiment,
                        competitors: analysis.competitors,
                        objections: analysis.objections,
                        expansion_signals: analysis.expansion_signals,
                        churn_signals: analysis.churn_signals,
                        feature_requests: analysis.feature_requests,
                        analyzed_at: new Date().toISOString(),
                    })
                    .eq('id', record.id);

                if (updateError) {
                    console.error(`[Call Analysis] Update error for ${record.id}:`, updateError);
                    results.push({ id: record.id, success: false, error: updateError.message });
                } else {
                    results.push({ id: record.id, success: true, sentiment: analysis.sentiment_label });
                }
            } catch (err) {
                console.error(`[Call Analysis] Error analyzing ${record.id}:`, err);
                results.push({ id: record.id, success: false, error: 'Analysis failed' });
            }
        }

        // Check remaining
        const { count: remaining } = await supabase
            .from('call_records')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', projectId)
            .is('analyzed_at', null);

        // Update ingest status if all done
        if (remaining === 0) {
            await supabase
                .from('call_ingests')
                .update({ status: 'completed' })
                .eq('project_id', projectId)
                .in('status', ['pending', 'processing']);
        }

        const successCount = results.filter((r) => r.success).length;

        console.log(`[Call Analysis] Completed: ${successCount}/${pendingRecords.length}, Remaining: ${remaining}`);

        return NextResponse.json({
            success: true,
            analyzed: successCount,
            remaining: remaining || 0,
            results,
            message: remaining && remaining > 0
                ? `Analyzed ${successCount} calls. ${remaining} remaining - call again to continue.`
                : `All ${successCount} calls analyzed successfully!`,
        });
    } catch (error) {
        console.error('[Call Analysis] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
