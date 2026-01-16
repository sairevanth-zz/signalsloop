import { NextRequest, NextResponse } from 'next/server';
import { analyzeFeedback, AnalysisRequest } from '@/lib/user-feedback/feedback-service';
import { checkDemoRateLimit, incrementDemoUsage, getClientIP, getTimeUntilReset } from '@/lib/demo-rate-limit';

export const maxDuration = 60; // Allow longer timeout for scraping + GPT-4o

export async function POST(req: NextRequest) {
    try {
        // Rate limiting for demo users
        const clientIP = getClientIP(req);
        const rateCheck = checkDemoRateLimit(clientIP, 'feedback_analysis');

        if (!rateCheck.allowed) {
            return NextResponse.json({
                error: `Rate limit exceeded. You can run ${rateCheck.limit} analyses per hour. Try again in ${getTimeUntilReset(rateCheck.resetAt)}.`,
                remaining: 0,
                limit: rateCheck.limit,
                resetAt: rateCheck.resetAt
            }, { status: 429 });
        }

        const body = await req.json();
        const { productName, sources, pastedFeedback, uploadedCsv } = body;

        if (!productName) {
            return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
        }

        const request: AnalysisRequest = {
            productName,
            sources: sources || { reddit: false, app_store: false, play_store: false, hacker_news: false },
            pastedFeedback,
            uploadedCsv
        };

        const result = await analyzeFeedback(request);

        // Only increment usage after successful analysis
        incrementDemoUsage(clientIP, 'feedback_analysis');

        return NextResponse.json({
            ...result,
            _rateLimit: {
                remaining: rateCheck.remaining,
                limit: rateCheck.limit,
                resetAt: rateCheck.resetAt
            }
        });
    } catch (error: any) {
        console.error('Feedback analysis failed:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to analyze feedback' },
            { status: 500 }
        );
    }
}
