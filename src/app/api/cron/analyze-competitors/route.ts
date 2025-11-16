/**
 * Cron Job: Analyze Competitor Strengths & Weaknesses
 * Schedule: Weekly (Sunday at 2 AM)
 * Purpose: Analyze reviews to identify competitor strengths and weaknesses
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeStrengthsAndWeaknesses } from '@/lib/competitive-intelligence/external-review-scraper';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    console.log('[Cron: Analyze Competitors] Starting weekly analysis...');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active competitor products that have reviews
    const { data: products, error } = await supabase
      .from('competitor_products')
      .select('*')
      .eq('is_active', true)
      .gt('total_reviews_synced', 0);

    if (error) {
      console.error('[Cron: Analyze Competitors] Error fetching products:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
      });
    }

    if (!products || products.length === 0) {
      console.log('[Cron: Analyze Competitors] No products with reviews to analyze');
      return NextResponse.json({
        success: true,
        message: 'No products with reviews to analyze',
        productsAnalyzed: 0,
      });
    }

    let productsAnalyzed = 0;
    let totalStrengthsFound = 0;
    let totalWeaknessesFound = 0;
    const errors: string[] = [];

    // Analyze each product
    for (const product of products) {
      try {
        console.log(`[Cron: Analyze Competitors] Analyzing ${product.product_name}...`);

        const result = await analyzeStrengthsAndWeaknesses(product.id);

        if (result.success) {
          totalStrengthsFound += result.strengthsFound;
          totalWeaknessesFound += result.weaknessesFound;
          productsAnalyzed++;
          console.log(`[Cron: Analyze Competitors] ${product.product_name}: ${result.strengthsFound} strengths, ${result.weaknessesFound} weaknesses`);
        } else {
          errors.push(`${product.product_name}: ${result.error}`);
        }

        // Rate limiting: wait 3 seconds between products
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error: any) {
        console.error(`[Cron: Analyze Competitors] Error analyzing ${product.product_name}:`, error);
        errors.push(`${product.product_name}: ${error.message}`);
      }
    }

    // Generate alerts for significant findings
    await generateCompetitorAlerts(supabase, products);

    console.log(`[Cron: Analyze Competitors] Completed. Analyzed ${productsAnalyzed} products`);
    console.log(`[Cron: Analyze Competitors] Found ${totalStrengthsFound} strengths, ${totalWeaknessesFound} weaknesses`);

    return NextResponse.json({
      success: true,
      productsAnalyzed,
      totalStrengthsFound,
      totalWeaknessesFound,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[Cron: Analyze Competitors] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Generate alerts for new strengths/weaknesses
 */
async function generateCompetitorAlerts(supabase: any, products: any[]): Promise<void> {
  try {
    for (const product of products) {
      // Check for new strengths added in the last week
      const { data: newStrengths } = await supabase
        .from('competitor_strengths')
        .select('*')
        .eq('competitor_product_id', product.id)
        .gte('first_identified_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (newStrengths && newStrengths.length > 0) {
        for (const strength of newStrengths) {
          await supabase
            .from('competitor_alerts')
            .insert({
              project_id: product.project_id,
              competitor_product_id: product.id,
              alert_type: 'new_strength',
              title: `New Strength Detected: ${strength.feature_name}`,
              description: `${product.product_name} is receiving praise for ${strength.feature_name}`,
              feature_name: strength.feature_name,
              severity: 'medium',
              feature_id: strength.id,
            });
        }
      }

      // Check for new weaknesses (opportunities)
      const { data: newWeaknesses } = await supabase
        .from('competitor_weaknesses')
        .select('*')
        .eq('competitor_product_id', product.id)
        .gte('first_identified_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .in('strategic_importance', ['critical', 'high']);

      if (newWeaknesses && newWeaknesses.length > 0) {
        for (const weakness of newWeaknesses) {
          await supabase
            .from('competitor_alerts')
            .insert({
              project_id: product.project_id,
              competitor_product_id: product.id,
              alert_type: 'new_weakness',
              title: `New Opportunity: ${weakness.feature_name}`,
              description: `${product.product_name} users are complaining about ${weakness.feature_name} - opportunity to differentiate`,
              feature_name: weakness.feature_name,
              severity: weakness.strategic_importance === 'critical' ? 'critical' : 'high',
              feature_id: weakness.id,
            });
        }
      }
    }
  } catch (error) {
    console.error('[Cron: Analyze Competitors] Error generating alerts:', error);
  }
}
