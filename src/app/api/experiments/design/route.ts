/**
 * Experiment Design Assistant API
 *
 * POST /api/experiments/design - Generate AI-powered experiment design from feature idea
 *
 * Part of Phase 3: Stakeholder Management & Experimentation Intelligence
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateExperimentDesign,
  generateMultivariateDesign,
  saveExperimentDesign,
  validateExperimentDesign,
} from '@/lib/experiments/design-assistant';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for AI generation

/**
 * POST - Generate experiment design using AI
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      featureIdea,
      projectId,
      variantCount = 2, // 2 = standard A/B test
      saveDesign = false,
      createdBy,
    } = body;

    if (!featureIdea || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: featureIdea, projectId' },
        { status: 400 }
      );
    }

    console.log(`[Design Assistant API] Generating design for: "${featureIdea}"`);

    // Generate design
    let design;
    if (variantCount > 2) {
      // Multivariate experiment
      design = await generateMultivariateDesign(featureIdea, variantCount, projectId);
    } else {
      // Standard A/B test
      design = await generateExperimentDesign(featureIdea, projectId);
    }

    // Validate design
    const validation = validateExperimentDesign(design);

    // Save to database if requested
    let experimentId;
    if (saveDesign) {
      try {
        experimentId = await saveExperimentDesign(projectId, design, featureIdea, createdBy);
        console.log(`[Design Assistant API] Design saved as experiment ${experimentId}`);
      } catch (saveError) {
        console.error('[Design Assistant API] Error saving design:', saveError);
        // Don't fail the request if save fails, just log it
      }
    }

    return NextResponse.json({
      success: true,
      design,
      validation,
      experimentId: experimentId || null,
      message: validation.valid
        ? 'Experiment design generated successfully'
        : 'Design generated with validation errors',
    });
  } catch (error) {
    console.error('[Design Assistant API] POST error:', error);
    if (error instanceof Error) {
      console.error('[Design Assistant API] Error stack:', error.stack);
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to generate experiment design. Please check your feature idea and try again.',
        debug: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
