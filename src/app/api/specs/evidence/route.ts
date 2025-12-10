/**
 * Evidence API
 * POST - Gather evidence for an intent
 */

import { NextRequest, NextResponse } from 'next/server';
import { gatherEvidence, refreshEvidenceForSpec } from '@/lib/specs/evidence-thread-service';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { projectId, intent, specId } = body;

        if (!projectId) {
            return NextResponse.json(
                { success: false, error: 'projectId is required' },
                { status: 400 }
            );
        }

        // If specId is provided, refresh evidence for that spec
        if (specId) {
            const result = await refreshEvidenceForSpec(specId, projectId);
            return NextResponse.json(result);
        }

        // Otherwise, gather evidence for the intent
        if (!intent) {
            return NextResponse.json(
                { success: false, error: 'intent or specId is required' },
                { status: 400 }
            );
        }

        const result = await gatherEvidence({ projectId, intent });
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error in POST /api/specs/evidence:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to gather evidence' },
            { status: 500 }
        );
    }
}
