/**
 * Roadmap Export API
 * POST /api/roadmap/export
 *
 * Generate and download roadmap exports in various formats
 * - Markdown: For GitHub, Notion, etc.
 * - PDF: For stakeholder presentations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateMarkdownExport, generatePDFExport, type ExportFilters } from '@/lib/roadmap';

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutes for PDF generation

interface ExportRequest {
  projectId: string;
  format: 'markdown' | 'pdf';
  filters?: ExportFilters;
}

/**
 * POST /api/roadmap/export
 * Generate a roadmap export
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check authentication
    const authHeader = request.headers.get('authorization');
    let userId: string | undefined;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      userId = user.id;
    } else {
      return NextResponse.json(
        { success: false, error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as ExportRequest;
    const { projectId, format, filters = {} } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    if (!format || !['markdown', 'pdf'].includes(format)) {
      return NextResponse.json(
        { success: false, error: 'format must be "markdown" or "pdf"' },
        { status: 400 }
      );
    }

    // Verify user owns the project
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, owner_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Generate export based on format
    let content: Buffer | string;
    let contentType: string;
    let filename: string;

    console.log(`Generating ${format} export for project ${projectId}...`);

    if (format === 'markdown') {
      content = await generateMarkdownExport(projectId, filters);
      contentType = 'text/markdown';
      filename = `${project.name}-roadmap-${new Date().toISOString().split('T')[0]}.md`;
    } else {
      content = await generatePDFExport(projectId, filters);
      contentType = 'application/pdf';
      filename = `${project.name}-roadmap-${new Date().toISOString().split('T')[0]}.pdf`;
    }

    // Log export (metadata only - actual file sent directly)
    await supabase.from('roadmap_exports').insert({
      project_id: projectId,
      user_id: userId,
      export_type: format,
      file_path: filename, // In production, upload to S3/R2
      included_priorities: filters.priorities || ['critical', 'high', 'medium', 'low'],
      filter_config: filters
    });

    // Return file as download
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Content-Length', content.length.toString());

    return new NextResponse(content, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Error generating export:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
