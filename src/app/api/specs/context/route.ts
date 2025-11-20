/**
 * API Route for RAG Context Retrieval
 * GET /api/specs/context - Retrieve relevant context for spec generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { retrieveContext } from '@/lib/specs/context-retrieval';
import type { RetrieveContextRequest, RetrieveContextResponse } from '@/types/specs';

// ============================================================================
// GET /api/specs/context - Retrieve context
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Validate required parameters
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Retrieve context using RAG
    const context = await retrieveContext(projectId, query, limit);

    const response: RetrieveContextResponse = {
      success: true,
      context,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/specs/context:', error);

    const response: RetrieveContextResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve context',
    };

    return NextResponse.json(response, { status: 500 });
  }
}
