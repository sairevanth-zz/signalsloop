import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side operations
function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return null;
    }

    return createClient(supabaseUrl, supabaseKey);
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ shareToken: string }> }
) {
    try {
        const { shareToken } = await params;

        if (!shareToken) {
            return NextResponse.json(
                { error: 'Share token is required' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseClient();
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        const { data, error } = await supabase
            .from('health_scores')
            .select('*')
            .eq('share_token', shareToken)
            .single();

        if (error || !data) {
            return NextResponse.json(
                { error: 'Health score not found' },
                { status: 404 }
            );
        }

        // Format response
        return NextResponse.json({
            score: data.score,
            grade: {
                label: data.grade,
                // Derive color and emoji from grade label
                color: data.grade === 'Excellent' ? 'green'
                    : data.grade === 'Good' ? 'blue'
                        : data.grade === 'Needs Attention' ? 'yellow' : 'red',
                emoji: data.grade === 'Excellent' ? '🟢'
                    : data.grade === 'Good' ? '🔵'
                        : data.grade === 'Needs Attention' ? '🟡' : '🔴',
            },
            components: data.components,
            actions: data.actions,
            interpretation: data.interpretation,
            productName: data.product_name,
            createdAt: data.created_at,
        });
    } catch (error: unknown) {
        console.error('Failed to fetch health score:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch health score' },
            { status: 500 }
        );
    }
}
