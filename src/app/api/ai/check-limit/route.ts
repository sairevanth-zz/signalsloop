import { NextRequest, NextResponse } from 'next/server';
import { checkAIUsageLimit, type AIFeatureType } from '@/lib/ai-rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const feature = searchParams.get('feature');

    if (!projectId || !feature) {
      return NextResponse.json(
        { error: 'Project ID and feature are required' },
        { status: 400 }
      );
    }

    const usageInfo = await checkAIUsageLimit(projectId, feature as AIFeatureType);

    return NextResponse.json(usageInfo);

  } catch (error) {
    console.error('Error checking AI limit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

