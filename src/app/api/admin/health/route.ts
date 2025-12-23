import { NextResponse } from 'next/server';
import { secureAPI, validateAdminAuth } from '@/lib/api-security';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { getSecurityHealthStatus } from '@/lib/security-validation';

export const runtime = 'nodejs';
export const maxDuration = 30;

export const GET = secureAPI(
  async () => {
    try {
      // Infrastructure checks
      const infrastructureChecks = {
        supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabase_service_role: !!process.env.SUPABASE_SERVICE_ROLE,
        client_initialized: false,
        can_list_users: false,
        can_query_projects: false,
      };

      const supabase = getSupabaseServiceRoleClient();
      
      if (supabase) {
        infrastructureChecks.client_initialized = true;

        // Test auth admin access
        try {
          const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1
          });
          
          if (!usersError && usersData) {
            infrastructureChecks.can_list_users = true;
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
            infrastructureChecks.can_query_projects = true;
          }
        } catch (e) {
          console.error('Projects query error:', e);
        }
      }

      // Security configuration checks
      const securityHealth = getSecurityHealthStatus();
      
      // Overall health status
      const infraHealthy = Object.values(infrastructureChecks).every(v => v === true);
      const overallHealthy = infraHealthy && securityHealth.status !== 'unhealthy';
      const status = !overallHealthy ? 'unhealthy' 
        : securityHealth.status === 'degraded' ? 'degraded'
        : 'healthy';

      return NextResponse.json({
        status,
        timestamp: new Date().toISOString(),
        infrastructure: {
          status: infraHealthy ? 'healthy' : 'unhealthy',
          checks: infrastructureChecks,
        },
        security: securityHealth,
        environment: process.env.NODE_ENV,
      }, {
        status: status === 'unhealthy' ? 503 : 200
      });
    } catch (error) {
      console.error('Admin health check error:', error);
      return NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  },
  {
    enableRateLimit: true,
    requireAuth: true,
    authValidator: validateAdminAuth,
  }
);
