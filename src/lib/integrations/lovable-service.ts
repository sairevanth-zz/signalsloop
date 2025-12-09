/**
 * Lovable Integration Service
 * 
 * Integrates with Lovable AI to generate working prototypes
 * from SignalsLoop specs and PRDs.
 * 
 * Lovable API: https://docs.lovable.dev/api
 */

import { getServiceRoleClient } from '@/lib/supabase-singleton';
import type {
    LovableGenerationRequest,
    LovableGenerationResult,
    LovableProject
} from '@/types/lovable-integration';

const LOVABLE_API_BASE = 'https://api.lovable.dev/v1';

/**
 * Generate a prototype from a spec using Lovable
 */
export async function generatePrototype(
    request: LovableGenerationRequest
): Promise<LovableGenerationResult> {
    const apiKey = process.env.LOVABLE_API_KEY;

    if (!apiKey) {
        console.warn('[Lovable] API key not configured');
        return {
            success: false,
            error: 'Lovable API key not configured. Set LOVABLE_API_KEY environment variable.',
            generatedAt: new Date(),
            specId: request.specId
        };
    }

    try {
        // Build prompt from spec content
        const fullPrompt = buildLovablePrompt(request);

        console.log(`[Lovable] Generating prototype for: ${request.title}`);

        // Call Lovable API
        const response = await fetch(`${LOVABLE_API_BASE}/projects`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: request.title,
                prompt: fullPrompt,
                settings: {
                    style: request.designPreferences?.style || 'modern',
                    colorScheme: request.designPreferences?.colorScheme || 'dark'
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `API error: ${response.status}`);
        }

        const data = await response.json();

        // Store the generation result
        await storeGeneration({
            projectId: request.projectId,
            specId: request.specId,
            lovableProjectId: data.id,
            lovableUrl: data.url,
            title: request.title,
            generatedAt: new Date()
        });

        console.log(`[Lovable] Prototype created: ${data.url}`);

        return {
            success: true,
            lovableProjectId: data.id,
            lovableUrl: data.url,
            generatedAt: new Date(),
            specId: request.specId
        };
    } catch (error) {
        console.error('[Lovable] Generation failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            generatedAt: new Date(),
            specId: request.specId
        };
    }
}

/**
 * Build a comprehensive prompt for Lovable
 */
function buildLovablePrompt(request: LovableGenerationRequest): string {
    let prompt = request.prompt;

    // Add user stories if provided
    if (request.userStories?.length) {
        prompt += '\n\nUser Stories:\n';
        prompt += request.userStories.map(s => `- ${s}`).join('\n');
    }

    // Add component hints
    if (request.designPreferences?.components?.length) {
        prompt += '\n\nKey UI Components needed:\n';
        prompt += request.designPreferences.components.map(c => `- ${c}`).join('\n');
    }

    // Add SignalsLoop context
    prompt += '\n\nAdditional context:';
    prompt += '\n- This is for a B2B SaaS product';
    prompt += '\n- Use modern React patterns';
    prompt += '\n- Include responsive design';
    prompt += '\n- Use shadcn/ui style components if appropriate';

    return prompt;
}

/**
 * Store generation record
 */
async function storeGeneration(data: {
    projectId: string;
    specId?: string;
    lovableProjectId: string;
    lovableUrl: string;
    title: string;
    generatedAt: Date;
}): Promise<void> {
    const supabase = getServiceRoleClient();
    if (!supabase) return;

    await supabase.from('lovable_generations').insert({
        project_id: data.projectId,
        spec_id: data.specId,
        lovable_project_id: data.lovableProjectId,
        lovable_url: data.lovableUrl,
        title: data.title,
        created_at: data.generatedAt
    });
}

/**
 * Get generations for a project
 */
export async function getProjectGenerations(
    projectId: string
): Promise<LovableProject[]> {
    const supabase = getServiceRoleClient();
    if (!supabase) return [];

    const { data } = await supabase
        .from('lovable_generations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

    return (data || []).map(g => ({
        id: g.lovable_project_id,
        name: g.title,
        url: g.lovable_url,
        createdAt: new Date(g.created_at),
        status: 'ready' as const
    }));
}

/**
 * Generate from a spec ID
 */
export async function generateFromSpec(
    projectId: string,
    specId: string
): Promise<LovableGenerationResult> {
    const supabase = getServiceRoleClient();
    if (!supabase) {
        return {
            success: false,
            error: 'Database unavailable',
            generatedAt: new Date(),
            specId
        };
    }

    // Get spec content
    const { data: spec } = await supabase
        .from('specs')
        .select('title, content, user_stories')
        .eq('id', specId)
        .single();

    if (!spec) {
        return {
            success: false,
            error: 'Spec not found',
            generatedAt: new Date(),
            specId
        };
    }

    return generatePrototype({
        projectId,
        specId,
        title: spec.title,
        prompt: spec.content || '',
        userStories: spec.user_stories || []
    });
}
