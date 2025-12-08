import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

export async function POST(req: NextRequest) {
    try {
        const { prompt } = await req.json();

        if (!prompt) {
            return new NextResponse("Prompt is required", { status: 400 });
        }

        // Rate Limiting
        if (redis) {
            const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
            const key = `ratelimit:spec_demo:${ip}`;
            const count = await redis.incr(key);

            if (count === 1) {
                await redis.expire(key, 86400); // 24 hours
            }

            if (count > 5) {
                return new NextResponse("Rate limit exceeded. You can generate 5 specs per day.", { status: 429 });
            }
        }

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            stream: true,
            messages: [
                {
                    role: 'system',
                    content: `You are an expert Product Manager writing a PRD.
          
          Generate a complete, professional PRD. Be concise but thorough.
          
          Output Format:
          ## Problem Statement
          2-3 sentences clearly articulating the problem. Who is affected and why it matters.
          
          ## User Stories
          3-5 user stories:
          - As a [user type], I want [action] so that [benefit]
          
          ## Acceptance Criteria
          5-8 testable criteria:
          - [ ] Criterion description
          
          ## Success Metrics
          3-4 measurable metrics:
          - Metric: Target (e.g., "Adoption: >40% of users within 30 days")
          
          ## Technical Notes
          2-3 implementation considerations.
          
          IMPORTANT: Generate each section completely before moving to the next. Use clear markdown formatting.`
                },
                {
                    role: 'user',
                    content: `FEATURE REQUEST: ${prompt}`
                }
            ],
            temperature: 0.7,
        });

        const stream = OpenAIStream(response);
        return new StreamingTextResponse(stream);

    } catch (error) {
        console.error("Error generating spec:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
