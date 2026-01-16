import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkDemoRateLimit, incrementDemoUsage, getTimeUntilReset } from '@/lib/demo-rate-limit';

// Lazy getter for Supabase client to avoid build-time initialization
function getSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(supabaseUrl, supabaseKey);
}

// Get client IP from request headers
function getClientIP(req: Request): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    if (forwarded) return forwarded.split(',')[0].trim();
    if (realIP) return realIP;
    return 'unknown';
}

export async function POST(req: Request) {
    try {
        // Rate limiting for demo users
        const clientIP = getClientIP(req);
        const rateCheck = checkDemoRateLimit(clientIP, 'competitive_intel');

        if (!rateCheck.allowed) {
            return NextResponse.json({
                error: `Rate limit exceeded. You can run ${rateCheck.limit} competitive analyses per hour. Try again in ${getTimeUntilReset(rateCheck.resetAt)}.`,
                remaining: 0,
                limit: rateCheck.limit,
                resetAt: rateCheck.resetAt
            }, { status: 429 });
        }

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

        // Increment usage after successful session creation
        incrementDemoUsage(clientIP, 'competitive_intel');

        return NextResponse.json({
            sessionId: data.id,
            sessionToken: data.session_token,
            _rateLimit: {
                remaining: rateCheck.remaining,
                limit: rateCheck.limit,
                resetAt: rateCheck.resetAt
            }
        });
    } catch (error) {
        console.error('Error creating session:', error);
        return NextResponse.json({ error: 'Failed to start session' }, { status: 500 });
    }
}
