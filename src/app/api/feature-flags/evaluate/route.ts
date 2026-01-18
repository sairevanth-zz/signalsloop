/**
 * Feature Flag Evaluation API
 *
 * POST /api/feature-flags/evaluate - Evaluate a feature flag for a user
 * Used by the SDK to determine if a feature is enabled
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'edge'; // Use edge for low latency

interface TargetingRule {
    attribute: string;
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'in';
    value: string | number | string[];
}

interface EvaluateRequest {
    projectId?: string;
    flagKey: string;
    visitorId: string;
    userId?: string;
    attributes?: Record<string, string | number | boolean>;
}

function hashVisitorId(visitorId: string, flagKey: string): number {
    // Simple deterministic hash for consistent rollout
    const str = `${visitorId}-${flagKey}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash % 100);
}

function evaluateTargetingRules(
    rules: TargetingRule[],
    attributes: Record<string, string | number | boolean>
): boolean {
    if (!rules || rules.length === 0) return true;

    for (const rule of rules) {
        const attrValue = attributes[rule.attribute];
        if (attrValue === undefined) continue;

        let matches = false;
        switch (rule.operator) {
            case 'equals':
                matches = attrValue === rule.value;
                break;
            case 'contains':
                matches = String(attrValue).includes(String(rule.value));
                break;
            case 'startsWith':
                matches = String(attrValue).startsWith(String(rule.value));
                break;
            case 'endsWith':
                matches = String(attrValue).endsWith(String(rule.value));
                break;
            case 'gt':
                matches = Number(attrValue) > Number(rule.value);
                break;
            case 'lt':
                matches = Number(attrValue) < Number(rule.value);
                break;
            case 'in':
                matches = Array.isArray(rule.value) && rule.value.includes(String(attrValue));
                break;
        }

        if (!matches) return false;
    }

    return true;
}

export async function POST(request: NextRequest) {
    try {
        const body: EvaluateRequest = await request.json();
        const { projectId, flagKey, visitorId, userId, attributes = {} } = body;

        if (!flagKey || !visitorId) {
            return NextResponse.json(
                { error: 'flagKey and visitorId are required' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseServiceRoleClient();
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database client not available' },
                { status: 500 }
            );
        }

        // Get the flag
        let query = supabase.from('feature_flags').select('*').eq('key', flagKey);
        if (projectId) {
            query = query.eq('project_id', projectId);
        }

        const { data: flag, error } = await query.single();

        if (error || !flag) {
            return NextResponse.json({
                enabled: false,
                value: null,
                reason: 'flag_not_found',
            });
        }

        // Check if flag is enabled
        if (!flag.is_enabled) {
            return NextResponse.json({
                enabled: false,
                value: JSON.parse(flag.default_value),
                reason: 'flag_disabled',
            });
        }

        // Check scheduling
        const now = new Date();
        if (flag.scheduled_start && new Date(flag.scheduled_start) > now) {
            return NextResponse.json({
                enabled: false,
                value: JSON.parse(flag.default_value),
                reason: 'not_started',
            });
        }
        if (flag.scheduled_end && new Date(flag.scheduled_end) < now) {
            return NextResponse.json({
                enabled: false,
                value: JSON.parse(flag.default_value),
                reason: 'ended',
            });
        }

        // Check targeting rules
        const targetingMatched = evaluateTargetingRules(
            flag.targeting_rules as TargetingRule[],
            attributes
        );

        if (!targetingMatched) {
            return NextResponse.json({
                enabled: false,
                value: JSON.parse(flag.default_value),
                reason: 'targeting_mismatch',
            });
        }

        // Check rollout percentage
        const visitorHash = hashVisitorId(visitorId, flagKey);
        const inRollout = visitorHash < flag.rollout_percentage;

        if (!inRollout) {
            return NextResponse.json({
                enabled: false,
                value: JSON.parse(flag.default_value),
                reason: 'not_in_rollout',
            });
        }

        // Flag is enabled for this user
        const flagValue = JSON.parse(flag.default_value);

        // Log evaluation (fire and forget)
        supabase.from('feature_flag_evaluations').insert({
            flag_id: flag.id,
            visitor_id: visitorId,
            user_id: userId || null,
            evaluated_value: flagValue,
            targeting_matched: targetingMatched,
            evaluation_reason: 'enabled',
            context: attributes,
        }).then(() => { });

        return NextResponse.json({
            enabled: true,
            value: flagValue,
            reason: 'enabled',
            flagType: flag.flag_type,
        });

    } catch (error) {
        console.error('[Feature Flags Evaluate] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// Batch evaluation for multiple flags
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { projectId, flagKeys, visitorId, userId, attributes = {} } = body;

        if (!flagKeys || !Array.isArray(flagKeys) || !visitorId) {
            return NextResponse.json(
                { error: 'flagKeys array and visitorId are required' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseServiceRoleClient();
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database client not available' },
                { status: 500 }
            );
        }

        // Get all flags
        let query = supabase.from('feature_flags').select('*').in('key', flagKeys);
        if (projectId) {
            query = query.eq('project_id', projectId);
        }

        const { data: flags, error } = await query;

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        // Evaluate each flag
        const results: Record<string, { enabled: boolean; value: unknown }> = {};

        for (const flagKey of flagKeys) {
            const flag = flags?.find(f => f.key === flagKey);

            if (!flag) {
                results[flagKey] = { enabled: false, value: null };
                continue;
            }

            if (!flag.is_enabled) {
                results[flagKey] = { enabled: false, value: JSON.parse(flag.default_value) };
                continue;
            }

            const targetingMatched = evaluateTargetingRules(
                flag.targeting_rules as TargetingRule[],
                attributes
            );

            if (!targetingMatched) {
                results[flagKey] = { enabled: false, value: JSON.parse(flag.default_value) };
                continue;
            }

            const visitorHash = hashVisitorId(visitorId, flagKey);
            const inRollout = visitorHash < flag.rollout_percentage;

            if (!inRollout) {
                results[flagKey] = { enabled: false, value: JSON.parse(flag.default_value) };
                continue;
            }

            results[flagKey] = { enabled: true, value: JSON.parse(flag.default_value) };
        }

        return NextResponse.json({ flags: results });

    } catch (error) {
        console.error('[Feature Flags Batch Evaluate] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
