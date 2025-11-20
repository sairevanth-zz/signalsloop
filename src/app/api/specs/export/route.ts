/**
 * API Route for Spec Export
 * POST /api/specs/export - Export spec to various formats
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { exportAsMarkdown, exportToJira } from '@/lib/specs/export';
import type { ExportSpecRequest, ExportSpecResponse, Spec } from '@/types/specs';

// ============================================================================
// POST /api/specs/export - Export spec
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Parse request body
    const body: ExportSpecRequest = await request.json();
    const { specId, format, jiraConfig, markdownOptions } = body;

    if (!specId || !format) {
      return NextResponse.json(
        { error: 'Spec ID and format are required' },
        { status: 400 }
      );
    }

    // Fetch the spec
    const { data: spec, error: fetchError } = await supabase
      .from('specs')
      .select('*')
      .eq('id', specId)
      .single();

    if (fetchError || !spec) {
      return NextResponse.json({ error: 'Spec not found' }, { status: 404 });
    }

    const specData = spec as Spec;

    // Handle different export formats
    let response: ExportSpecResponse;

    switch (format) {
      case 'markdown':
        const markdown = exportAsMarkdown(specData, markdownOptions);
        response = {
          success: true,
          result: { content: markdown },
        };
        break;

      case 'jira':
        if (!jiraConfig) {
          return NextResponse.json(
            { error: 'Jira configuration is required for Jira export' },
            { status: 400 }
          );
        }
        const jiraResult = await exportToJira(specData, jiraConfig);
        response = {
          success: jiraResult.success,
          result: jiraResult,
          error: jiraResult.error,
        };
        break;

      case 'clipboard':
        const clipboardContent = exportAsMarkdown(specData, {
          includeMetadata: true,
          includeLinkedFeedback: true,
          includeContextSources: false,
        });
        response = {
          success: true,
          result: { content: clipboardContent },
        };
        break;

      case 'link':
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
        const shareUrl = `${baseUrl}/dashboard/specs/${specId}`;
        response = {
          success: true,
          result: { url: shareUrl },
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid export format' }, { status: 400 });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in POST /api/specs/export:', error);

    const response: ExportSpecResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };

    return NextResponse.json(response, { status: 500 });
  }
}
