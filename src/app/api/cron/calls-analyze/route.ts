/**
 * Call Analysis Cron Job
 * GET /api/cron/calls-analyze
 *
 * Processes pending call ingests:
 * 1. Fetches unanalyzed call records
 * 2. Analyzes each call with AI
 * 3. Creates posts/themes from extracted insights
 * 4. Updates analysis status
 * 5. Sends notifications when complete
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  analyzeCall,
  extractThemes,
  CallAnalysisResult,
} from '@/lib/ai-call-analysis';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for cron jobs

const BATCH_SIZE = 10; // Process 10 calls per run to avoid timeouts

export async function GET(request: NextRequest) {
  console.log('[Cron: Calls Analyze] Starting analysis job...');

  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron: Calls Analyze] Unauthorized access attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use service role client for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch unanalyzed call records (limit to batch size)
    const { data: callRecords, error: fetchError } = await supabase
      .from('call_records')
      .select('*')
      .is('analyzed_at', null)
      .limit(BATCH_SIZE)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('[Cron: Calls Analyze] Error fetching records:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch call records' },
        { status: 500 }
      );
    }

    if (!callRecords || callRecords.length === 0) {
      console.log('[Cron: Calls Analyze] No pending calls to analyze');
      return NextResponse.json({
        success: true,
        message: 'No pending calls to analyze',
        processed: 0,
      });
    }

    console.log(`[Cron: Calls Analyze] Found ${callRecords.length} calls to analyze`);

    const results: Array<{ callId: string; success: boolean; error?: string }> = [];
    const allAnalyses: CallAnalysisResult[] = [];

    // Process each call
    for (const record of callRecords) {
      try {
        console.log(`[Cron: Calls Analyze] Analyzing call ${record.id}...`);

        // Analyze the call with AI
        const analysis = await analyzeCall(
          record.transcript,
          record.customer,
          record.amount ? Number(record.amount) : undefined,
          record.stage
        );

        if (!analysis) {
          results.push({
            callId: record.id,
            success: false,
            error: 'AI analysis returned null',
          });
          continue;
        }

        allAnalyses.push(analysis);

        // Update call_record with analysis results
        const { error: updateError } = await supabase
          .from('call_records')
          .update({
            analyzed_at: new Date().toISOString(),
            highlight_summary: analysis.highlight_summary,
            sentiment: analysis.sentiment,
            priority_score: analysis.priority_score,
            feature_requests: analysis.feature_requests,
            objections: analysis.objections,
            competitors: analysis.competitors,
            expansion_signals: analysis.expansion_signals,
            churn_signals: analysis.churn_signals,
          })
          .eq('id', record.id);

        if (updateError) {
          console.error(`[Cron: Calls Analyze] Error updating record ${record.id}:`, updateError);
          results.push({
            callId: record.id,
            success: false,
            error: updateError.message,
          });
          continue;
        }

        // Get the project's board ID for creating posts
        const { data: project } = await supabase
          .from('projects')
          .select('id, boards(id)')
          .eq('id', record.project_id)
          .single();

        const boardId = project?.boards?.[0]?.id;

        // Create posts for feature requests
        if (analysis.feature_requests.length > 0 && boardId) {
          for (const feature of analysis.feature_requests) {
            try {
              await supabase.from('posts').insert({
                project_id: record.project_id,
                board_id: boardId,
                title: feature.title,
                description: feature.description,
                status: 'open',
                author_name: record.customer || 'Customer Call',
                author_email: null,
                ai_category: 'Feature Request',
                ai_categorized: true,
                ai_confidence: 0.9,
                call_record_id: record.id,
                arr_hint: feature.arr_impact || record.amount,
                timestamp_text: feature.timestamp_hint,
                call_metadata: {
                  priority: feature.priority,
                  source: 'call_intelligence',
                  customer: record.customer,
                  deal_id: record.deal_id,
                  stage: record.stage,
                },
              });
            } catch (error) {
              console.error('[Cron: Calls Analyze] Error creating feature post:', error);
            }
          }
        }

        // Create posts for objections
        if (analysis.objections.length > 0 && boardId) {
          for (const objection of analysis.objections) {
            try {
              await supabase.from('posts').insert({
                project_id: record.project_id,
                board_id: boardId,
                title: `Objection: ${objection.type}`,
                description: `${objection.description}\n\nContext: ${objection.context}`,
                status: 'open',
                author_name: record.customer || 'Customer Call',
                author_email: null,
                ai_category: 'Improvement',
                ai_categorized: true,
                ai_confidence: 0.85,
                call_record_id: record.id,
                objection_type: objection.type,
                timestamp_text: objection.context,
                call_metadata: {
                  severity: objection.severity,
                  source: 'call_intelligence',
                  customer: record.customer,
                  deal_id: record.deal_id,
                },
              });
            } catch (error) {
              console.error('[Cron: Calls Analyze] Error creating objection post:', error);
            }
          }
        }

        // Create posts for competitor mentions
        if (analysis.competitors.length > 0 && boardId) {
          for (const competitor of analysis.competitors) {
            try {
              await supabase.from('posts').insert({
                project_id: record.project_id,
                board_id: boardId,
                title: `Competitor Mention: ${competitor.name}`,
                description: `${competitor.context}\n\nSentiment: ${competitor.sentiment}`,
                status: 'open',
                author_name: record.customer || 'Customer Call',
                author_email: null,
                ai_category: 'Other',
                ai_categorized: true,
                ai_confidence: 0.8,
                call_record_id: record.id,
                competitor_mentioned: competitor.name,
                timestamp_text: competitor.context,
                call_metadata: {
                  competitor_sentiment: competitor.sentiment,
                  source: 'call_intelligence',
                  customer: record.customer,
                },
              });
            } catch (error) {
              console.error('[Cron: Calls Analyze] Error creating competitor post:', error);
            }
          }
        }

        // Update ingest progress
        const { error: ingestError } = await supabase.rpc('increment', {
          row_id: record.ingest_id,
          table_name: 'call_ingests',
          column_name: 'processed_calls',
        });

        if (ingestError) {
          console.error('[Cron: Calls Analyze] Error updating ingest progress:', ingestError);
        }

        results.push({
          callId: record.id,
          success: true,
        });

        console.log(`[Cron: Calls Analyze] Successfully analyzed call ${record.id}`);

        // Rate limiting between calls
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[Cron: Calls Analyze] Error processing call ${record.id}:`, error);
        results.push({
          callId: record.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Extract and create themes from all analyses
    if (allAnalyses.length > 0) {
      try {
        const themes = extractThemes(allAnalyses);

        for (const [themeName, frequency] of themes.entries()) {
          const projectId = callRecords[0].project_id;

          // Check if theme already exists
          const { data: existingTheme } = await supabase
            .from('themes')
            .select('id, frequency')
            .eq('project_id', projectId)
            .eq('theme_name', themeName)
            .single();

          if (existingTheme) {
            // Update frequency
            await supabase
              .from('themes')
              .update({
                frequency: existingTheme.frequency + frequency,
                last_seen: new Date().toISOString(),
              })
              .eq('id', existingTheme.id);
          } else {
            // Create new theme
            await supabase.from('themes').insert({
              project_id: projectId,
              theme_name: themeName,
              description: `Theme identified from call analysis`,
              frequency,
              first_seen: new Date().toISOString(),
              last_seen: new Date().toISOString(),
              is_emerging: true,
            });
          }
        }
      } catch (error) {
        console.error('[Cron: Calls Analyze] Error creating themes:', error);
      }
    }

    // Check if any ingests are now complete
    const ingestIds = [...new Set(callRecords.map((r) => r.ingest_id))];
    for (const ingestId of ingestIds) {
      const { data: ingest } = await supabase
        .from('call_ingests')
        .select('total_calls, processed_calls, status')
        .eq('id', ingestId)
        .single();

      if (ingest && ingest.processed_calls >= ingest.total_calls && ingest.status !== 'completed') {
        await supabase
          .from('call_ingests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', ingestId);

        console.log(`[Cron: Calls Analyze] Ingest ${ingestId} completed`);
        // TODO: Trigger notification here
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    console.log(`[Cron: Calls Analyze] Job complete. Success: ${successCount}, Failed: ${failureCount}`);

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful: successCount,
      failed: failureCount,
      results,
    });
  } catch (error) {
    console.error('[Cron: Calls Analyze] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
