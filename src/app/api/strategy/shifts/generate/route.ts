/**
 * Generate Strategy Shifts API
 * POST - Generate new strategy shifts for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAndSaveShifts } from '@/lib/strategy/strategy-shift-service';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { projectId } = body;

        if (!projectId) {
            return NextResponse.json(
                { success: false, error: 'projectId is required' },
                { status: 400 }
            );
        }

        const result = await generateAndSaveShifts(projectId);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error in POST /api/strategy/shifts/generate:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to generate shifts' },
            { status: 500 }
        );
    }
}
