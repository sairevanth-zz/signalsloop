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
        const link = entry.match(/<link href="(.*?)"/)?.[1] || '';
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

      // Build TARGETED search queries - focus on product-specific feedback
      // Experience-based queries have highest signal
      const productName = config.company_name;

      // Priority 1: Experience-based (highest signal)
      const experienceQueries = [
        `"using ${productName}"`,
        `"tried ${productName}"`,
        `"switched to ${productName}"`,
        `"${productName} is"`,
      ];

      // Priority 2: Problem-based
      const problemQueries = [
        `"${productName}" problem`,
        `"${productName}" issue`,
        `"${productName}" bug`,
      ];

      // Priority 3: Comparison with top 2 competitors
      const competitorQueries = config.competitors.slice(0, 2).map(comp =>
        `"${productName}" "${comp}"`
      );

      // Priority 4: Name variations (misspellings, nicknames)
      const variationQueries = config.name_variations.map(v => `"${v}"`);

      // Combine and limit to avoid too many requests
      const allQueries = [
        ...experienceQueries,
        ...problemQueries,
        ...competitorQueries,
        ...variationQueries
      ].slice(0, 5); // Limit to 5 queries to avoid timeout

      const results: RawFeedback[] = [];
      const seenIds = new Set<string>();

      // Search Reddit-wide for mentions using RSS feeds
      for (const query of allQueries) {
        // Skip if excluded
        if (this.containsExcludedKeywords(query, config.excluded_keywords)) {
          continue;
        }

        try {
          // Search posts using Reddit's RSS feed (no auth required!)
          const searchUrl = `${this.REDDIT_SEARCH_RSS}?q=${encodeURIComponent(query)}&sort=new&limit=50`;

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

            // Filter out job postings
            const jobIndicators = [
              'hiring', 'job', 'remote job', 'job opening', 'job posting',
              'we\'re hiring', 'looking for', 'position available', 'job opportunity',
              'career', 'vacancy', 'recruiting', 'apply now', 'open position',
              'lead data scientist', 'senior engineer', 'frontend developer',
              'backend developer', 'full stack', 'part-time', 'full-time',
              'salary', '$k', 'per year', 'per hour', 'benefits'
            ];
            const lowerTitle = item.title.toLowerCase();
            const lowerContent = item.content.toLowerCase();
            const isJobPosting = jobIndicators.some(indicator =>
              lowerTitle.includes(indicator) || lowerContent.includes(indicator)
            );
            if (isJobPosting) continue;

            // Filter out generic AI discussions that aren't product feedback
            const irrelevantIndicators = [
              'accused of using ai', 'using ai to cheat', 'ai plagiarism', 'academic integrity',
              'ai detection', 'turnitin', 'gptzero', 'caught using ai', 'ai in school',
              'ai in education', 'ai ethics debate', 'ai will destroy', 'ai will take over',
              'ai vs human', 'is ai art', 'ai generated art', 'ai replacing',
              'ai consciousness', 'sentient ai', 'agi when', 'superintelligence',
              'the multi-agent', 'daily news rundown', 'news roundup', 'ai news',
              'yu-gi-oh', 'yugioh', 'pokemon', 'trading card', 'magic the gathering',
              'knife', 'blade', 'gyuto', 'whetstone', 'sharpening'
            ];
            const isIrrelevant = irrelevantIndicators.some(indicator =>
              lowerTitle.includes(indicator) || lowerContent.includes(indicator)
            );
            if (isIrrelevant) continue;

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

          // Rate limit: 500ms between requests (fast but still polite)
          await this.delay(500);
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
              if (!this.extractKeywords(fullContent, allQueries)) {
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

            await this.delay(500);
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
