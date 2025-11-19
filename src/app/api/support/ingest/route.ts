import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large CSV imports

interface TicketInput {
  external_id?: string;
  subject: string;
  body: string;
  customer?: string;
  plan?: string;
  arr_value?: number;
  created_at?: string;
  metadata?: Record<string, any>;
}

interface IngestRequest {
  projectId: string;
  source: 'zendesk' | 'intercom' | 'csv' | 'api';
  fileUrl?: string;
  tickets?: TicketInput[];
}

/**
 * POST /api/support/ingest
 * Ingests support tickets from CSV file or direct JSON array
 *
 * Body: {
 *   projectId: string,
 *   source: 'zendesk' | 'intercom' | 'csv' | 'api',
 *   fileUrl?: string,  // URL to CSV file
 *   tickets?: TicketInput[]  // Direct ticket array
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: IngestRequest = await request.json();
    const { projectId, source, fileUrl, tickets } = body;

    // Validation
    if (!projectId || !source) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, source' },
        { status: 400 }
      );
    }

    if (!fileUrl && (!tickets || tickets.length === 0)) {
      return NextResponse.json(
        { error: 'Must provide either fileUrl or tickets array' },
        { status: 400 }
      );
    }

    console.log(`[SUPPORT INGEST] Starting ingestion for project ${projectId}, source: ${source}`);

    // Use service role client for database operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('[SUPPORT INGEST] Project not found:', projectError);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Parse tickets from fileUrl or use direct tickets array
    let parsedTickets: TicketInput[] = [];

    if (fileUrl) {
      try {
        console.log(`[SUPPORT INGEST] Fetching CSV from: ${fileUrl}`);
        parsedTickets = await parseCSVFromUrl(fileUrl);
      } catch (error) {
        console.error('[SUPPORT INGEST] CSV parsing error:', error);
        return NextResponse.json(
          {
            error: 'Failed to parse CSV file',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 400 }
        );
      }
    } else if (tickets) {
      parsedTickets = tickets;
    }

    if (parsedTickets.length === 0) {
      return NextResponse.json(
        { error: 'No valid tickets found in input' },
        { status: 400 }
      );
    }

    console.log(`[SUPPORT INGEST] Found ${parsedTickets.length} tickets to ingest`);

    // Create ingest record
    const { data: ingest, error: ingestError } = await supabase
      .from('support_ingests')
      .insert({
        project_id: projectId,
        source,
        status: 'processing',
        total: parsedTickets.length,
        processed: 0,
        metadata: {
          file_url: fileUrl,
          started_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (ingestError || !ingest) {
      console.error('[SUPPORT INGEST] Failed to create ingest record:', ingestError);
      return NextResponse.json(
        { error: 'Failed to create ingestion job' },
        { status: 500 }
      );
    }

    console.log(`[SUPPORT INGEST] Created ingest job: ${ingest.id}`);

    // Process tickets in batches to avoid overwhelming the database
    const batchSize = 100;
    let processedCount = 0;
    const errors: Array<{ index: number; error: string; ticket: TicketInput }> = [];
    const insertedTickets: string[] = [];

    for (let i = 0; i < parsedTickets.length; i += batchSize) {
      const batch = parsedTickets.slice(i, i + batchSize);

      // Prepare ticket records
      const ticketRecords = batch.map((ticket, batchIndex) => ({
        project_id: projectId,
        ingest_id: ingest.id,
        external_id: ticket.external_id || `${source}-${Date.now()}-${i + batchIndex}`,
        subject: ticket.subject,
        body: ticket.body,
        customer: ticket.customer,
        plan: ticket.plan,
        arr_value: ticket.arr_value,
        created_at: ticket.created_at || new Date().toISOString(),
        metadata: ticket.metadata || {},
      }));

      // Insert batch with upsert to handle duplicates
      const { data: inserted, error: insertError } = await supabase
        .from('support_tickets')
        .upsert(ticketRecords, {
          onConflict: 'project_id,external_id,subject',
          ignoreDuplicates: true, // Skip duplicates
        })
        .select('id');

      if (insertError) {
        console.error(`[SUPPORT INGEST] Batch insert error:`, insertError);
        // Record error but continue processing
        batch.forEach((ticket, batchIndex) => {
          errors.push({
            index: i + batchIndex,
            error: insertError.message,
            ticket,
          });
        });
      } else {
        processedCount += batch.length;
        if (inserted) {
          insertedTickets.push(...inserted.map(t => t.id));
        }
      }

      // Update progress
      await supabase
        .from('support_ingests')
        .update({ processed: processedCount })
        .eq('id', ingest.id);

      console.log(`[SUPPORT INGEST] Processed ${processedCount}/${parsedTickets.length} tickets`);
    }

    // Update ingest record with final status
    const finalStatus = errors.length === parsedTickets.length ? 'failed' :
                       errors.length > 0 ? 'completed' : 'completed';

    await supabase
      .from('support_ingests')
      .update({
        status: finalStatus,
        processed: processedCount,
        errors: errors.length > 0 ? errors.slice(0, 100) : [], // Store max 100 errors
        metadata: {
          file_url: fileUrl,
          started_at: ingest.metadata?.started_at,
          completed_at: new Date().toISOString(),
          inserted_count: insertedTickets.length,
          duplicate_count: processedCount - insertedTickets.length,
          error_count: errors.length,
        },
      })
      .eq('id', ingest.id);

    console.log(`[SUPPORT INGEST] Completed: ${insertedTickets.length} inserted, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      ingestId: ingest.id,
      total: parsedTickets.length,
      inserted: insertedTickets.length,
      duplicates: processedCount - insertedTickets.length,
      errors: errors.length,
      status: finalStatus,
      message: `Successfully ingested ${insertedTickets.length} tickets (${errors.length} errors, ${processedCount - insertedTickets.length} duplicates)`,
    });

  } catch (error) {
    console.error('[SUPPORT INGEST] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to ingest support tickets',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Parse CSV from URL
 * Expected CSV columns: external_id, subject, body, customer, plan, arr_value, created_at
 */
async function parseCSVFromUrl(url: string): Promise<TicketInput[]> {
  // Fetch CSV content
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.statusText}`);
  }

  const csvText = await response.text();
  return parseCSV(csvText);
}

/**
 * Simple CSV parser
 * Handles quoted fields and newlines within quotes
 */
function parseCSV(csvText: string): TicketInput[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  // Parse header
  const headers = parseCSVLine(lines[0]);
  console.log('[CSV PARSER] Headers:', headers);

  // Map common header variations to standard field names
  const headerMap: Record<string, string> = {
    'id': 'external_id',
    'ticket_id': 'external_id',
    'ticket id': 'external_id',
    'external_id': 'external_id',
    'subject': 'subject',
    'title': 'subject',
    'body': 'body',
    'description': 'body',
    'content': 'body',
    'message': 'body',
    'customer': 'customer',
    'customer_name': 'customer',
    'customer name': 'customer',
    'requester': 'customer',
    'plan': 'plan',
    'subscription': 'plan',
    'tier': 'plan',
    'arr_value': 'arr_value',
    'arr': 'arr_value',
    'revenue': 'arr_value',
    'created_at': 'created_at',
    'created': 'created_at',
    'date': 'created_at',
    'timestamp': 'created_at',
  };

  // Normalize headers
  const normalizedHeaders = headers.map(h =>
    headerMap[h.toLowerCase().trim()] || h.toLowerCase().trim()
  );

  // Parse data rows
  const tickets: TicketInput[] = [];
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);

      // Create ticket object from row
      const ticket: any = {};
      normalizedHeaders.forEach((header, index) => {
        if (values[index] !== undefined && values[index] !== '') {
          ticket[header] = values[index];
        }
      });

      // Validate required fields
      if (!ticket.subject || !ticket.body) {
        console.warn(`[CSV PARSER] Skipping row ${i + 1}: missing subject or body`);
        continue;
      }

      // Parse numeric ARR value
      if (ticket.arr_value) {
        const arrNum = parseFloat(ticket.arr_value.toString().replace(/[^0-9.-]/g, ''));
        if (!isNaN(arrNum)) {
          ticket.arr_value = arrNum;
        } else {
          delete ticket.arr_value;
        }
      }

      // Parse date
      if (ticket.created_at) {
        const date = new Date(ticket.created_at);
        if (!isNaN(date.getTime())) {
          ticket.created_at = date.toISOString();
        } else {
          delete ticket.created_at;
        }
      }

      tickets.push(ticket as TicketInput);
    } catch (error) {
      console.warn(`[CSV PARSER] Error parsing row ${i + 1}:`, error);
      // Continue processing other rows
    }
  }

  console.log(`[CSV PARSER] Parsed ${tickets.length} valid tickets from ${lines.length - 1} rows`);
  return tickets;
}

/**
 * Parse a single CSV line, handling quoted fields with commas and newlines
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());

  return result;
}

/**
 * GET /api/support/ingest?ingestId=xxx
 * Get status of an ingestion job
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ingestId = searchParams.get('ingestId');

    if (!ingestId) {
      return NextResponse.json(
        { error: 'Missing ingestId parameter' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: ingest, error } = await supabase
      .from('support_ingests')
      .select('*')
      .eq('id', ingestId)
      .single();

    if (error || !ingest) {
      return NextResponse.json(
        { error: 'Ingest job not found' },
        { status: 404 }
      );
    }

    // Get ticket count
    const { count } = await supabase
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('ingest_id', ingestId);

    return NextResponse.json({
      success: true,
      ingest: {
        ...ingest,
        actual_ticket_count: count || 0,
      },
    });

  } catch (error) {
    console.error('[SUPPORT INGEST] Error fetching ingest status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ingest status' },
      { status: 500 }
    );
  }
}
