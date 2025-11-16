/**
 * Cron Job: Scrape External Reviews
 * Schedule: Daily at 3 AM
 * Purpose: Automatically scrape new reviews from G2, Capterra, TrustRadius
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scrapeCompetitorReviews } from '@/lib/competitive-intelligence/external-review-scraper';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    console.log('[Cron: External Reviews] Starting daily review scraping...');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active competitor products
    const { data: products, error } = await supabase
      .from('competitor_products')
      .select('*')
      .eq('is_active', true)
      .eq('monitoring_enabled', true);

    if (error) {
      console.error('[Cron: External Reviews] Error fetching products:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
      });
    }

    if (!products || products.length === 0) {
      console.log('[Cron: External Reviews] No active products to scrape');
      return NextResponse.json({
        success: true,
        message: 'No active products to scrape',
        productsProcessed: 0,
      });
    }

    let totalReviewsScraped = 0;
    let productsProcessed = 0;
    const errors: string[] = [];

    // Process each product
    for (const product of products) {
      console.log(`[Cron: External Reviews] Processing ${product.product_name}...`);

      // Scrape from each enabled platform
      for (const platform of product.platforms) {
        try {
          const result = await scrapeCompetitorReviews(
            product.id,
            platform as 'g2' | 'capterra' | 'trustradius',
            50 // Scrape up to 50 reviews per platform per day
          );

          if (result.success) {
            totalReviewsScraped += result.reviewsScraped;
            console.log(`[Cron: External Reviews] Scraped ${result.reviewsScraped} reviews from ${platform} for ${product.product_name}`);
          } else {
            errors.push(`${product.product_name} (${platform}): ${result.error}`);
          }

          // Rate limiting: wait 2 seconds between platforms
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error: any) {
          console.error(`[Cron: External Reviews] Error scraping ${platform} for ${product.product_name}:`, error);
          errors.push(`${product.product_name} (${platform}): ${error.message}`);
        }
      }

      productsProcessed++;

      // Rate limiting: wait 5 seconds between products
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log(`[Cron: External Reviews] Completed. Processed ${productsProcessed} products, scraped ${totalReviewsScraped} reviews`);

    return NextResponse.json({
      success: true,
      productsProcessed,
      totalReviewsScraped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[Cron: External Reviews] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
