/**
 * Call Ingestion API
 * POST /api/calls/ingest
 *
 * Accepts call transcripts via:
 * - File URL (CSV/ZIP)
 * - Direct transcript array
 * - API integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { z } from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Input validation schemas
const TranscriptSchema = z.object({
  customer: z.string().optional(),
  deal_id: z.string().optional(),
  amount: z.number().optional(),
  stage: z.string().optional(),
  transcript: z.string().min(10),
  transcript_url: z.string().url().optional(),
  duration: z.number().optional(),
});

const IngestRequestSchema = z.object({
  projectId: z.string().uuid(),
  source: z.enum(['csv', 'zip', 'api', 'manual']),
  fileUrl: z.string().url().optional(),
  transcripts: z.array(TranscriptSchema).optional(),
}).refine(
  (data) => data.fileUrl || (data.transcripts && data.transcripts.length > 0),
  { message: 'Either fileUrl or transcripts array is required' }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = IngestRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { projectId, source, fileUrl, transcripts } = validationResult.data;

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Create call_ingest record
    const totalCalls = transcripts?.length || 0;
    const { data: ingest, error: ingestError } = await supabase
      .from('call_ingests')
      .insert({
        project_id: projectId,
        status: transcripts ? 'processing' : 'pending',
        source,
        file_url: fileUrl || null,
        total_calls: totalCalls,
        processed_calls: 0,
      })
      .select()
      .single();

    if (ingestError) {
      console.error('[Calls Ingest] Error creating ingest:', ingestError);
      return NextResponse.json(
        { error: 'Failed to create ingest record' },
        { status: 500 }
      );
    }

    // If transcripts provided directly, create call_records
    if (transcripts && transcripts.length > 0) {
      const callRecords = transcripts.map((t) => ({
        ingest_id: ingest.id,
        project_id: projectId,
        customer: t.customer || null,
        deal_id: t.deal_id || null,
        amount: t.amount || null,
        stage: t.stage || null,
        transcript: t.transcript,
        transcript_url: t.transcript_url || null,
        duration: t.duration || null,
      }));

      const { error: recordsError } = await supabase
        .from('call_records')
        .insert(callRecords);

      if (recordsError) {
        console.error('[Calls Ingest] Error creating records:', recordsError);

        // Update ingest status to failed
        await supabase
          .from('call_ingests')
          .update({
            status: 'failed',
            errors: [{ message: 'Failed to create call records', error: recordsError.message }],
          })
          .eq('id', ingest.id);

        return NextResponse.json(
          { error: 'Failed to create call records' },
          { status: 500 }
        );
      }

      // Update ingest with actual record count
      await supabase
        .from('call_ingests')
        .update({ total_calls: callRecords.length })
        .eq('id', ingest.id);
    }

    console.log(`[Calls Ingest] Created ingest ${ingest.id} with ${totalCalls} calls for project ${projectId}`);

    return NextResponse.json({
      success: true,
      ingest: {
        id: ingest.id,
        project_id: ingest.project_id,
        status: ingest.status,
        source: ingest.source,
        total_calls: ingest.total_calls,
        created_at: ingest.created_at,
      },
      message: `Ingest created successfully. ${totalCalls} call(s) queued for analysis.`,
    });
  } catch (error) {
    console.error('[Calls Ingest] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calls/ingest?projectId=xxx
 * List all ingests for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Fetch ingests
    const { data: ingests, error } = await supabase
      .from('call_ingests')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Calls Ingest] Error fetching ingests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch ingests' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ingests,
    });
  } catch (error) {
    console.error('[Calls Ingest] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
