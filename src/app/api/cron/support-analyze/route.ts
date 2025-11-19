/**
 * Support Ticket Analysis Cron Job
 * GET /api/cron/support-analyze
 *
 * Processes unanalyzed support tickets:
 * 1. Fetches unanalyzed tickets (batched)
 * 2. Analyzes each ticket with AI (theme, sentiment, priority)
 * 3. Clusters tickets into themes
 * 4. Creates or updates themes in the database
 * 5. Creates roadmap posts for high-priority gaps
 * 6. Links tickets to themes and posts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  analyzeTicketsBatch,
  clusterTicketsByTheme,
  identifyTopGaps,
  type SupportTicket,
  type TicketAnalysisResult,
  type ClusteredTheme,
} from '@/lib/openai/support-tickets';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for cron jobs

const BATCH_SIZE = 20; // Process 20 tickets per run to avoid timeouts

export async function GET(request: NextRequest) {
  console.log('[Cron: Support Analyze] Starting ticket analysis job...');

  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron: Support Analyze] Unauthorized access attempt');
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

    // Fetch unanalyzed support tickets (limit to batch size)
    const { data: tickets, error: fetchError } = await supabase
      .from('support_tickets')
      .select('*')
      .is('analyzed_at', null)
      .limit(BATCH_SIZE)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('[Cron: Support Analyze] Error fetching tickets:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch support tickets' },
        { status: 500 }
      );
    }

    if (!tickets || tickets.length === 0) {
      console.log('[Cron: Support Analyze] No pending tickets to analyze');
      return NextResponse.json({
        success: true,
        message: 'No pending tickets to analyze',
        processed: 0,
      });
    }

    console.log(`[Cron: Support Analyze] Found ${tickets.length} tickets to analyze`);

    // Convert database tickets to SupportTicket format
    const supportTickets: SupportTicket[] = tickets.map(t => ({
      id: t.id,
      external_id: t.external_id,
      subject: t.subject,
      body: t.body,
      customer: t.customer,
      plan: t.plan,
      arr_value: t.arr_value,
      created_at: t.created_at,
    }));

    // Analyze tickets with AI
    const analyses = await analyzeTicketsBatch(supportTickets, 10);

    console.log(`[Cron: Support Analyze] Analyzed ${analyses.length} tickets`);

    // Cluster tickets by theme
    const clusteredThemes = clusterTicketsByTheme(analyses);

    console.log(`[Cron: Support Analyze] Identified ${clusteredThemes.length} unique themes`);

    // Process each clustered theme
    const themeResults: Array<{ themeName: string; themeId?: string; postId?: string }> = [];

    for (const cluster of clusteredThemes) {
      try {
        // Check if theme already exists
        const { data: existingTheme, error: themeError } = await supabase
          .from('themes')
          .select('id')
          .eq('project_id', tickets[0].project_id)
          .ilike('theme_name', cluster.theme_name)
          .maybeSingle();

        let themeId: string;

        if (existingTheme) {
          // Update existing theme
          themeId = existingTheme.id;

          const { error: updateError } = await supabase
            .from('themes')
            .update({
              description: cluster.description,
              frequency: cluster.ticket_ids.length,
              avg_sentiment: cluster.avg_sentiment,
              last_seen: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', themeId);

          if (updateError) {
            console.error(`[Cron: Support Analyze] Error updating theme ${themeId}:`, updateError);
          }

          console.log(`[Cron: Support Analyze] Updated existing theme: ${cluster.theme_name}`);
        } else {
          // Create new theme
          const { data: newTheme, error: insertError } = await supabase
            .from('themes')
            .insert({
              project_id: tickets[0].project_id,
              theme_name: cluster.theme_name,
              description: cluster.description,
              frequency: cluster.ticket_ids.length,
              avg_sentiment: cluster.avg_sentiment,
              first_seen: new Date().toISOString(),
              last_seen: new Date().toISOString(),
              is_emerging: true,
            })
            .select('id')
            .single();

          if (insertError || !newTheme) {
            console.error(`[Cron: Support Analyze] Error creating theme:`, insertError);
            continue;
          }

          themeId = newTheme.id;
          console.log(`[Cron: Support Analyze] Created new theme: ${cluster.theme_name}`);
        }

        themeResults.push({ themeName: cluster.theme_name, themeId });

        // Update tickets with theme_id
        for (const ticketId of cluster.ticket_ids) {
          const analysis = analyses.find(a => a.ticket_id === ticketId);

          await supabase
            .from('support_tickets')
            .update({
              theme_id: themeId,
              analyzed_at: new Date().toISOString(),
              sentiment_score: analysis?.sentiment_score || 0,
              sentiment_category: analysis?.sentiment_category || 'neutral',
              priority_score: analysis?.priority_score || 5,
            })
            .eq('id', ticketId);
        }

        console.log(`[Cron: Support Analyze] Linked ${cluster.ticket_ids.length} tickets to theme ${themeId}`);
      } catch (error) {
        console.error(`[Cron: Support Analyze] Error processing theme "${cluster.theme_name}":`, error);
      }
    }

    // Identify top 5 gaps and create roadmap posts
    const topGaps = identifyTopGaps(clusteredThemes, 5);

    console.log(`[Cron: Support Analyze] Identified ${topGaps.length} top gaps`);

    const postResults: Array<{ gap: string; postId?: string; error?: string }> = [];

    for (const gap of topGaps) {
      try {
        // Get the project's default board
        const { data: project } = await supabase
          .from('projects')
          .select('id, boards(id)')
          .eq('id', tickets[0].project_id)
          .single();

        const boardId = project?.boards?.[0]?.id;

        if (!boardId) {
          console.warn(`[Cron: Support Analyze] No board found for project ${tickets[0].project_id}`);
          postResults.push({ gap: gap.theme_name, error: 'No board found' });
          continue;
        }

        // Check if a post already exists for this theme
        const themeId = themeResults.find(t => t.themeName === gap.theme_name)?.themeId;

        if (themeId) {
          const { data: existingPost } = await supabase
            .from('posts')
            .select('id')
            .eq('project_id', tickets[0].project_id)
            .eq('title', gap.theme_name)
            .maybeSingle();

          if (existingPost) {
            console.log(`[Cron: Support Analyze] Post already exists for gap: ${gap.theme_name}`);

            // Update tickets with post_id
            await supabase
              .from('support_tickets')
              .update({ post_id: existingPost.id })
              .in('id', gap.ticket_ids);

            postResults.push({ gap: gap.theme_name, postId: existingPost.id });
            continue;
          }
        }

        // Create a new roadmap post for this gap
        const postDescription = `${gap.description}

**Priority:** ${gap.priority_score}/10
**Severity:** ${gap.severity}
**Tickets:** ${gap.ticket_ids.length}
**Sentiment:** ${gap.avg_sentiment.toFixed(2)}
**ARR at Risk:** $${gap.total_arr_risk.toFixed(2)}

**Recommendation:** ${gap.recommendation}

_This post was automatically created from ${gap.ticket_ids.length} support tickets._`;

        const { data: newPost, error: postError } = await supabase
          .from('posts')
          .insert({
            project_id: tickets[0].project_id,
            board_id: boardId,
            title: gap.theme_name,
            description: postDescription,
            status: 'open',
            category: gap.severity === 'critical' || gap.severity === 'high' ? 'Bug' : 'Feature',
            author_name: 'Support Ticket Miner',
            author_email: null,
          })
          .select('id')
          .single();

        if (postError || !newPost) {
          console.error(`[Cron: Support Analyze] Error creating post for gap "${gap.theme_name}":`, postError);
          postResults.push({ gap: gap.theme_name, error: postError?.message });
          continue;
        }

        console.log(`[Cron: Support Analyze] Created roadmap post for gap: ${gap.theme_name}`);
        postResults.push({ gap: gap.theme_name, postId: newPost.id });

        // Link tickets to the created post
        await supabase
          .from('support_tickets')
          .update({ post_id: newPost.id })
          .in('id', gap.ticket_ids);

        console.log(`[Cron: Support Analyze] Linked ${gap.ticket_ids.length} tickets to post ${newPost.id}`);
      } catch (error) {
        console.error(`[Cron: Support Analyze] Error creating post for gap "${gap.theme_name}":`, error);
        postResults.push({
          gap: gap.theme_name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log('[Cron: Support Analyze] Analysis job completed successfully');

    return NextResponse.json({
      success: true,
      message: `Analyzed ${analyses.length} tickets, created/updated ${themeResults.length} themes, and ${postResults.filter(p => p.postId).length} posts`,
      stats: {
        tickets_analyzed: analyses.length,
        themes_processed: themeResults.length,
        posts_created: postResults.filter(p => p.postId).length,
        top_gaps_identified: topGaps.length,
      },
      themes: themeResults,
      posts: postResults,
    });

  } catch (error) {
    console.error('[Cron: Support Analyze] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze support tickets',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
