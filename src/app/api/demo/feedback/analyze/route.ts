import { NextRequest, NextResponse } from 'next/server';
import { analyzeFeedback, AnalysisRequest } from '@/lib/user-feedback/feedback-service';

export const maxDuration = 60; // Allow longer timeout for scraping + GPT-4o

export async function POST(req: NextRequest) {
    try {
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

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Feedback analysis failed:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to analyze feedback' },
            { status: 500 }
        );
    }
}
