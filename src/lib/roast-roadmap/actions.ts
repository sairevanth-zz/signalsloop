'use server';

import { getSupabasePublicServerClient } from '@/lib/supabase-client';
import { parseRoadmapFromText, parseRoadmapFromImage, parseRoadmapFromFile } from './parse-roadmap';
import { generateRoast, RoastContext } from './roast-engine';
import { v4 as uuidv4 } from 'uuid';

export async function parseRoadmapAction(formData: FormData) {
    const supabase = getSupabasePublicServerClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const inputType = formData.get('inputType') as string;
    const rawText = formData.get('rawText') as string | null;
    const imageFile = formData.get('imageFile') as File | null;
    const documentFile = formData.get('documentFile') as File | null;

    let parsedFeatures;
    let rawInputForDb = '';
    let screenshotUrl = null;

    try {
        if (inputType === 'text' && rawText) {
            parsedFeatures = await parseRoadmapFromText(rawText);
            rawInputForDb = rawText;
        } else if (inputType === 'image' && imageFile) {
            // Handle image upload
            // 1. Convert to base64 for OpenAI
            const buffer = Buffer.from(await imageFile.arrayBuffer());
            const base64 = buffer.toString('base64');
            parsedFeatures = await parseRoadmapFromImage(base64);

            // 2. Upload to storage for persistence (optional, but good for history)
            // For now, let's skip storage upload to keep it simple, or store base64 if small? No, dangerous.
            // We'll leave screenshot_url null for now unless we implement storage upload.
        } else if (inputType === 'file' && documentFile) {
            const buffer = Buffer.from(await documentFile.arrayBuffer());
            const type = documentFile.type;
            parsedFeatures = await parseRoadmapFromFile(buffer, type);
            rawInputForDb = `File: ${documentFile.name}`;
        } else {
            throw new Error('Invalid input');
        }

        // Create session
        const sessionToken = uuidv4();
        const { data: session, error } = await supabase
            .from('roadmap_roast_sessions')
            .insert({
                session_token: sessionToken,
                input_type: inputType,
                raw_input: rawInputForDb.substring(0, 5000), // Truncate for DB
                parsed_features: parsedFeatures,
                status: 'parsed'
            })
            .select('id, session_token')
            .single();

        if (error) throw error;

        return { success: true, sessionToken, parsedFeatures };

    } catch (error) {
        console.error('Parse error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to parse roadmap' };
    }
}

export async function generateRoastAction(sessionToken: string, context: RoastContext) {
    const supabase = getSupabasePublicServerClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    try {
        // Fetch parsed features
        const { data: session } = await supabase
            .from('roadmap_roast_sessions')
            .select('parsed_features')
            .eq('session_token', sessionToken)
            .single();

        if (!session || !session.parsed_features) {
            throw new Error('Session not found or missing parsed data');
        }

        // Generate roast
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const roast = await generateRoast(session.parsed_features as any, context);

        // Generate unique share token
        const shareToken = uuidv4().substring(0, 8); // Short token

        // Update session
        const { error } = await supabase
            .from('roadmap_roast_sessions')
            .update({
                confidence_score: roast.confidence_score,
                verdict: roast.verdict,
                one_liner: roast.one_liner,
                score_breakdown: roast.score_breakdown,
                blind_spots: roast.blind_spots,
                demand_questions: roast.demand_questions,
                assumption_challenges: roast.assumption_challenges,
                prioritization_notes: roast.prioritization_notes,
                quick_wins: roast.quick_wins,
                whats_good: roast.whats_good,

                status: 'completed',
                share_token: shareToken,
                is_public: true, // Auto-public for now? Or wait for user to click share? Let's make it true for easy sharing.
                completed_at: new Date().toISOString(),

                // Context
                industry: context.industry,
                company_stage: context.companyStage,
                team_size: context.teamSize
            })
            .eq('session_token', sessionToken);

        if (error) throw error;

        return { success: true, roast, shareToken };

    } catch (error) {
        console.error('Roast error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to generate roast' };
    }
}
