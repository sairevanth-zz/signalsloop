/**
 * Scheduled Reports API
 * Manage scheduled stakeholder intelligence reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * GET - List all scheduled reports for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId parameter' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ reports: data || [] });
  } catch (error) {
    console.error('[Scheduled Reports API] GET Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch scheduled reports',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new scheduled report
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      userId,
      queryText,
      userRole,
      reportName,
      frequency,
      timeOfDay,
      dayOfWeek,
      dayOfMonth,
      timezone,
      recipients,
      deliveryMethod,
      slackWebhookUrl
    } = body;

    if (!projectId || !userId || !queryText || !userRole || !reportName || !frequency || !recipients) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('scheduled_reports')
      .insert({
        project_id: projectId,
        user_id: userId,
        query_text: queryText,
        user_role: userRole,
        report_name: reportName,
        frequency,
        time_of_day: timeOfDay || '09:00:00',
        day_of_week: dayOfWeek,
        day_of_month: dayOfMonth,
        timezone: timezone || 'UTC',
        recipients,
        delivery_method: deliveryMethod || 'email',
        slack_webhook_url: slackWebhookUrl,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      report: data
    });
  } catch (error) {
    console.error('[Scheduled Reports API] POST Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create scheduled report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update a scheduled report
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportId, ...updates } = body;

    if (!reportId) {
      return NextResponse.json(
        { error: 'Missing reportId' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('scheduled_reports')
      .update(updates)
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      report: data
    });
  } catch (error) {
    console.error('[Scheduled Reports API] PATCH Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update scheduled report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a scheduled report
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');

    if (!reportId) {
      return NextResponse.json(
        { error: 'Missing reportId parameter' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase
      .from('scheduled_reports')
      .delete()
      .eq('id', reportId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Scheduled report deleted successfully'
    });
  } catch (error) {
    console.error('[Scheduled Reports API] DELETE Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete scheduled report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
