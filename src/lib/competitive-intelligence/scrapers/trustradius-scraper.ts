/**
 * TrustRadius Review Scraper
 * Scrapes reviews from TrustRadius product pages
 */

import puppeteer, { Browser, Page } from 'puppeteer-core';
import { getBrowserConfig } from './browser-config';

interface TrustRadiusReview {
  external_review_id: string;
  title: string;
  content: string;
  rating: number;
  reviewer_name: string;
  reviewer_role?: string;
  reviewer_company_size?: string;
  published_at: string;
  verified_reviewer: boolean;
  incentivized_review: boolean;
}

/**
 * Scrape reviews from TrustRadius
 */
export async function scrapeTrustRadiusReviews(
  productUrl: string,
  limit: number = 50
): Promise<TrustRadiusReview[]> {
  let browser: Browser | null = null;

  try {
    console.log(`[TrustRadius Scraper] Starting scrape for ${productUrl}`);

    const browserConfig = getBrowserConfig();
    browser = await puppeteer.launch(browserConfig);

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to reviews page
    const reviewsUrl = productUrl.includes('reviews')
      ? productUrl
      : `${productUrl}/reviews`;

    console.log(`[TrustRadius Scraper] Navigating to ${reviewsUrl}`);

    await page.goto(reviewsUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Wait for reviews to load
    await page.waitForSelector('.review-card', { timeout: 30000 }).catch(() => {
      console.log('[TrustRadius Scraper] Reviews not found on page');
    });

    // Scroll to load more reviews
    await autoScroll(page, limit);

    // Extract reviews
    const reviews = await page.evaluate((maxReviews) => {
      const reviewElements = document.querySelectorAll('.review-card');
      const extractedReviews: any[] = [];

      reviewElements.forEach((element, index) => {
        if (index >= maxReviews) return;

        try {
          // Extract rating
          const ratingElement = element.querySelector('.rating-score');
          const ratingText = ratingElement?.textContent?.trim() || '0';
          const rating = parseFloat(ratingText) || 0;

          // Extract title
          const titleElement = element.querySelector('.review-title');
          const title = titleElement?.textContent?.trim() || 'Untitled Review';

          // Extract content
          const contentElement = element.querySelector('.review-content');
          const content = contentElement?.textContent?.trim() || '';

          // Extract reviewer info
          const reviewerNameElement = element.querySelector('.reviewer-name');
          const reviewerName = reviewerNameElement?.textContent?.trim() || 'Anonymous';

          const reviewerRoleElement = element.querySelector('.reviewer-title');
          const reviewer_role = reviewerRoleElement?.textContent?.trim();

          const companySizeElement = element.querySelector('.company-size');
          const reviewer_company_size = companySizeElement?.textContent?.trim();

          // Extract date
          const dateElement = element.querySelector('.review-date');
          const dateStr = dateElement?.textContent?.trim() || '';
          const published_at = parseTrustRadiusDate(dateStr);

          // Check if verified
          const verifiedBadge = element.querySelector('.verified-badge');
          const verified_reviewer = !!verifiedBadge;

          // Check if incentivized
          const incentivizedBadge = element.querySelector('.incentivized-badge');
          const incentivized_review = !!incentivizedBadge;

          // Generate unique ID
          const external_review_id = `trustradius_${published_at}_${reviewerName.replace(/\s+/g, '_')}`;

          extractedReviews.push({
            external_review_id,
            title,
            content,
            rating,
            reviewer_name: reviewerName,
            reviewer_role,
            reviewer_company_size,
            published_at,
            verified_reviewer,
            incentivized_review,
          });
        } catch (error) {
          console.error('Error extracting review:', error);
        }
      });

      function parseTrustRadiusDate(dateStr: string): string {
        try {
          // TrustRadius uses formats like "2 months ago" or "January 2024"
          const now = new Date();

          if (dateStr.includes('ago')) {
            const match = dateStr.match(/(\d+)\s+(day|week|month|year)/);
            if (match) {
              const value = parseInt(match[1]);
              const unit = match[2];

              switch (unit) {
                case 'day':
                  now.setDate(now.getDate() - value);
                  break;
                case 'week':
                  now.setDate(now.getDate() - value * 7);
                  break;
                case 'month':
                  now.setMonth(now.getMonth() - value);
                  break;
                case 'year':
                  now.setFullYear(now.getFullYear() - value);
                  break;
              }

              return now.toISOString();
            }
          }

          // Try parsing as regular date
          const parsed = new Date(dateStr);
          return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
        } catch {
          return new Date().toISOString();
        }
      }

      return extractedReviews;
    }, limit);

    console.log(`[TrustRadius Scraper] Extracted ${reviews.length} reviews`);

    return reviews;
  } catch (error) {
    console.error('[TrustRadius Scraper] Error scraping reviews:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Auto-scroll to load more reviews
 */
async function autoScroll(page: Page, targetReviews: number): Promise<void> {
  try {
    await page.evaluate(async (target) => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 300;
        const maxScrolls = Math.ceil(target / 10);
        let scrolls = 0;

        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          scrolls++;

          if (totalHeight >= scrollHeight || scrolls >= maxScrolls) {
            clearInterval(timer);
            resolve();
          }
        }, 500);
      });
    }, targetReviews);

    await page.waitForTimeout(2000);
  } catch (error) {
    console.error('[TrustRadius Scraper] Error during auto-scroll:', error);
  }
}

/**
 * Extract product ID from TrustRadius URL
 */
export function extractTrustRadiusProductId(url: string): string | null {
  const match = url.match(/trustradius\.com\/products\/([^\/]+)/);
  return match ? match[1] : null;
}
