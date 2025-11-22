/**
 * Anomaly Detection API
 *
 * GET /api/anomalies/detect?projectId=xxx
 * - Get active anomalies for a project
 *
 * POST /api/anomalies/detect
 * - Run anomaly detection and return results
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import {
  detectAllAnomalies,
  detectSentimentAnomalies,
  detectVolumeAnomalies,
} from '@/lib/predictions/anomaly-detection';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - Fetch active anomalies
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceRoleClient();

    // Fetch active anomalies
    const { data, error } = await supabase
      .from('anomaly_detections')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('detected_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[ANOMALY API] Error fetching anomalies:', error);
      return NextResponse.json(
        { error: 'Failed to fetch anomalies' },
        { status: 500 }
      );
    }

    const anomalies = (data || []).map((a) => ({
      id: a.id,
      type: a.anomaly_type,
      severity: a.severity,
      detectedAt: a.detected_at,
      metricName: a.metric_name,
      expectedValue: a.expected_value,
      actualValue: a.actual_value,
      deviationScore: a.deviation_score,
      significance: a.statistical_significance,
      summary: a.ai_summary,
      potentialCauses: a.potential_causes,
      recommendedActions: a.recommended_actions,
      affectedPostsCount: a.affected_posts_count,
      status: a.status,
    }));

    return NextResponse.json({
      anomalies,
      count: anomalies.length,
    });
  } catch (error) {
    console.error('[ANOMALY API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Run anomaly detection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, detectionType } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    let anomalies;

    switch (detectionType) {
      case 'sentiment':
        anomalies = await detectSentimentAnomalies(projectId);
        break;
      case 'volume':
        anomalies = await detectVolumeAnomalies(projectId);
        break;
      case 'all':
      default:
        anomalies = await detectAllAnomalies(projectId);
        break;
    }

    return NextResponse.json({
      success: true,
      anomaliesDetected: anomalies.length,
      anomalies: anomalies.map((a) => ({
        type: a.type,
        severity: a.severity,
        metricName: a.metricName,
        deviationScore: a.deviationScore,
        summary: a.aiSummary,
      })),
    });
  } catch (error) {
    console.error('[ANOMALY API] POST error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to run anomaly detection',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
