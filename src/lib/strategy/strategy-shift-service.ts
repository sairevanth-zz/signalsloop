/**
 * Strategy Shift Service
 * 
 * Core service for the Live Strategy Co-Pilot feature.
 * Aggregates signals from multiple sources and generates strategic recommendations.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import type {
    StrategyShift,
    StrategyShiftCreate,
    SignalEvidence,
    ShiftType,
    GenerateShiftsResponse,
} from '@/types/strategy-shifts';

// Lazy initialization
let _supabase: SupabaseClient | null = null;
let _openai: OpenAI | null = null;

function getSupabase(): SupabaseClient {
    if (!_supabase) {
        _supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    }
    return _supabase;
}

function getOpenAI(): OpenAI {
    if (!_openai) {
        _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return _openai;
}

/**
 * Aggregate signals from all sources for a project
 */
export async function aggregateSignals(projectId: string): Promise<SignalEvidence[]> {
    const supabase = getSupabase();
    const signals: SignalEvidence[] = [];

    // 1. Get churn signals from customer_health table
    try {
        const { data: churnData } = await supabase
            .from('customer_health')
            .select('id, health_score, health_grade, risk_signals, health_summary')
            .eq('project_id', projectId)
            .in('health_grade', ['critical', 'at_risk'])
            .order('health_score', { ascending: true })
            .limit(5);

        if (churnData && churnData.length > 0) {
            const atRiskCount = churnData.length;
            const avgHealth = churnData.reduce((sum, c) => sum + (c.health_score || 0), 0) / atRiskCount;

            signals.push({
                source: 'churn',
                signal: `${atRiskCount} customers at risk with avg health score ${avgHealth.toFixed(0)}`,
                severity: atRiskCount > 3 ? 'critical' : 'warning',
                dataPoints: {
                    atRiskCount,
                    avgHealthScore: avgHealth,
                    topRisks: churnData.slice(0, 3).map(c => c.health_summary),
                },
            });
        }
    } catch (e) {
        console.error('Error fetching churn signals:', e);
    }

    // 2. Get anomaly signals from dashboard_metrics or predictions
    try {
        const { data: anomalyData } = await supabase
            .from('feature_predictions')
            .select('id, feature_name, predicted_adoption_rate, confidence_score')
            .eq('project_id', projectId)
            .lt('confidence_score', 0.4)
            .order('created_at', { ascending: false })
            .limit(5);

        if (anomalyData && anomalyData.length > 0) {
            signals.push({
                source: 'anomaly',
                signal: `${anomalyData.length} features with low confidence predictions`,
                severity: 'warning',
                dataPoints: {
                    lowConfidenceFeatures: anomalyData.map(f => ({
                        name: f.feature_name,
                        confidence: f.confidence_score,
                    })),
                },
            });
        }
    } catch (e) {
        console.error('Error fetching anomaly signals:', e);
    }

    // 3. Get competitor signals
    try {
        const { data: competitorData } = await supabase
            .from('competitor_updates')
            .select('id, competitor_id, update_type, title, severity, created_at')
            .eq('project_id', projectId)
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false })
            .limit(5);

        if (competitorData && competitorData.length > 0) {
            const highSeverity = competitorData.filter(c => c.severity === 'high' || c.severity === 'critical');
            if (highSeverity.length > 0) {
                signals.push({
                    source: 'competitor',
                    signal: `${highSeverity.length} high-priority competitor moves detected`,
                    severity: 'warning',
                    dataPoints: {
                        updates: highSeverity.map(c => ({
                            type: c.update_type,
                            title: c.title,
                        })),
                    },
                });
            }
        }
    } catch (e) {
        console.error('Error fetching competitor signals:', e);
    }

    // 4. Get sentiment signals from themes
    try {
        const { data: themeData } = await supabase
            .from('feedback_themes')
            .select('id, name, sentiment_score, feedback_count')
            .eq('project_id', projectId)
            .lt('sentiment_score', -0.3)
            .order('feedback_count', { ascending: false })
            .limit(5);

        if (themeData && themeData.length > 0) {
            signals.push({
                source: 'sentiment',
                signal: `${themeData.length} themes with negative sentiment`,
                severity: themeData.some(t => (t.sentiment_score || 0) < -0.6) ? 'critical' : 'warning',
                dataPoints: {
                    negativeThemes: themeData.map(t => ({
                        name: t.name,
                        sentiment: t.sentiment_score,
                        mentions: t.feedback_count,
                    })),
                },
            });
        }
    } catch (e) {
        console.error('Error fetching sentiment signals:', e);
    }

    // 5. Get high-volume feedback themes (opportunity signals)
    try {
        const { data: volumeData } = await supabase
            .from('feedback_themes')
            .select('id, name, feedback_count, sentiment_score')
            .eq('project_id', projectId)
            .gte('feedback_count', 10)
            .gt('sentiment_score', 0.2)
            .order('feedback_count', { ascending: false })
            .limit(5);

        if (volumeData && volumeData.length > 0) {
            signals.push({
                source: 'feedback',
                signal: `${volumeData.length} high-demand themes with positive sentiment`,
                severity: 'info',
                dataPoints: {
                    opportunities: volumeData.map(t => ({
                        name: t.name,
                        mentions: t.feedback_count,
                        sentiment: t.sentiment_score,
                    })),
                },
            });
        }
    } catch (e) {
        console.error('Error fetching feedback signals:', e);
    }

    return signals;
}

/**
 * Generate strategy shifts using AI based on aggregated signals
 */
export async function generateShifts(
    projectId: string,
    signals: SignalEvidence[]
): Promise<StrategyShiftCreate[]> {
    if (signals.length === 0) {
        return [];
    }

    const openai = getOpenAI();

    const systemPrompt = `You are a strategic product advisor. Based on the signals provided, generate actionable strategy shifts.

Each shift should be one of these types:
- pause: Stop or delay work on something
- accelerate: Speed up work on something
- pivot: Change direction on something
- deprioritize: Lower priority of something
- experiment: Run an experiment to validate something

Return JSON array of shifts:
[{
  "type": "pause|accelerate|pivot|deprioritize|experiment",
  "targetFeature": "Feature or theme name",
  "action": "One-line action to take",
  "rationale": "2-3 sentence explanation with data references",
  "expectedImpact": "Expected outcome (e.g., '+5% retention', 'reduce churn by 2')",
  "confidence": 0.0-1.0
}]

Be specific, data-driven, and actionable. Generate 1-3 shifts maximum.`;

    const userPrompt = `Project signals:

${signals.map(s => `[${s.source.toUpperCase()}] ${s.signal}
Severity: ${s.severity}
Data: ${JSON.stringify(s.dataPoints)}`).join('\n\n')}

Generate strategic shifts based on these signals.`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) return [];

        const parsed = JSON.parse(content);
        const shiftsArray = parsed.shifts || parsed;

        if (!Array.isArray(shiftsArray)) return [];

        return shiftsArray.slice(0, 3).map((shift: any) => ({
            projectId,
            type: shift.type as ShiftType,
            targetFeature: shift.targetFeature || 'Unknown',
            action: shift.action || '',
            rationale: shift.rationale || '',
            signals,
            expectedImpact: shift.expectedImpact,
            confidence: Math.min(1, Math.max(0, shift.confidence || 0.5)),
        }));
    } catch (error) {
        console.error('Error generating shifts:', error);
        return [];
    }
}

/**
 * Save shifts to database
 */
export async function saveShifts(shifts: StrategyShiftCreate[]): Promise<StrategyShift[]> {
    if (shifts.length === 0) return [];

    const supabase = getSupabase();
    const savedShifts: StrategyShift[] = [];

    for (const shift of shifts) {
        const { data, error } = await supabase
            .from('strategy_shifts')
            .insert({
                project_id: shift.projectId,
                type: shift.type,
                target_feature: shift.targetFeature,
                action: shift.action,
                rationale: shift.rationale,
                signals: shift.signals,
                expected_impact: shift.expectedImpact,
                confidence: shift.confidence,
                status: 'proposed',
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving shift:', error);
            continue;
        }

        savedShifts.push(mapShiftFromDb(data));
    }

    return savedShifts;
}

/**
 * Get pending shifts for a project
 */
export async function getPendingShifts(projectId: string): Promise<StrategyShift[]> {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('strategy_shifts')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'proposed')
        .gt('expires_at', new Date().toISOString())
        .order('confidence', { ascending: false });

    if (error) {
        console.error('Error fetching pending shifts:', error);
        return [];
    }

    return (data || []).map(mapShiftFromDb);
}

/**
 * Get all shifts for a project (with optional status filter)
 */
export async function getShifts(
    projectId: string,
    status?: string,
    limit = 20
): Promise<StrategyShift[]> {
    const supabase = getSupabase();

    let query = supabase
        .from('strategy_shifts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (status) {
        query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching shifts:', error);
        return [];
    }

    return (data || []).map(mapShiftFromDb);
}

/**
 * Approve a shift
 */
export async function approveShift(
    shiftId: string,
    userId: string,
    notes?: string
): Promise<StrategyShift | null> {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('strategy_shifts')
        .update({
            status: 'approved',
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
            review_notes: notes,
        })
        .eq('id', shiftId)
        .select()
        .single();

    if (error) {
        console.error('Error approving shift:', error);
        return null;
    }

    return mapShiftFromDb(data);
}

/**
 * Reject a shift
 */
export async function rejectShift(
    shiftId: string,
    userId: string,
    notes?: string
): Promise<StrategyShift | null> {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('strategy_shifts')
        .update({
            status: 'rejected',
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
            review_notes: notes,
        })
        .eq('id', shiftId)
        .select()
        .single();

    if (error) {
        console.error('Error rejecting shift:', error);
        return null;
    }

    return mapShiftFromDb(data);
}

/**
 * Generate and save shifts for a project
 */
export async function generateAndSaveShifts(projectId: string): Promise<GenerateShiftsResponse> {
    try {
        // 1. Aggregate signals
        const signals = await aggregateSignals(projectId);

        if (signals.length === 0) {
            return {
                success: true,
                shiftsGenerated: 0,
                shifts: [],
            };
        }

        // 2. Generate shifts using AI
        const shiftRequests = await generateShifts(projectId, signals);

        if (shiftRequests.length === 0) {
            return {
                success: true,
                shiftsGenerated: 0,
                shifts: [],
            };
        }

        // 3. Save to database
        const savedShifts = await saveShifts(shiftRequests);

        return {
            success: true,
            shiftsGenerated: savedShifts.length,
            shifts: savedShifts,
        };
    } catch (error) {
        console.error('Error in generateAndSaveShifts:', error);
        return {
            success: false,
            shiftsGenerated: 0,
            shifts: [],
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Map database row to StrategyShift type
 */
function mapShiftFromDb(row: any): StrategyShift {
    return {
        id: row.id,
        projectId: row.project_id,
        type: row.type,
        targetFeature: row.target_feature,
        action: row.action,
        rationale: row.rationale,
        signals: row.signals || [],
        expectedImpact: row.expected_impact,
        confidence: parseFloat(row.confidence) || 0,
        status: row.status,
        experimentId: row.experiment_id,
        reviewedBy: row.reviewed_by,
        reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
        reviewNotes: row.review_notes,
        expiresAt: new Date(row.expires_at),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}
