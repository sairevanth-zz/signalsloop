/**
 * Component Data Fetcher API
 * Fetches data for components with data_query specifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchComponentData } from '@/lib/stakeholder/data-fetcher';
import { ComponentSpec } from '@/types/stakeholder';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body: { component: ComponentSpec; projectId: string } = await request.json();
    const { component, projectId } = body;

    if (!component || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: component, projectId' },
        { status: 400 }
      );
    }

    // Fetch data for the component
    const result = await fetchComponentData(component, projectId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Fetch Data API] Error:', error);

    return NextResponse.json(
      {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch data',
      },
      { status: 500 }
    );
  }
}
