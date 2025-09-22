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
    const host = request.headers.get('host');
    
    if (!host) {
      return NextResponse.json({ error: 'Host header missing' }, { status: 400 });
    }

    // Skip if it's the default domain or localhost
    if (host.includes('signalsloop.vercel.app') || host.includes('localhost')) {
      return NextResponse.json({ 
        isCustomDomain: false,
        host: host 
      });
    }

    const supabase = getSupabaseClient();

    // Find project by custom domain
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        id,
        slug,
        name,
        custom_domain,
        domain_verified,
        domain_status,
        user_id
      `)
      .eq('custom_domain', host)
      .eq('domain_verified', true)
      .eq('domain_status', 'verified')
      .single();

    if (error || !project) {
      console.error('Project not found for domain:', host, error);
      return NextResponse.json({ 
        isCustomDomain: false,
        host: host,
        error: 'Domain not found or not verified'
      });
    }

    return NextResponse.json({
      isCustomDomain: true,
      host: host,
      project: {
        id: project.id,
        slug: project.slug,
        name: project.name,
        custom_domain: project.custom_domain
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
