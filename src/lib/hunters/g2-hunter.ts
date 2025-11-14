/**
 * G2 Hunter
 * Discovers reviews from G2 using web scraping
 * Note: This uses a conservative approach to respect G2's terms of service
 */

import { BaseHunter } from './base-hunter';
import {
  PlatformType,
  RawFeedback,
  HunterConfig,
  PlatformIntegration,
  PlatformIntegrationError,
} from '@/types/hunter';
import * as cheerio from 'cheerio';

interface G2Review {
  id: string;
  title: string;
  content: string;
  rating: number;
  author: string;
  date: string;
  helpful_count: number;
}

export class G2Hunter extends BaseHunter {
  platform: PlatformType = 'g2';

  /**
   * Hunt for feedback on G2
   */
  async hunt(
    config: HunterConfig,
    integration: PlatformIntegration
  ): Promise<RawFeedback[]> {
    try {
      // Validate configuration
      if (!integration.config.g2_product_url) {
        throw new PlatformIntegrationError(
          'Missing G2 product URL',
          'g2',
          { integration_id: integration.id }
        );
      }

      const results: RawFeedback[] = [];

      // Fetch reviews page
      const reviews = await this.fetchReviews(
        integration.config.g2_product_url
      );

      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      for (const review of reviews) {
        // Only get reviews from last 24 hours
        const reviewDate = new Date(review.date).getTime();
        if (reviewDate < oneDayAgo) continue;

        // Check for excluded keywords
        const content = `${review.title} ${review.content}`;
        if (this.containsExcludedKeywords(content, config.excluded_keywords)) {
          continue;
        }

        results.push({
          content: this.sanitizeText(content),
          title: review.title,
          platform: 'g2',
          platform_id: review.id,
          platform_url: `${integration.config.g2_product_url}/reviews`,
          author_username: review.author,
          discovered_at: new Date(review.date),
          engagement_metrics: {
            rating: review.rating,
            likes: review.helpful_count,
          },
        });
      }

      console.log(`[G2] Found ${results.length} items`);
      return results;
    } catch (error) {
      console.error('[G2] Hunt error:', error);
      throw new PlatformIntegrationError(
        `G2 hunt failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'g2',
        error
      );
    }
  }

  /**
   * Fetch reviews from G2 product page
   * Note: This is a simplified implementation. In production, you might want to use
   * a service like ScrapingBee, Apify, or Bright Data to handle this more robustly.
   */
  private async fetchReviews(productUrl: string): Promise<G2Review[]> {
    try {
      // Add conservative delay to respect rate limits
      await this.delay(5000);

      const reviewsUrl = `${productUrl}/reviews?order=most_recent`;

      const response = await fetch(reviewsUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; SignalsLoop/1.0; +https://signalsloop.com)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });

      if (!response.ok) {
        throw new Error(`G2 request failed: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const reviews: G2Review[] = [];

      // Parse review elements
      // Note: G2's HTML structure may change, so this is a simplified example
      $('.paper.paper--white').each((index, element) => {
        try {
          const $review = $(element);

          const title = $review.find('[itemprop="name"]').text().trim();
          const content = $review.find('[itemprop="reviewBody"]').text().trim();
          const rating = parseFloat(
            $review.find('[itemprop="ratingValue"]').attr('content') || '0'
          );
          const author = $review.find('[itemprop="author"]').text().trim();
          const dateStr = $review.find('time').attr('datetime');

          if (title && content && dateStr) {
            reviews.push({
              id: `g2-${Date.parse(dateStr)}-${index}`,
              title,
              content,
              rating,
              author: author || 'Anonymous',
              date: dateStr,
              helpful_count: 0, // G2 doesn't always expose this
            });
          }
        } catch (error) {
          console.error('[G2] Error parsing review:', error);
        }
      });

      return reviews;
    } catch (error) {
      console.error('[G2] Error fetching reviews:', error);
      // Return empty array rather than throwing to prevent complete failure
      return [];
    }
  }
}
