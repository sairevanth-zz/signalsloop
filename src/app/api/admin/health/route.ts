import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const checks = {
      supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabase_service_role: !!process.env.SUPABASE_SERVICE_ROLE,
      client_initialized: false,
      can_list_users: false,
      can_query_projects: false,
    };

    const supabase = getSupabaseServiceRoleClient();
    
    if (supabase) {
      checks.client_initialized = true;

      // Test auth admin access
      try {
        const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1
        });
        
        if (!usersError && usersData) {
          checks.can_list_users = true;
        }
      } catch (e) {
        console.error('User list error:', e);
      }

      // Test projects table access
      try {
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('id')
          .limit(1);
        
        if (!projectsError && projectsData) {
          checks.can_query_projects = true;
        }
      } catch (e) {
        console.error('Projects query error:', e);
      }
    }

    const allHealthy = Object.values(checks).every(v => v === true);

    return NextResponse.json({
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString()
    }, {
      status: allHealthy ? 200 : 503
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500
    });
  }
}

