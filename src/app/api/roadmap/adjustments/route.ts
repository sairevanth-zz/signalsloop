/**
 * GET /api/roadmap/adjustments
 * 
 * List adjustment proposals for a project.
 * Query params:
 * - projectId: UUID (required)
 * - status: pending | approved | rejected | expired (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-singleton';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const status = searchParams.get('status');

        if (!projectId) {
            return NextResponse.json(
                { error: 'projectId is required' },
                { status: 400 }
            );
        }

        const supabase = getServiceRoleClient();

        let query = supabase
            .from('roadmap_adjustment_proposals')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        // Filter by status if provided
        if (status) {
            query = query.eq('status', status);
        }

        // For pending, only show non-expired
        if (status === 'pending') {
            query = query.gt('expires_at', new Date().toISOString());
        }

        const { data, error } = await query;

        if (error) {
            console.error('[API] Error fetching proposals:', error);
            return NextResponse.json(
                { error: 'Failed to fetch proposals' },
                { status: 500 }
            );
        }

        // Map to camelCase for frontend
        const proposals = (data || []).map(row => ({
            id: row.id,
            projectId: row.project_id,
            triggerType: row.trigger_type,
            triggerSeverity: row.trigger_severity,
            triggerDescription: row.trigger_description,
            triggerData: row.trigger_data,
            status: row.status,
            proposedChanges: row.proposed_changes,
            aiReasoning: row.ai_reasoning,
            confidenceScore: row.confidence_score,
            reviewedBy: row.reviewed_by,
            reviewedAt: row.reviewed_at,
            reviewNotes: row.review_notes,
            expiresAt: row.expires_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));

        return NextResponse.json({ proposals });
    } catch (error) {
        console.error('[API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
