/**
 * Strategy Shifts API
 * GET - List shifts for a project
 * POST - Approve/reject a shift
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
    getShifts,
    getPendingShifts,
    approveShift,
    rejectShift,
} from '@/lib/strategy/strategy-shift-service';

// Lazy initialization to avoid build-time errors
const getSupabase = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error('Supabase credentials not configured');
    }
    return createClient(url, key);
};


export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const status = searchParams.get('status');
        const pendingOnly = searchParams.get('pending') === 'true';

        if (!projectId) {
            return NextResponse.json(
                { success: false, error: 'projectId is required' },
                { status: 400 }
            );
        }

        const shifts = pendingOnly
            ? await getPendingShifts(projectId)
            : await getShifts(projectId, status || undefined);

        return NextResponse.json({
            success: true,
            shifts,
            total: shifts.length,
        });
    } catch (error) {
        console.error('Error in GET /api/strategy/shifts:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch shifts' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, shiftId, notes, userId } = body;

        if (!shiftId) {
            return NextResponse.json(
                { success: false, error: 'shiftId is required' },
                { status: 400 }
            );
        }

        if (!action || !['approve', 'reject'].includes(action)) {
            return NextResponse.json(
                { success: false, error: 'action must be "approve" or "reject"' },
                { status: 400 }
            );
        }

        // Get user ID from auth if not provided
        const reviewerId = userId || 'system';

        let result;
        if (action === 'approve') {
            result = await approveShift(shiftId, reviewerId, notes);
        } else {
            result = await rejectShift(shiftId, reviewerId, notes);
        }

        if (!result) {
            return NextResponse.json(
                { success: false, error: 'Failed to update shift' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            shift: result,
        });
    } catch (error) {
        console.error('Error in POST /api/strategy/shifts:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update shift' },
            { status: 500 }
        );
    }
}
