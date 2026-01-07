import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client
function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE!
    );
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        if (!slug) {
            return NextResponse.json({ error: 'Project slug is required' }, { status: 400 });
        }

        const supabase = getSupabase();

        const { data: project, error } = await supabase
            .from('projects')
            .select('id, name, slug, plan')
            .eq('slug', slug)
            .single();

        if (error || !project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        return NextResponse.json({
            id: project.id,
            name: project.name,
            slug: project.slug,
            plan: project.plan
        });
    } catch (error) {
        console.error('Error fetching project info:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
