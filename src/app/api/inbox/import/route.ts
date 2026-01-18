/**
 * CSV Import API Route
 * Handles CSV file uploads for importing feedback into the Universal Inbox
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

interface CSVRow {
    title?: string;
    content: string;
    author_name?: string;
    author_email?: string;
    source?: string;
    category?: string;
    created_at?: string;
    [key: string]: string | undefined;
}

interface ImportResult {
    success: boolean;
    imported: number;
    skipped: number;
    errors: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const projectId = formData.get('projectId') as string;
        const sourceLabel = formData.get('sourceLabel') as string || 'csv_import';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
        }

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large. Maximum size is 5MB' }, { status: 400 });
        }

        // Parse CSV content
        const text = await file.text();
        const rows = parseCSV(text);

        if (rows.length === 0) {
            return NextResponse.json({ error: 'No valid data found in CSV' }, { status: 400 });
        }

        // Import the rows
        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const result = await importRows(adminClient, projectId, rows, sourceLabel);

        return NextResponse.json({
            message: `Imported ${result.imported} items, skipped ${result.skipped}`,
            ...result,
        });

    } catch (error) {
        console.error('[CSV Import] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Import failed' },
            { status: 500 }
        );
    }
}

function parseCSV(text: string): CSVRow[] {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    // Parse header row
    const headers = parseCSVLine(lines[0]).map(h =>
        h.toLowerCase().trim().replace(/\s+/g, '_')
    );

    // Find the content column (required)
    const contentIndex = headers.findIndex(h =>
        ['content', 'description', 'body', 'text', 'message', 'feedback'].includes(h)
    );

    if (contentIndex === -1) {
        throw new Error('CSV must have a content column (content, description, body, text, message, or feedback)');
    }

    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === 0) continue;

        const row: CSVRow = { content: '' };

        headers.forEach((header, index) => {
            if (index < values.length) {
                row[header] = values[index];
            }
        });

        // Map common column variations
        row.content = row.content || row.description || row.body || row.text || row.message || row.feedback || '';
        row.title = row.title || row.subject || row.heading || '';
        row.author_name = row.author_name || row.author || row.name || row.user || row.customer || '';
        row.author_email = row.author_email || row.email || '';
        row.source = row.source || row.platform || row.channel || '';
        row.category = row.category || row.type || '';
        row.created_at = row.created_at || row.date || row.timestamp || '';

        // Skip empty content rows
        if (!row.content || row.content.trim().length === 0) {
            continue;
        }

        rows.push(row);
    }

    return rows;
}

function parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"' && !inQuotes) {
            inQuotes = true;
        } else if (char === '"' && inQuotes) {
            if (nextChar === '"') {
                current += '"';
                i++; // Skip next quote
            } else {
                inQuotes = false;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current.trim());
    return values;
}

async function importRows(
    supabase: any,
    projectId: string,
    rows: CSVRow[],
    sourceLabel: string
): Promise<ImportResult> {
    const result: ImportResult = {
        success: true,
        imported: 0,
        skipped: 0,
        errors: [],
    };

    const batchSize = 50;
    const batches = [];

    for (let i = 0; i < rows.length; i += batchSize) {
        batches.push(rows.slice(i, i + batchSize));
    }

    for (const batch of batches) {
        const itemsToInsert = batch.map(row => {
            // Generate a content hash for deduplication
            const contentHash = crypto
                .createHash('md5')
                .update(row.content.trim().toLowerCase())
                .digest('hex');

            // Parse date if provided
            let originalCreatedAt = new Date();
            if (row.created_at) {
                try {
                    const parsed = new Date(row.created_at);
                    if (!isNaN(parsed.getTime())) {
                        originalCreatedAt = parsed;
                    }
                } catch {
                    // Use current date if parsing fails
                }
            }

            // Map category
            let category = 'other';
            const rawCategory = row.category?.toLowerCase() || '';
            if (rawCategory.includes('bug') || rawCategory.includes('issue')) {
                category = 'bug';
            } else if (rawCategory.includes('feature') || rawCategory.includes('request')) {
                category = 'feature_request';
            } else if (rawCategory.includes('praise') || rawCategory.includes('positive')) {
                category = 'praise';
            } else if (rawCategory.includes('complaint') || rawCategory.includes('negative')) {
                category = 'complaint';
            } else if (rawCategory.includes('question') || rawCategory.includes('help')) {
                category = 'question';
            }

            return {
                project_id: projectId,
                source_type: 'widget', // Using 'widget' as it's the closest to manual import
                source_id: `csv-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                source_channel: sourceLabel,

                title: row.title || null,
                content: row.content,
                content_plain: row.content,
                language: 'en',

                author_name: row.author_name || null,
                author_email: row.author_email || null,
                author_metadata: {},

                category,
                engagement_metrics: {},
                engagement_score: 0,

                status: 'new',
                starred: false,
                is_duplicate: false,
                tags: [],

                content_hash: contentHash,
                original_created_at: originalCreatedAt.toISOString(),
                imported_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
        });

        const { error, data } = await supabase
            .from('unified_feedback_items')
            .insert(itemsToInsert)
            .select('id');

        if (error) {
            console.error('[CSV Import] Batch insert error:', error);
            result.errors.push(`Batch error: ${error.message}`);
            result.skipped += batch.length;
        } else {
            result.imported += data?.length || 0;
        }
    }

    return result;
}
