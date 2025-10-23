import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { applySecurityHeaders } from '@/lib/security-headers';
import { withRateLimit } from '@/middleware/rate-limit';

// Admin user IDs - Update this list with your admin user IDs
const ADMIN_USER_IDS = [
  // Add your admin user IDs here
  // Example: '12345678-1234-1234-1234-123456789abc'
];

// Or use an environment variable
const getAdminUserIds = (): string[] => {
  if (process.env.ADMIN_USER_IDS) {
    return process.env.ADMIN_USER_IDS.split(',').map(id => id.trim());
  }
  return ADMIN_USER_IDS;
};

/**
 * Check if user is an admin
 */
async function isAdmin(userId: string): Promise<boolean> {
  const adminIds = getAdminUserIds();

  // Check if user ID is in admin list
  if (adminIds.includes(userId)) {
    return true;
  }

  // Alternative: Check admin table if you have one
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', userId)
      .single();

    return !!adminUser;
  } catch {
    // Admin table doesn't exist or error occurred
    return false;
  }
}

/**
 * GET /api/admin/security-events
 * Retrieve security events (admin only)
 */
export async function GET(request: NextRequest) {
  return withRateLimit(
    request,
    async () => {
      try {
        // Get user from session
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE!
        );

        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
          return applySecurityHeaders(
            NextResponse.json(
              { error: 'Unauthorized', message: 'Missing authentication' },
              { status: 401 }
            )
          );
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
          return applySecurityHeaders(
            NextResponse.json(
              { error: 'Unauthorized', message: 'Invalid authentication' },
              { status: 401 }
            )
          );
        }

        // Check if user is admin
        const userIsAdmin = await isAdmin(user.id);
        if (!userIsAdmin) {
          return applySecurityHeaders(
            NextResponse.json(
              { error: 'Forbidden', message: 'Admin access required' },
              { status: 403 }
            )
          );
        }

        // Parse query parameters
        const url = new URL(request.url);
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 1000);
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const severity = url.searchParams.get('severity');
        const type = url.searchParams.get('type');
        const projectId = url.searchParams.get('project_id');
        const userId = url.searchParams.get('user_id');
        const startDate = url.searchParams.get('start_date');
        const endDate = url.searchParams.get('end_date');

        // Build query
        let query = supabase
          .from('security_events')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        // Apply filters
        if (severity) {
          query = query.eq('severity', severity);
        }
        if (type) {
          query = query.eq('type', type);
        }
        if (projectId) {
          query = query.eq('project_id', projectId);
        }
        if (userId) {
          query = query.eq('user_id', userId);
        }
        if (startDate) {
          query = query.gte('created_at', startDate);
        }
        if (endDate) {
          query = query.lte('created_at', endDate);
        }

        const { data: events, error, count } = await query;

        if (error) {
          throw error;
        }

        return applySecurityHeaders(
          NextResponse.json({
            success: true,
            data: events || [],
            pagination: {
              limit,
              offset,
              total: count || 0,
            },
          })
        );
      } catch (error) {
        console.error('Error fetching security events:', error);

        return applySecurityHeaders(
          NextResponse.json(
            {
              error: 'Internal Server Error',
              message:
                process.env.NODE_ENV === 'development'
                  ? error instanceof Error
                    ? error.message
                    : 'Unknown error'
                  : 'Failed to fetch security events',
            },
            { status: 500 }
          )
        );
      }
    },
    'api'
  );
}

/**
 * GET /api/admin/security-events/stats
 * Get security event statistics (admin only)
 */
export async function POST(request: NextRequest) {
  return withRateLimit(
    request,
    async () => {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE!
        );

        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
          return applySecurityHeaders(
            NextResponse.json(
              { error: 'Unauthorized', message: 'Missing authentication' },
              { status: 401 }
            )
          );
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
          return applySecurityHeaders(
            NextResponse.json(
              { error: 'Unauthorized', message: 'Invalid authentication' },
              { status: 401 }
            )
          );
        }

        // Check if user is admin
        const userIsAdmin = await isAdmin(user.id);
        if (!userIsAdmin) {
          return applySecurityHeaders(
            NextResponse.json(
              { error: 'Forbidden', message: 'Admin access required' },
              { status: 403 }
            )
          );
        }

        // Get statistics
        const { data: stats } = await supabase.rpc('get_security_event_stats');

        return applySecurityHeaders(
          NextResponse.json({
            success: true,
            data: stats || {},
          })
        );
      } catch (error) {
        console.error('Error fetching security event stats:', error);

        return applySecurityHeaders(
          NextResponse.json(
            {
              error: 'Internal Server Error',
              message: 'Failed to fetch statistics',
            },
            { status: 500 }
          )
        );
      }
    },
    'api'
  );
}
