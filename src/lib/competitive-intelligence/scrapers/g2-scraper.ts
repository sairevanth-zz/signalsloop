/**
 * G2 Review Scraper
 * Scrapes reviews from G2.com product pages
 */

import puppeteer, { Browser, Page } from 'puppeteer';

interface G2Review {
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
 * Scrape reviews from G2
 */
export async function scrapeG2Reviews(
  productUrl: string,
  limit: number = 50
): Promise<G2Review[]> {
  let browser: Browser | null = null;

  try {
    console.log(`[G2 Scraper] Starting scrape for ${productUrl}`);

    // Launch browser in headless mode
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

    // Set realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to reviews page
    const reviewsUrl = productUrl.includes('/reviews')
      ? productUrl
      : `${productUrl}/reviews`;

    console.log(`[G2 Scraper] Navigating to ${reviewsUrl}`);

    await page.goto(reviewsUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Wait for reviews to load
    await page.waitForSelector('[itemprop="review"]', { timeout: 30000 }).catch(() => {
      console.log('[G2 Scraper] Reviews not found on page');
    });

    // Scroll to load more reviews
    await autoScroll(page, limit);

    // Extract reviews
    const reviews = await page.evaluate((maxReviews) => {
      const reviewElements = document.querySelectorAll('[itemprop="review"]');
      const extractedReviews: any[] = [];

      reviewElements.forEach((element, index) => {
        if (index >= maxReviews) return;

        try {
          // Extract rating
          const ratingElement = element.querySelector('[itemprop="ratingValue"]');
          const rating = ratingElement
            ? parseFloat(ratingElement.getAttribute('content') || '0')
            : 0;

          // Extract review content
          const contentElement = element.querySelector('[itemprop="reviewBody"]');
          const content = contentElement?.textContent?.trim() || '';

          // Extract title
          const titleElement = element.querySelector('.fw-semibold.mb-half');
          const title = titleElement?.textContent?.trim() || 'Untitled Review';

          // Extract reviewer info
          const reviewerNameElement = element.querySelector('[itemprop="author"]');
          const reviewerName = reviewerNameElement?.textContent?.trim() || 'Anonymous';

          // Extract reviewer role and company size
          const reviewerInfoElement = element.querySelector('.pl-0.subtle-text');
          const reviewerInfo = reviewerInfoElement?.textContent?.trim() || '';
          const [reviewer_role, reviewer_company_size] = reviewerInfo.split('|').map(s => s.trim());

          // Extract date
          const dateElement = element.querySelector('[itemprop="datePublished"]');
          const dateStr = dateElement?.getAttribute('content') || new Date().toISOString();

          // Check if verified
          const verifiedBadge = element.querySelector('[data-test="verified-badge"]');
          const verified_reviewer = !!verifiedBadge;

          // Check if incentivized
          const incentivizedBadge = element.querySelector('.incentivized-badge');
          const incentivized_review = !!incentivizedBadge;

          // Generate unique ID
          const external_review_id = `g2_${dateStr}_${reviewerName.replace(/\s+/g, '_')}`;

          extractedReviews.push({
            external_review_id,
            title,
            content,
            rating,
            reviewer_name: reviewerName,
            reviewer_role,
            reviewer_company_size,
            published_at: dateStr,
            verified_reviewer,
            incentivized_review,
          });
        } catch (error) {
          console.error('Error extracting review:', error);
        }
      });

      return extractedReviews;
    }, limit);

    console.log(`[G2 Scraper] Extracted ${reviews.length} reviews`);

    return reviews;
  } catch (error) {
    console.error('[G2 Scraper] Error scraping reviews:', error);
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
        const maxScrolls = Math.ceil(target / 10); // Assume ~10 reviews per scroll
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
        }, 500); // Scroll every 500ms
      });
    }, targetReviews);

    // Wait for content to load after scrolling
    await page.waitForTimeout(2000);
  } catch (error) {
    console.error('[G2 Scraper] Error during auto-scroll:', error);
  }
}

/**
 * Extract product ID from G2 URL
 */
export function extractG2ProductId(url: string): string | null {
  const match = url.match(/g2\.com\/products\/([^\/]+)/);
  return match ? match[1] : null;
}
