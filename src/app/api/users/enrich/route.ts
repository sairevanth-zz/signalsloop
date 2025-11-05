import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { enrichUser, type EnrichmentInput } from '@/lib/enrichment';
import { sendSignupNotification } from '@/lib/slack-notifications';

/**
 * POST /api/users/enrich
 *
 * Enriches user data with intelligence from multiple sources and stores it in the database.
 * This endpoint is called after user signup to gather information about the user.
 *
 * Request body:
 * {
 *   "userId": "uuid",
 *   "runAsync": boolean (optional, default: true)
 * }
 *
 * If runAsync is true, the enrichment runs in the background and returns immediately.
 * If false, waits for enrichment to complete before returning.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, runAsync = true } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, plan')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('[Enrich] User not found:', userId, userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: 'User email is required for enrichment' },
        { status: 400 }
      );
    }

    // Check if already enriched
    const { data: existingIntelligence } = await supabase
      .from('user_intelligence')
      .select('id, enriched_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingIntelligence?.enriched_at) {
      console.log('[Enrich] User already enriched:', userId);
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'User already enriched'
      });
    }

    if (runAsync) {
      // Run enrichment in background (non-blocking)
      enrichUserAsync(user.id, user.email, user.name, user.plan || 'free').catch(error => {
        console.error('[Enrich] Background enrichment failed:', error);
      });

      return NextResponse.json({
        success: true,
        message: 'Enrichment started in background'
      });
    } else {
      // Run enrichment synchronously
      await enrichUserAsync(user.id, user.email, user.name, user.plan || 'free');

      return NextResponse.json({
        success: true,
        message: 'Enrichment completed'
      });
    }
  } catch (error) {
    console.error('[Enrich] Error:', error);
    return NextResponse.json(
      { error: 'Failed to enrich user' },
      { status: 500 }
    );
  }
}

/**
 * Async function to perform enrichment and store results
 */
async function enrichUserAsync(
  userId: string,
  email: string,
  name: string | null,
  plan: string
): Promise<void> {
  console.log('[Enrich] Starting enrichment for user:', userId);

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  try {
    // Run enrichment pipeline
    const input: EnrichmentInput = {
      email,
      name,
      plan
    };

    const enrichmentResult = await enrichUser(input);

    // Store in database
    const { error: insertError } = await supabase
      .from('user_intelligence')
      .upsert({
        user_id: userId,
        email: email,
        name: name,
        company_name: enrichmentResult.company_name,
        company_domain: enrichmentResult.company_domain,
        company_size: enrichmentResult.company_size,
        industry: enrichmentResult.industry,
        role: enrichmentResult.role,
        seniority_level: enrichmentResult.seniority_level,
        linkedin_url: enrichmentResult.linkedin_url,
        twitter_url: enrichmentResult.twitter_url,
        github_url: enrichmentResult.github_url,
        github_username: enrichmentResult.github_username,
        bio: enrichmentResult.bio,
        location: enrichmentResult.location,
        website: enrichmentResult.website,
        confidence_score: enrichmentResult.confidence_score,
        data_sources: enrichmentResult.data_sources,
        raw_data: enrichmentResult.raw_data,
        plan_type: plan,
        enriched_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (insertError) {
      console.error('[Enrich] Failed to store enrichment data:', insertError);
      throw insertError;
    }

    console.log('[Enrich] Successfully stored enrichment data for user:', userId);

    // Send Slack notification
    await sendSignupNotification({
      userId,
      email,
      name,
      plan,
      enrichment: enrichmentResult,
      timestamp: new Date().toISOString()
    });

    console.log('[Enrich] Enrichment completed successfully for user:', userId);
  } catch (error) {
    console.error('[Enrich] Enrichment failed for user:', userId, error);

    // Store partial data with error info
    try {
      await supabase
        .from('user_intelligence')
        .upsert({
          user_id: userId,
          email: email,
          name: name,
          plan_type: plan,
          confidence_score: 0,
          data_sources: [],
          raw_data: {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }
        }, {
          onConflict: 'user_id'
        });

      // Still send Slack notification with basic info
      await sendSignupNotification({
        userId,
        email,
        name,
        plan,
        enrichment: null,
        timestamp: new Date().toISOString()
      });
    } catch (fallbackError) {
      console.error('[Enrich] Failed to store error state:', fallbackError);
    }

    throw error;
  }
}
