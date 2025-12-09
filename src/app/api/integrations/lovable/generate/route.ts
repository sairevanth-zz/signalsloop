/**
 * POST /api/integrations/lovable/generate
 * 
 * Generate a prototype using Lovable AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generatePrototype, generateFromSpec } from '@/lib/integrations/lovable-service';

const RequestSchema = z.object({
    projectId: z.string().uuid(),
    specId: z.string().uuid().optional(),
    title: z.string().min(1).optional(),
    prompt: z.string().optional(),
    designPreferences: z.object({
        style: z.enum(['modern', 'minimal', 'enterprise', 'playful']).optional(),
        colorScheme: z.enum(['light', 'dark', 'auto']).optional()
    }).optional()
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const data = RequestSchema.parse(body);

        let result;

        if (data.specId) {
            // Generate from existing spec
            result = await generateFromSpec(data.projectId, data.specId);
        } else if (data.title && data.prompt) {
            // Generate from provided content
            result = await generatePrototype({
                projectId: data.projectId,
                title: data.title,
                prompt: data.prompt,
                designPreferences: data.designPreferences
            });
        } else {
            return NextResponse.json(
                { error: 'Either specId or (title + prompt) required' },
                { status: 400 }
            );
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('[API] Lovable generation error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Prototype generation failed' },
            { status: 500 }
        );
    }
}
