/**
 * API Route: Scheduled Queries Cron Job
 * GET /api/cron/scheduled-queries
 *
 * Executes scheduled queries that are due
 * Should be called by Vercel Cron every 15 minutes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { classifyQuery } from '@/lib/ask/classifier';
import { retrieveContext } from '@/lib/ask/retrieval';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create Supabase client with service role for cron
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SYSTEM_PROMPT = `You are a professional AI assistant for SignalsLoop, a product feedback management platform.
Provide concise, actionable insights based on the data provided.
Format your response in markdown with clear sections.`;

// ============================================================================
// GET Handler - Execute scheduled queries
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('[Scheduled Queries Cron] Invalid authorization');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Scheduled Queries Cron] Starting execution');

    // Find scheduled queries that need to be run
    const { data: queriestoRun, error: fetchError } = await supabase
      .from('ask_scheduled_queries')
      .select('*')
      .eq('is_active', true)
      .lte('next_run_at', new Date().toISOString())
      .order('next_run_at', { ascending: true })
      .limit(50); // Process up to 50 queries per run

    if (fetchError) {
      console.error('[Scheduled Queries Cron] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch scheduled queries' },
        { status: 500 }
      );
    }

    if (!queriestoRun || queriestoRun.length === 0) {
      console.log('[Scheduled Queries Cron] No queries to run');
      return NextResponse.json({
        success: true,
        message: 'No queries to run',
        processed: 0,
      });
    }

    console.log(`[Scheduled Queries Cron] Found ${queriestoRun.length} queries to execute`);

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Execute each scheduled query
    for (const scheduledQuery of queriestoRun) {
      try {
        console.log(`[Scheduled Queries Cron] Executing query: ${scheduledQuery.id}`);

        // Classify the query
        const classification = await classifyQuery(scheduledQuery.query_text);

        // Retrieve context
        const { context, sources } = await retrieveContext(
          scheduledQuery.project_id,
          classification.queryType,
          classification.searchQuery,
          classification.entities
        );

        // Generate response with OpenAI
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'system',
              content: `Context:\n\n${context}\n\nQuery: "${scheduledQuery.query_text}"`,
            },
            { role: 'user', content: scheduledQuery.query_text },
          ],
          temperature: 0.7,
          max_tokens: 1500,
        });

        const response = completion.choices[0]?.message?.content;

        if (!response) {
          throw new Error('No response from OpenAI');
        }

        // Deliver the result
        await deliverScheduledQueryResult(scheduledQuery, response, sources);

        // Update last_run_at
        await supabase
          .from('ask_scheduled_queries')
          .update({ last_run_at: new Date().toISOString() })
          .eq('id', scheduledQuery.id);

        results.succeeded++;
        console.log(`[Scheduled Queries Cron] Successfully executed query: ${scheduledQuery.id}`);
      } catch (error) {
        console.error(`[Scheduled Queries Cron] Error executing query ${scheduledQuery.id}:`, error);
        results.failed++;
        results.errors.push(
          `Query ${scheduledQuery.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      } finally {
        results.processed++;
      }
    }

    console.log('[Scheduled Queries Cron] Execution complete:', results);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('[Scheduled Queries Cron] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper: Deliver scheduled query result
// ============================================================================

async function deliverScheduledQueryResult(
  scheduledQuery: any,
  response: string,
  sources: any[]
) {
  const { delivery_method, user_id, project_id, query_text } = scheduledQuery;

  // Get user email
  const { data: user } = await supabase.auth.admin.getUserById(user_id);

  if (!user?.user?.email) {
    console.warn(`No email found for user ${user_id}`);
    return;
  }

  // Get project name
  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', project_id)
    .single();

  const projectName = project?.name || 'Your Project';

  // Format the message
  const subject = `Scheduled Report: ${query_text}`;
  const htmlBody = `
    <h2>${subject}</h2>
    <p><strong>Project:</strong> ${projectName}</p>
    <p><strong>Query:</strong> ${query_text}</p>
    <hr>
    <div style="white-space: pre-wrap; font-family: system-ui, -apple-system, sans-serif;">
      ${formatMarkdownToHtml(response)}
    </div>
    ${sources.length > 0 ? `
      <hr>
      <h3>Sources</h3>
      <ul>
        ${sources.map(s => `<li>${s.type}: ${s.title || s.id}</li>`).join('')}
      </ul>
    ` : ''}
    <hr>
    <p style="color: #666; font-size: 12px;">
      This is an automated report from SignalsLoop.
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/ask?projectId=${project_id}">View in SignalsLoop</a>
    </p>
  `;

  // Deliver via email (if method includes email)
  if (delivery_method === 'email' || delivery_method === 'both') {
    try {
      // Note: You'll need to implement email sending via Resend or your email service
      // For now, we'll log it
      console.log(`[Scheduled Queries Cron] Would send email to ${user.user.email}`);
      console.log(`Subject: ${subject}`);
      // TODO: Implement actual email sending
      // await sendEmail({ to: user.user.email, subject, html: htmlBody });
    } catch (error) {
      console.error('[Scheduled Queries Cron] Email delivery failed:', error);
    }
  }

  // Deliver via Slack (if method includes slack)
  if (delivery_method === 'slack' || delivery_method === 'both') {
    try {
      // Note: You'll need to implement Slack webhook/bot posting
      // For now, we'll log it
      console.log(`[Scheduled Queries Cron] Would send Slack message to channel ${scheduledQuery.slack_channel_id}`);
      // TODO: Implement actual Slack posting
      // await sendSlackMessage({ channel: scheduledQuery.slack_channel_id, text: response });
    } catch (error) {
      console.error('[Scheduled Queries Cron] Slack delivery failed:', error);
    }
  }
}

// ============================================================================
// Helper: Format markdown to HTML
// ============================================================================

function formatMarkdownToHtml(markdown: string): string {
  // Simple markdown to HTML conversion
  // In production, use a proper markdown library
  return markdown
    .replace(/### (.*)/g, '<h3>$1</h3>')
    .replace(/## (.*)/g, '<h2>$1</h2>')
    .replace(/# (.*)/g, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n- (.*)/g, '\n<li>$1</li>')
    .replace(/\n/g, '<br>');
}
