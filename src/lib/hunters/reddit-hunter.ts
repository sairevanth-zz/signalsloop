/**
 * Reddit Hunter
 * Discovers feedback from Reddit using RSS feeds (most reliable public API)
 * No authentication required - uses Reddit's RSS feeds
 */

import { BaseHunter } from './base-hunter';
import {
  PlatformType,
  RawFeedback,
  HunterConfig,
  PlatformIntegration,
  PlatformIntegrationError,
} from '@/types/hunter';

interface RedditRSSItem {
  title: string;
  link: string;
  content: string;
  author: string;
  published: Date;
  id: string;
}

export class RedditHunter extends BaseHunter {
  platform: PlatformType = 'reddit';
  private readonly REDDIT_SEARCH_RSS = 'https://www.reddit.com/search.rss';
  private readonly REDDIT_SUBREDDIT_RSS = 'https://www.reddit.com/r';

  /**
   * Parse Reddit RSS feed (XML) to extract items
   */
  private parseRSS(xml: string): RedditRSSItem[] {
    const items: RedditRSSItem[] = [];

    // Simple RSS parsing using regex (Reddit RSS is well-structured)
    const entryRegex = /<entry>(.*?)<\/entry>/gs;
    const entries = xml.match(entryRegex) || [];

    for (const entry of entries) {
      try {
        const title = entry.match(/<title>(.*?)<\/title>/s)?.[1]?.trim() || '';
        const link = entry.match(/<link href="(.*?)"/)?.[ 1] || '';
        const contentMatch = entry.match(/<content type="html">(.*?)<\/content>/s);
        const content = contentMatch?.[1] ? this.decodeHTML(contentMatch[1]) : '';
        const author = entry.match(/<author><name>(.*?)<\/name><\/author>/)?.[1] || '';
        const published = entry.match(/<published>(.*?)<\/published>/)?.[1] || '';
        const id = entry.match(/<id>(.*?)<\/id>/)?.[1]?.split('/').pop() || '';

        if (title && link && id) {
          items.push({
            title: this.decodeHTML(title),
            link,
            content,
            author,
            published: new Date(published),
            id,
          });
        }
      } catch (error) {
        console.error('[Reddit RSS] Error parsing entry:', error);
      }
    }

    return items;
  }

  /**
   * Decode HTML entities in RSS content
   */
  private decodeHTML(html: string): string {
    return html
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]*>/g, '') // Strip HTML tags
      .trim();
  }

  /**
   * Hunt for feedback on Reddit using RSS feeds
   * No authentication required!
   */
  async hunt(
    config: HunterConfig,
    integration: PlatformIntegration
  ): Promise<RawFeedback[]> {
    try {

      // Build search queries
      const queries = [
        config.company_name,
        ...config.name_variations,
        ...config.keywords,
      ].filter(Boolean);

      const results: RawFeedback[] = [];
      const seenIds = new Set<string>();

      // Search Reddit-wide for mentions using RSS feeds
      for (const query of queries) {
        // Skip if excluded
        if (this.containsExcludedKeywords(query, config.excluded_keywords)) {
          continue;
        }

        try {
          // Search posts using Reddit's RSS feed (no auth required!)
          const searchUrl = `${this.REDDIT_SEARCH_RSS}?q=${encodeURIComponent(query)}&sort=new&limit=100`;

          const response = await fetch(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; SignalsLoop/1.0; +https://signalsloop.com)',
              'Accept': 'application/rss+xml, application/xml, text/xml',
            },
          });

          if (!response.ok) {
            console.error(`[Reddit RSS] Search returned ${response.status} for query: ${query}`);
            continue;
          }

          const xml = await response.text();
          const items = this.parseRSS(xml);

          for (const item of items) {
            if (seenIds.has(item.id)) continue;

            // Check if content is relevant
            const fullContent = `${item.title} ${item.content}`;
            if (this.containsExcludedKeywords(fullContent, config.excluded_keywords)) {
              continue;
            }

            // Filter to last 24 hours
            const age = Date.now() - item.published.getTime();
            if (age > 24 * 60 * 60 * 1000) continue;

            seenIds.add(item.id);

            results.push({
              content: this.sanitizeText(`${item.title}\n\n${item.content}`),
              title: item.title,
              platform: 'reddit',
              platform_id: item.id,
              platform_url: item.link,
              author_username: item.author || 'Unknown',
              author_profile_url: item.author ? `https://reddit.com/user/${item.author}` : undefined,
              discovered_at: item.published,
              engagement_metrics: {
                upvotes: 0, // RSS doesn't include vote counts
                score: 0,
                comments: 0,
              },
            });
          }

          // Rate limit: 2 seconds between requests (RSS is more lenient)
          await this.delay(2000);
        } catch (error) {
          console.error(`[Reddit RSS] Error searching for "${query}":`, error);
        }
      }

      // Search specific subreddits if configured
      if (integration.config.subreddits?.length) {
        for (const subreddit of integration.config.subreddits) {
          try {
            // Fetch new posts from subreddit using RSS (no auth required!)
            const subredditRssUrl = `${this.REDDIT_SUBREDDIT_RSS}/${subreddit}/new/.rss?limit=50`;

            const response = await fetch(subredditRssUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SignalsLoop/1.0; +https://signalsloop.com)',
                'Accept': 'application/rss+xml, application/xml, text/xml',
              },
            });

            if (!response.ok) {
              console.error(`[Reddit RSS] r/${subreddit} returned ${response.status}`);
              continue;
            }

            const xml = await response.text();
            const items = this.parseRSS(xml);

            for (const item of items) {
              if (seenIds.has(item.id)) continue;

              // Filter to last 24 hours
              const age = Date.now() - item.published.getTime();
              if (age > 24 * 60 * 60 * 1000) continue;

              // Check if post contains any of our keywords
              const fullContent = `${item.title} ${item.content}`;
              if (!this.extractKeywords(fullContent, queries)) {
                continue;
              }

              if (this.containsExcludedKeywords(fullContent, config.excluded_keywords)) {
                continue;
              }

              seenIds.add(item.id);

              results.push({
                content: this.sanitizeText(`${item.title}\n\n${item.content}`),
                title: item.title,
                platform: 'reddit',
                platform_id: item.id,
                platform_url: item.link,
                author_username: item.author || 'Unknown',
                author_profile_url: item.author ? `https://reddit.com/user/${item.author}` : undefined,
                discovered_at: item.published,
                engagement_metrics: {
                  upvotes: 0,
                  score: 0,
                  comments: 0,
                },
              });
            }

            await this.delay(2000);
          } catch (error) {
            console.error(
              `[Reddit RSS] Error fetching from r/${subreddit}:`,
              error
            );
          }
        }
      }

      console.log(`[Reddit] Found ${results.length} items`);
      return results;
    } catch (error) {
      console.error('[Reddit] Hunt error:', error);
      throw new PlatformIntegrationError(
        `Reddit hunt failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'reddit',
        error
      );
    }
  }
}
