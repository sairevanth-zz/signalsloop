import OpenAI from 'openai';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Lazy getter for Redis - only initialize if credentials exist
function getRedis(): Redis | null {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        return new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
    }
    return null;
}

export async function POST(req: NextRequest) {
    try {
        const { prompt } = await req.json();

        if (!prompt) {
            return new NextResponse("Prompt is required", { status: 400 });
        }

        // Rate Limiting
        const redis = getRedis();
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

        // Initialize OpenAI inside handler to avoid build-time issues
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

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

        // Stream using AI SDK compatible format (text stream)
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of response) {
                        const text = chunk.choices[0]?.delta?.content || '';
                        if (text) {
                            // Send as plain text - useCompletion with streamProtocol: 'text' expects this
                            controller.enqueue(encoder.encode(text));
                        }
                    }
                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });

    } catch (error) {
        console.error("Error generating spec:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}


