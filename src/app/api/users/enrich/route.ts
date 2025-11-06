import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { enrichUser, type EnrichmentInput } from '@/lib/enrichment';

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
    console.log('[Enrich] ========== Enrichment Request Started ==========');
    const { userId, runAsync = true } = await request.json();
    console.log('[Enrich] Request params:', { userId, runAsync });

    if (!userId) {
      console.error('[Enrich] Missing userId in request');
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      console.error('[Enrich] Supabase service role client not available');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    console.log('[Enrich] Querying users table for userId:', userId);
    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, plan')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('[Enrich] User not found in users table:', userId);
      console.error('[Enrich] Database error:', userError);
      return NextResponse.json(
        { error: 'User not found', details: userError?.message },
        { status: 404 }
      );
    }

    console.log('[Enrich] User found:', { id: user.id, email: user.email, name: user.name, plan: user.plan });

    if (!user.email) {
      return NextResponse.json(
        { error: 'User email is required for enrichment' },
        { status: 400 }
      );
    }

    // Check if already enriched
    console.log('[Enrich] Checking if user already enriched...');
    const { data: existingIntelligence } = await supabase
      .from('user_intelligence')
      .select('id, enriched_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingIntelligence?.enriched_at) {
      console.log('[Enrich] ⏭️  User already enriched at:', existingIntelligence.enriched_at);
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'User already enriched'
      });
    }

    console.log('[Enrich] User not yet enriched, proceeding...');

    if (runAsync) {
      // Run enrichment in background (non-blocking)
      console.log('[Enrich] Starting background enrichment...');
      enrichUserAsync(user.id, user.email, user.name, user.plan || 'free').catch(error => {
        console.error('[Enrich] ❌ Background enrichment failed:', error);
        console.error('[Enrich] Error stack:', error.stack);
      });

      console.log('[Enrich] ✅ Enrichment started in background');
      return NextResponse.json({
        success: true,
        message: 'Enrichment started in background'
      });
    } else {
      // Run enrichment synchronously
      console.log('[Enrich] Starting synchronous enrichment...');
      await enrichUserAsync(user.id, user.email, user.name, user.plan || 'free');

      console.log('[Enrich] ✅ Synchronous enrichment completed');
      return NextResponse.json({
        success: true,
        message: 'Enrichment completed'
      });
    }
  } catch (error) {
    console.error('[Enrich] ❌ Unexpected error in enrichment endpoint:', error);
    console.error('[Enrich] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      {
        error: 'Failed to enrich user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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
  console.log('[Enrich] ========== enrichUserAsync Started ==========');
  console.log('[Enrich] Params:', { userId, email, name, plan });

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    console.error('[Enrich] Supabase client not available in enrichUserAsync');
    throw new Error('Supabase client not available');
  }

  try {
    // Run enrichment pipeline
    const input: EnrichmentInput = {
      email,
      name,
      plan
    };

    console.log('[Enrich] Calling enrichUser pipeline...');
    const enrichmentResult = await enrichUser(input);
    console.log('[Enrich] ✅ Enrichment pipeline completed. Confidence:', enrichmentResult.confidence_score);

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

    // Note: Slack notification is sent immediately from auth callback
    // to ensure we don't miss signups if enrichment fails
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

      // Note: Slack notification already sent from auth callback
      console.log('[Enrich] Error state stored, notification already sent from auth callback');
    } catch (fallbackError) {
      console.error('[Enrich] Failed to store error state:', fallbackError);
    }

    throw error;
  }
}
