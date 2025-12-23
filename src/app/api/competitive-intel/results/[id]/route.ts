import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy getter for Supabase client to avoid build-time initialization
function getSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(supabaseUrl, supabaseKey);
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // Params is a promise in Next 15
) {
    try {
        const { id } = await params;
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('competitive_intel_sessions')
            .select('status, results, created_at, completed_at')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching results:', error);
        return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
    }
}
