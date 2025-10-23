import { NextResponse } from 'next/server';
import { z } from 'zod';
import { secureAPI, validateAdminAuth } from '@/lib/api-security';
import { createClient } from '@supabase/supabase-js';

export const GET = secureAPI(
  async ({ query }) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    // Build query with optional filters
    let dbQuery = supabase
      .from('security_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (query?.severity) {
      dbQuery = dbQuery.eq('severity', query.severity);
    }

    if (query?.type) {
      dbQuery = dbQuery.eq('type', query.type);
    }

    if (query?.projectId) {
      dbQuery = dbQuery.eq('project_id', query.projectId);
    }

    if (query?.startDate) {
      dbQuery = dbQuery.gte('created_at', query.startDate);
    }

    if (query?.endDate) {
      dbQuery = dbQuery.lte('created_at', query.endDate);
    }

    if (query?.limit) {
      dbQuery = dbQuery.limit(parseInt(query.limit));
    } else {
      dbQuery = dbQuery.limit(100); // Default limit
    }

    const { data: events, error } = await dbQuery;

    if (error) {
      console.error('Error fetching security events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch security events', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      events: events || [],
      count: events?.length || 0,
    });
  },
  {
    enableRateLimit: true,
    requireAuth: true,
    authValidator: validateAdminAuth,
    querySchema: z.object({
      severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      type: z.string().optional(),
      projectId: z.string().uuid().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.string().optional(),
    }).optional(),
  }
);
