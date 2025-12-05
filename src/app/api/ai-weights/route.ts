/**
 * AI Weight Preferences API
 * GET - Get weight preferences
 * POST - Save weight preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { warRoomService, FeatureType, WeightPreset, WeightConfig, WEIGHT_PRESETS } from '@/lib/war-room';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = request.nextUrl.searchParams.get('projectId');
    const featureType = request.nextUrl.searchParams.get('featureType') as FeatureType;
    
    if (!projectId || !featureType) {
      return NextResponse.json({ error: 'projectId and featureType required' }, { status: 400 });
    }

    // Try to get user-specific preferences first, then project defaults
    let preferences = await warRoomService.getWeightPreferences(projectId, featureType, user.id);
    if (!preferences) {
      preferences = await warRoomService.getWeightPreferences(projectId, featureType);
    }

    return NextResponse.json({
      success: true,
      preferences,
      presets: WEIGHT_PRESETS,
    });
  } catch (error) {
    console.error('[API] Get weights error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, featureType, weights, preset, saveAsDefault } = body;

    if (!projectId || !featureType) {
      return NextResponse.json({ error: 'projectId and featureType required' }, { status: 400 });
    }

    // If using a preset, get preset weights
    let finalWeights: WeightConfig = weights;
    if (preset && WEIGHT_PRESETS[preset as WeightPreset]) {
      finalWeights = WEIGHT_PRESETS[preset as WeightPreset];
    }

    if (!finalWeights) {
      return NextResponse.json({ error: 'weights or preset required' }, { status: 400 });
    }

    // Validate weights sum to 100
    const sum = Object.values(finalWeights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.1) {
      return NextResponse.json({ error: 'Weights must sum to 100' }, { status: 400 });
    }

    const preferences = await warRoomService.saveWeightPreferences(
      projectId,
      featureType,
      finalWeights,
      saveAsDefault ? undefined : user.id,
      preset as WeightPreset
    );

    if (!preferences) {
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
    }

    return NextResponse.json({ success: true, preferences });
  } catch (error) {
    console.error('[API] Save weights error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
