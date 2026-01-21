/**
 * SDK Config Endpoint
 * 
 * Returns active experiments and their configurations for the SDK.
 * This endpoint is called by the SignalsLoop JavaScript SDK on page load.
 * 
 * GET /api/sdk/config?projectId=xxx&visitorId=yyy
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

// MurmurHash3 for consistent hashing
function murmurhash3(key: string, seed: number = 0): number {
    let h1 = seed;
    const c1 = 0xcc9e2d51;
    const c2 = 0x1b873593;

    for (let i = 0; i < key.length; i++) {
        let k1 = key.charCodeAt(i);
        k1 = Math.imul(k1, c1);
        k1 = (k1 << 15) | (k1 >>> 17);
        k1 = Math.imul(k1, c2);
        h1 ^= k1;
        h1 = (h1 << 13) | (h1 >>> 19);
        h1 = Math.imul(h1, 5) + 0xe6546b64;
    }

    h1 ^= key.length;
    h1 ^= h1 >>> 16;
    h1 = Math.imul(h1, 0x85ebca6b);
    h1 ^= h1 >>> 13;
    h1 = Math.imul(h1, 0xc2b2ae35);
    h1 ^= h1 >>> 16;

    return h1 >>> 0;
}

// Consistent bucketing for variant assignment
function assignVariant(
    visitorId: string,
    experimentId: string,
    variants: Array<{ variant_key: string; traffic_percentage: number }>
): string {
    const hash = murmurhash3(`${experimentId}:${visitorId}`);
    const bucket = (hash % 100) + 1; // 1-100

    let cumulative = 0;
    for (const variant of variants) {
        cumulative += variant.traffic_percentage;
        if (bucket <= cumulative) {
            return variant.variant_key;
        }
    }

    return variants[0]?.variant_key || 'control';
}

interface VisualChange {
    id: string;
    selector: string;
    action: 'text' | 'style' | 'visibility' | 'attribute' | 'class';
    property?: string;
    value: string;
    originalValue?: string;
}

interface ExperimentConfig {
    id: string;
    key: string;
    name: string;
    status: string;
    trafficAllocation: number;
    assignedVariant: string;
    variants: Array<{
        key: string;
        weight: number;
        isControl: boolean;
        changes: VisualChange[];
        pageUrl?: string;
    }>;
    goals: Array<{
        id: string;
        name: string;
        type: string;
        selector?: string;
        url?: string;
    }>;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const visitorId = searchParams.get('visitorId');
    const pageUrl = searchParams.get('pageUrl');

    // CORS headers for SDK calls
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
    };

    if (!projectId) {
        return NextResponse.json(
            { error: 'projectId is required' },
            { status: 400, headers: corsHeaders }
        );
    }

    if (!visitorId) {
        return NextResponse.json(
            { error: 'visitorId is required' },
            { status: 400, headers: corsHeaders }
        );
    }

    try {
        const supabase = getSupabaseServiceRoleClient();
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database unavailable' },
                { status: 500, headers: corsHeaders }
            );
        }

        // Get active experiments for the project
        const { data: experiments, error: expError } = await supabase
            .from('experiments')
            .select(`
        id,
        name,
        status,
        traffic_allocation,
        sdk_key,
        feature_flag_key,
        experiment_variants (
          id,
          variant_key,
          name,
          traffic_percentage,
          is_control,
          visual_changes,
          page_url,
          config
        ),
        experiment_goals (
          id,
          name,
          goal_type,
          target_selector,
          target_url,
          is_primary
        )
      `)
            .eq('project_id', projectId)
            .eq('status', 'running');

        if (expError) {
            console.error('[SDK/Config] Error fetching experiments:', expError);
            return NextResponse.json(
                { error: 'Failed to fetch experiments' },
                { status: 500, headers: corsHeaders }
            );
        }

        // Check for existing assignments
        const experimentIds = experiments?.map(e => e.id) || [];
        const { data: existingAssignments } = await supabase
            .from('experiment_assignments')
            .select('experiment_id, variant_id')
            .eq('visitor_id', visitorId)
            .in('experiment_id', experimentIds);

        const assignmentMap = new Map(
            existingAssignments?.map(a => [a.experiment_id, a.variant_id]) || []
        );

        // Build experiment configs with variant assignments
        const configs: ExperimentConfig[] = [];
        const newAssignments: Array<{ experiment_id: string; variant_id: string; visitor_id: string }> = [];

        for (const exp of experiments || []) {
            const variants = exp.experiment_variants || [];

            // Check traffic allocation
            const trafficHash = murmurhash3(`traffic:${exp.id}:${visitorId}`);
            const trafficBucket = (trafficHash % 100) + 1;
            if (trafficBucket > (exp.traffic_allocation || 100)) {
                continue; // Visitor not in experiment traffic
            }

            // Get or assign variant
            let assignedVariantKey: string;
            let assignedVariantId: string | undefined;

            const existingVariantId = assignmentMap.get(exp.id);
            if (existingVariantId) {
                const existingVariant = variants.find(v => v.id === existingVariantId);
                assignedVariantKey = existingVariant?.variant_key || 'control';
                assignedVariantId = existingVariantId;
            } else {
                assignedVariantKey = assignVariant(visitorId, exp.id, variants);
                const assignedVariant = variants.find(v => v.variant_key === assignedVariantKey);
                assignedVariantId = assignedVariant?.id;

                // Queue new assignment
                if (assignedVariantId) {
                    newAssignments.push({
                        experiment_id: exp.id,
                        variant_id: assignedVariantId,
                        visitor_id: visitorId,
                    });
                }
            }

            configs.push({
                id: exp.id,
                key: exp.sdk_key || exp.feature_flag_key || exp.id,
                name: exp.name,
                status: exp.status,
                trafficAllocation: exp.traffic_allocation || 100,
                assignedVariant: assignedVariantKey,
                variants: variants.map(v => ({
                    key: v.variant_key,
                    weight: v.traffic_percentage,
                    isControl: v.is_control || false,
                    changes: (v.visual_changes || []) as VisualChange[],
                    pageUrl: v.page_url,
                })),
                goals: (exp.experiment_goals || []).map(g => ({
                    id: g.id,
                    name: g.name,
                    type: g.goal_type,
                    selector: g.target_selector,
                    url: g.target_url,
                })),
            });
        }

        // Batch insert new assignments
        if (newAssignments.length > 0) {
            await supabase
                .from('experiment_assignments')
                .upsert(newAssignments, { onConflict: 'experiment_id,visitor_id' });
        }

        return NextResponse.json({
            experiments: configs,
            visitorId,
            timestamp: Date.now(),
        }, { headers: corsHeaders });

    } catch (error) {
        console.error('[SDK/Config] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
