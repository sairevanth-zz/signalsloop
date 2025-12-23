import { NextRequest, NextResponse } from 'next/server';
import {
    calculateHealthScore,
    calculateHealthScoreFromAnalysis,
    generateShareToken,
    HealthScoreInput
} from '@/lib/health-score';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 30; // 30 second timeout

// Initialize Supabase client for server-side operations
function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return null;
    }

    return createClient(supabaseUrl, supabaseKey);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        let healthScoreInput: HealthScoreInput;

        // Check if we're receiving raw input or analysis results
        if (body.analysisResult) {
            // Convert analysis result to health score input
            healthScoreInput = calculateHealthScoreFromAnalysis(body.analysisResult);
            healthScoreInput.productName = body.productName || body.analysisResult.product_summary?.product_name;
        } else if (body.input) {
            // Direct health score input
            healthScoreInput = body.input as HealthScoreInput;
        } else {
            // Assume the body is the input directly
            healthScoreInput = {
                overallSentiment: body.overallSentiment ?? 0,
                sentimentTrend: body.sentimentTrend ?? 'stable',
                criticalIssueCount: body.criticalIssueCount ?? 0,
                totalFeedbackCount: body.totalFeedbackCount ?? 1,
                praisePercentage: body.praisePercentage ?? 50,
                topThemeConcentration: body.topThemeConcentration ?? 50,
                productName: body.productName,
            };
        }

        // Calculate health score
        const healthScore = calculateHealthScore(healthScoreInput);

        // Optionally persist to database if requested
        let shareToken: string | null = null;
        if (body.persist) {
            const supabase = getSupabaseClient();
            if (supabase) {
                shareToken = generateShareToken();

                await supabase.from('health_scores').insert({
                    product_name: healthScore.productName,
                    score: healthScore.score,
                    grade: healthScore.grade.label,
                    components: healthScore.components,
                    actions: healthScore.topActions,
                    interpretation: healthScore.interpretation,
                    share_token: shareToken,
                    session_id: body.sessionId || null,
                });
            }
        }

        return NextResponse.json({
            ...healthScore,
            shareToken,
            shareUrl: shareToken ? `/health/${shareToken}` : null,
        });
    } catch (error: unknown) {
        console.error('Health score calculation failed:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to calculate health score' },
            { status: 500 }
        );
    }
}
