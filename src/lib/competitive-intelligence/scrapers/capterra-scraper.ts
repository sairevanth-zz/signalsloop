/**
 * Capterra Review Scraper
 * Scrapes reviews from Capterra product pages
 */

import puppeteer, { Browser, Page } from 'puppeteer';

interface CapterraReview {
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
 * Scrape reviews from Capterra
 */
export async function scrapeCapterraReviews(
  productUrl: string,
  limit: number = 50
): Promise<CapterraReview[]> {
  let browser: Browser | null = null;

  try {
    console.log(`[Capterra Scraper] Starting scrape for ${productUrl}`);

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to reviews page
    const reviewsUrl = productUrl.includes('reviews')
      ? productUrl
      : `${productUrl}/reviews`;

    console.log(`[Capterra Scraper] Navigating to ${reviewsUrl}`);

    await page.goto(reviewsUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Wait for reviews to load
    await page.waitForSelector('[data-test="review"]', { timeout: 30000 }).catch(() => {
      console.log('[Capterra Scraper] Reviews not found on page');
    });

    // Click "Load More" buttons to get more reviews
    await loadMoreReviews(page, limit);

    // Extract reviews
    const reviews = await page.evaluate((maxReviews) => {
      const reviewElements = document.querySelectorAll('[data-test="review"]');
      const extractedReviews: any[] = [];

      reviewElements.forEach((element, index) => {
        if (index >= maxReviews) return;

        try {
          // Extract rating
          const ratingElement = element.querySelector('[class*="rating"]');
          const ratingText = ratingElement?.getAttribute('aria-label') || '';
          const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
          const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

          // Extract title
          const titleElement = element.querySelector('[data-test="review-title"]');
          const title = titleElement?.textContent?.trim() || 'Untitled Review';

          // Extract content (pros and cons combined)
          const prosElement = element.querySelector('[data-test="review-pros"]');
          const consElement = element.querySelector('[data-test="review-cons"]');
          const pros = prosElement?.textContent?.trim() || '';
          const cons = consElement?.textContent?.trim() || '';
          const content = `Pros: ${pros}\n\nCons: ${cons}`.trim();

          // Extract reviewer info
          const reviewerNameElement = element.querySelector('[data-test="reviewer-name"]');
          const reviewerName = reviewerNameElement?.textContent?.trim() || 'Anonymous';

          const reviewerRoleElement = element.querySelector('[data-test="reviewer-title"]');
          const reviewer_role = reviewerRoleElement?.textContent?.trim();

          const companySizeElement = element.querySelector('[data-test="company-size"]');
          const reviewer_company_size = companySizeElement?.textContent?.trim();

          // Extract date
          const dateElement = element.querySelector('[data-test="review-date"]');
          const dateStr = dateElement?.textContent?.trim() || '';
          const published_at = parseCapterraDate(dateStr);

          // Check if verified
          const verifiedBadge = element.querySelector('[data-test="verified-reviewer"]');
          const verified_reviewer = !!verifiedBadge;

          // Capterra doesn't typically mark incentivized reviews
          const incentivized_review = false;

          // Generate unique ID
          const external_review_id = `capterra_${published_at}_${reviewerName.replace(/\s+/g, '_')}`;

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

      function parseCapterraDate(dateStr: string): string {
        try {
          // Capterra uses formats like "2 months ago" or "January 15, 2024"
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

    console.log(`[Capterra Scraper] Extracted ${reviews.length} reviews`);

    return reviews;
  } catch (error) {
    console.error('[Capterra Scraper] Error scraping reviews:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Click "Load More" buttons to expand reviews
 */
async function loadMoreReviews(page: Page, targetReviews: number): Promise<void> {
  try {
    const maxClicks = Math.ceil(targetReviews / 10); // Assume ~10 reviews per load

    for (let i = 0; i < maxClicks; i++) {
      const loadMoreButton = await page.$('[data-test="load-more-reviews"]');

      if (!loadMoreButton) {
        console.log('[Capterra Scraper] No more reviews to load');
        break;
      }

      await loadMoreButton.click();
      await page.waitForTimeout(2000); // Wait for reviews to load
    }
  } catch (error) {
    console.error('[Capterra Scraper] Error loading more reviews:', error);
  }
}

/**
 * Extract product ID from Capterra URL
 */
export function extractCapterraProductId(url: string): string | null {
  const match = url.match(/capterra\.com\/p\/(\d+)/);
  return match ? match[1] : null;
}
