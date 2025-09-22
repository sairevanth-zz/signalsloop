import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    throw new Error('Missing Supabase configuration');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
  );
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Get project domain status
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        id,
        custom_domain,
        domain_verified,
        domain_verification_token,
        domain_verification_method,
        domain_verified_at,
        domain_status,
        user_id
      `)
      .eq('id', projectId)
      .single();

    if (error) {
      console.error('Error fetching project:', error);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      custom_domain: project.custom_domain,
      domain_verified: project.domain_verified,
      domain_verification_token: project.domain_verification_token,
      domain_verification_method: project.domain_verification_method,
      domain_verified_at: project.domain_verified_at,
      domain_status: project.domain_status
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
