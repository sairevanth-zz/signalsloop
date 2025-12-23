import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy getter for Supabase client to avoid build-time initialization
function getSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(supabaseUrl, supabaseKey);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userProduct, competitors } = body;

        if (!userProduct && (!competitors || competitors.length === 0)) {
            return NextResponse.json({ error: 'At least one product is required' }, { status: 400 });
        }

        const sessionToken = crypto.randomUUID();
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('competitive_intel_sessions')
            .insert({
                session_token: sessionToken,
                user_product_name: userProduct,
                competitor_names: competitors || [],
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            sessionId: data.id,
            sessionToken: data.session_token
        });
    } catch (error) {
        console.error('Error creating session:', error);
        return NextResponse.json({ error: 'Failed to start session' }, { status: 500 });
    }
}
