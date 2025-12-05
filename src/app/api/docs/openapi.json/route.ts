/**
 * API Route: OpenAPI Specification
 * GET /api/docs/openapi.json
 *
 * Returns the OpenAPI specification for the SignalsLoop API
 */

import { NextResponse } from 'next/server';
import { generateOpenAPISpec } from '@/lib/openapi/generator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const spec = generateOpenAPISpec();

    return NextResponse.json(spec, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('[OpenAPI] Error generating spec:', error);
    return NextResponse.json(
      { error: 'Failed to generate OpenAPI specification' },
      { status: 500 }
    );
  }
}
