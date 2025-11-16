/**
 * Manual Competitive Extraction API
 * For testing/debugging - extracts competitors from feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractCompetitorMentionsBatch, getPendingFeedbackForExtraction } from '@/lib/competitive-intelligence';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/competitive/extract
 * Manually trigger competitive extraction for a project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, limit = 20 } = body;

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verify user has access to this project
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('owner_id', user.id)
        .single();

      if (!project) {
        return NextResponse.json({ success: false, error: 'Project not found or access denied' }, { status: 403 });
      }
    }

    console.log(`[Manual Extraction] Starting extraction for project ${projectId}`);

    // Get pending feedback for extraction
    const pendingFeedbackIds = await getPendingFeedbackForExtraction(projectId, limit);

    if (pendingFeedbackIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending feedback to extract',
        processed: 0,
        mentionsFound: 0,
        pendingFeedbackIds: [],
      });
    }

    console.log(`[Manual Extraction] Found ${pendingFeedbackIds.length} pending feedback items`);

    // Extract competitors from feedback batch
    const result = await extractCompetitorMentionsBatch(pendingFeedbackIds);

    console.log(`[Manual Extraction] Completed. Processed: ${result.processed}, Mentions: ${result.totalMentions}`);

    return NextResponse.json({
      success: true,
      message: 'Extraction completed',
      processed: result.processed,
      successful: result.successful,
      failed: result.failed,
      mentionsFound: result.totalMentions,
      pendingFeedbackIds,
    });
  } catch (error) {
    console.error('[Manual Extraction] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Extraction failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
