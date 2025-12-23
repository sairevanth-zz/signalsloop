/**
 * Execute Scheduled Reports API
 * Cron job endpoint to run scheduled reports
 * Call this endpoint from a cron service (e.g., Vercel Cron, GitHub Actions)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
// Vercel Pro tier: 60s max for standard functions, 300s for cron jobs
export const maxDuration = 60; // Vercel Pro tier - 60s for report execution

/**
 * POST - Execute all due scheduled reports
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized execution
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key-here';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all active reports that are due to run
    const { data: dueReports, error: fetchError } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('is_active', true)
      .lte('next_run_at', new Date().toISOString());

    if (fetchError) throw fetchError;

    if (!dueReports || dueReports.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No scheduled reports due',
        executed: 0
      });
    }

    console.log(`[Execute Scheduled Reports] Found ${dueReports.length} reports to execute`);

    const results = await Promise.allSettled(
      dueReports.map(report => executeReport(report, supabase))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      message: `Executed ${successful} reports successfully, ${failed} failed`,
      executed: successful,
      failed
    });
  } catch (error) {
    console.error('[Execute Scheduled Reports API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute scheduled reports',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Execute a single report
 */
async function executeReport(report: any, supabase: any): Promise<void> {
  const startTime = Date.now();

  try {
    // Create execution record
    const { data: execution, error: createError } = await supabase
      .from('report_executions')
      .insert({
        scheduled_report_id: report.id,
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) throw createError;

    console.log(`[Execute Report] Running report: ${report.report_name} (${report.id})`);

    // Generate the report by calling the stakeholder query API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/stakeholder/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: report.query_text,
        role: report.user_role,
        projectId: report.project_id
      })
    });

    if (!response.ok) {
      throw new Error(`Query API failed: ${response.statusText}`);
    }

    const result = await response.json();
    const generationTime = Date.now() - startTime;

    // Send the report via email or Slack
    let deliveryStatus = 'success';
    let errorMessage = null;

    if (report.delivery_method === 'email') {
      // Send email to all recipients
      for (const recipient of report.recipients) {
        try {
          const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/stakeholder/email-report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              queryText: report.query_text,
              userRole: report.user_role,
              components: result.components,
              projectId: report.project_id,
              recipientEmail: recipient,
              reportName: report.report_name
            })
          });

          if (!emailResponse.ok) {
            throw new Error(`Failed to send email to ${recipient}`);
          }
        } catch (emailError) {
          console.error(`[Execute Report] Email error for ${recipient}:`, emailError);
          deliveryStatus = 'partial';
          errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
        }
      }
    } else if (report.delivery_method === 'slack' && report.slack_webhook_url) {
      // Send to Slack
      try {
        await fetch(report.slack_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `📊 *${report.report_name}*\n\nQuery: ${report.query_text}\n\nRole: ${report.user_role}\n\nGenerated ${result.components.length} insights.`,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: `📊 ${report.report_name}`
                }
              },
              {
                type: 'section',
                fields: [
                  {
                    type: 'mrkdwn',
                    text: `*Query:*\n${report.query_text}`
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Role:*\n${report.user_role}`
                  }
                ]
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `Generated ${result.components.length} insights in ${generationTime}ms`
                }
              },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: {
                      type: 'plain_text',
                      text: 'View Dashboard'
                    },
                    url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/${report.project_id}/stakeholder`
                  }
                ]
              }
            ]
          })
        });
      } catch (slackError) {
        console.error('[Execute Report] Slack error:', slackError);
        deliveryStatus = 'failed';
        errorMessage = slackError instanceof Error ? slackError.message : 'Unknown error';
      }
    }

    // Update execution record
    await supabase
      .from('report_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        component_count: result.components.length,
        generation_time_ms: generationTime,
        delivery_status: deliveryStatus,
        error_message: errorMessage
      })
      .eq('id', execution.id);

    // Update scheduled report
    await supabase
      .from('scheduled_reports')
      .update({
        last_run_at: new Date().toISOString(),
        run_count: report.run_count + 1
      })
      .eq('id', report.id);

    console.log(`[Execute Report] Completed: ${report.report_name}`);
  } catch (error) {
    console.error(`[Execute Report] Error executing report ${report.id}:`, error);

    // Update execution record with error
    await supabase
      .from('report_executions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('scheduled_report_id', report.id)
      .eq('status', 'running');

    throw error;
  }
}

/**
 * GET - Health check endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Scheduled reports execution endpoint is running',
    timestamp: new Date().toISOString()
  });
}
