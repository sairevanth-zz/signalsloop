/**
 * Call Ingestion - File Upload API
 * POST /api/calls/ingest-file
 *
 * Accepts file uploads for CSV and ZIP files
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface ParsedTranscript {
    customer: string | null;
    transcript: string;
    amount: number | null;
    stage: string | null;
    deal_id: string | null;
}

function parseCSV(content: string): ParsedTranscript[] {
    const lines = content.split('\n');
    const transcripts: ParsedTranscript[] = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Handle CSV with quoted fields
        const fields: string[] = [];
        let inQuote = false;
        let currentField = '';

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"' && (j === 0 || line[j - 1] !== '\\')) {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                fields.push(currentField.trim());
                currentField = '';
            } else {
                currentField += char;
            }
        }
        fields.push(currentField.trim());

        // Expected format: customer, transcript, amount (optional), stage (optional), deal_id (optional)
        if (fields.length >= 2 && fields[1]) {
            transcripts.push({
                customer: fields[0] || null,
                transcript: fields[1].replace(/^"|"$/g, ''), // Remove surrounding quotes
                amount: fields[2] ? parseFloat(fields[2]) : null,
                stage: fields[3] || null,
                deal_id: fields[4] || null,
            });
        }
    }

    return transcripts;
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const projectId = formData.get('projectId') as string | null;
        const source = formData.get('source') as 'csv' | 'zip' | null;

        // Validate inputs
        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        if (!source || !['csv', 'zip'].includes(source)) {
            return NextResponse.json({ error: 'Invalid source type' }, { status: 400 });
        }

        const supabase = getSupabaseServerClient();
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database connection not available' },
                { status: 500 }
            );
        }

        // Verify project exists
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

        let transcripts: ParsedTranscript[] = [];

        // Parse file based on type
        if (source === 'csv') {
            const content = await file.text();
            transcripts = parseCSV(content);

            if (transcripts.length === 0) {
                return NextResponse.json(
                    { error: 'No valid transcripts found in CSV file. Expected format: customer, transcript, amount, stage, deal_id' },
                    { status: 400 }
                );
            }
        } else if (source === 'zip') {
            // For ZIP files, we'd need to extract and process
            // For now, return a message that ZIP processing is being queued
            const { data: ingest, error: ingestError } = await supabase
                .from('call_ingests')
                .insert({
                    project_id: projectId,
                    status: 'pending',
                    source: 'zip',
                    file_url: null,
                    total_calls: 0,
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

            return NextResponse.json({
                success: true,
                message: 'ZIP file received. Processing queued. ZIP support coming soon.',
                ingest: {
                    id: ingest.id,
                    project_id: ingest.project_id,
                    status: ingest.status,
                    source: ingest.source,
                },
            });
        }

        // Create call_ingest record
        const { data: ingest, error: ingestError } = await supabase
            .from('call_ingests')
            .insert({
                project_id: projectId,
                status: 'processing',
                source,
                file_url: null,
                total_calls: transcripts.length,
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

        // Create call_records
        const callRecords = transcripts.map((t) => ({
            ingest_id: ingest.id,
            project_id: projectId,
            customer: t.customer,
            deal_id: t.deal_id,
            amount: t.amount,
            stage: t.stage,
            transcript: t.transcript,
            transcript_url: null,
            duration: null,
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

        console.log(`[Calls Ingest] File upload created ingest ${ingest.id} with ${transcripts.length} calls for project ${projectId}`);

        return NextResponse.json({
            success: true,
            ingest: {
                id: ingest.id,
                project_id: ingest.project_id,
                status: ingest.status,
                source: ingest.source,
                total_calls: transcripts.length,
                created_at: ingest.created_at,
            },
            message: `Successfully ingested ${transcripts.length} call transcript(s) from ${file.name}`,
        });
    } catch (error) {
        console.error('[Calls Ingest] File upload error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
