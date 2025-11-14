/**
 * Reddit Hunter
 * Discovers feedback from Reddit using the public JSON API
 * No authentication required - uses Reddit's public JSON endpoints
 */

import { BaseHunter } from './base-hunter';
import {
  PlatformType,
  RawFeedback,
  HunterConfig,
  PlatformIntegration,
  PlatformIntegrationError,
} from '@/types/hunter';

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  created_utc: number;
  permalink: string;
  ups: number;
  downs: number;
  score: number;
  num_comments: number;
  subreddit: string;
}

interface RedditComment {
  id: string;
  body: string;
  author: string;
  created_utc: number;
  permalink: string;
  ups: number;
  score: number;
}

interface RedditApiResponse {
  data: {
    children: Array<{
      data: RedditPost | RedditComment;
    }>;
  };
}

export class RedditHunter extends BaseHunter {
  platform: PlatformType = 'reddit';
  private readonly REDDIT_SEARCH_URL = 'https://www.reddit.com/search.json';
  private readonly REDDIT_SUBREDDIT_URL = 'https://www.reddit.com/r';

  /**
   * Hunt for feedback on Reddit using public JSON API
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

      // Search Reddit-wide for mentions using public JSON API
      for (const query of queries) {
        // Skip if excluded
        if (this.containsExcludedKeywords(query, config.excluded_keywords)) {
          continue;
        }

        try {
          // Search posts using Reddit's public JSON API
          const searchUrl = `${this.REDDIT_SEARCH_URL}?q=${encodeURIComponent(query)}&t=day&sort=new&limit=100`;

          const response = await fetch(searchUrl, {
            headers: {
              'User-Agent': 'SignalsLoop/1.0 (Feedback Hunter)',
            },
          });

          if (!response.ok) {
            console.error(`[Reddit] Search API returned ${response.status}`);
            continue;
          }

          const data: RedditApiResponse = await response.json();
          const posts = data.data.children.map(child => child.data) as RedditPost[];

          for (const post of posts) {
            if (seenIds.has(post.id)) continue;

            // Check if content is relevant
            const content = `${post.title} ${post.selftext || ''}`;
            if (this.containsExcludedKeywords(content, config.excluded_keywords)) {
              continue;
            }

            seenIds.add(post.id);

            results.push({
              content: this.sanitizeText(
                `${post.title}\n\n${post.selftext || ''}`
              ),
              title: post.title,
              platform: 'reddit',
              platform_id: post.id,
              platform_url: `https://reddit.com${post.permalink}`,
              author_username: post.author,
              author_profile_url: `https://reddit.com/user/${post.author}`,
              discovered_at: new Date(post.created_utc * 1000),
              engagement_metrics: {
                upvotes: post.ups,
                downvotes: post.downs || 0,
                score: post.score,
                comments: post.num_comments,
              },
            });
          }

          // Rate limit: 1 request per second (Reddit allows ~60/min)
          await this.delay(1000);
        } catch (error) {
          console.error(`[Reddit] Error searching for "${query}":`, error);
        }
      }

      // Search specific subreddits if configured
      if (integration.config.subreddits?.length) {
        for (const subreddit of integration.config.subreddits) {
          for (const query of queries) {
            try {
              // Search within specific subreddit using public JSON API
              const subredditSearchUrl = `${this.REDDIT_SUBREDDIT_URL}/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=on&t=day&sort=new&limit=50`;

              const response = await fetch(subredditSearchUrl, {
                headers: {
                  'User-Agent': 'SignalsLoop/1.0 (Feedback Hunter)',
                },
              });

              if (!response.ok) {
                console.error(`[Reddit] r/${subreddit} search returned ${response.status}`);
                continue;
              }

              const data: RedditApiResponse = await response.json();
              const posts = data.data.children.map(child => child.data) as RedditPost[];

              for (const post of posts) {
                if (seenIds.has(post.id)) continue;

                const content = `${post.title} ${post.selftext || ''}`;
                if (this.containsExcludedKeywords(content, config.excluded_keywords)) {
                  continue;
                }

                seenIds.add(post.id);

                results.push({
                  content: this.sanitizeText(
                    `${post.title}\n\n${post.selftext || ''}`
                  ),
                  title: post.title,
                  platform: 'reddit',
                  platform_id: post.id,
                  platform_url: `https://reddit.com${post.permalink}`,
                  author_username: post.author,
                  author_profile_url: `https://reddit.com/user/${post.author}`,
                  discovered_at: new Date(post.created_utc * 1000),
                  engagement_metrics: {
                    upvotes: post.ups,
                    downvotes: post.downs || 0,
                    score: post.score,
                    comments: post.num_comments,
                  },
                });
              }

              await this.delay(1000);
            } catch (error) {
              console.error(
                `[Reddit] Error searching r/${subreddit} for "${query}":`,
                error
              );
            }
          }
        }
      }

      // Fetch new posts from relevant subreddits to check for keyword mentions
      if (integration.config.subreddits?.length) {
        for (const subreddit of integration.config.subreddits) {
          try {
            const newPostsUrl = `${this.REDDIT_SUBREDDIT_URL}/${subreddit}/new.json?limit=25`;

            const response = await fetch(newPostsUrl, {
              headers: {
                'User-Agent': 'SignalsLoop/1.0 (Feedback Hunter)',
              },
            });

            if (!response.ok) continue;

            const data: RedditApiResponse = await response.json();
            const posts = data.data.children.map(child => child.data) as RedditPost[];

            for (const post of posts) {
              // Check if post is from the last 24 hours
              const postAge = Date.now() - post.created_utc * 1000;
              if (postAge > 24 * 60 * 60 * 1000) continue;

              if (seenIds.has(post.id)) continue;

              // Check if post contains any of our keywords
              const content = `${post.title} ${post.selftext || ''}`;
              if (!this.extractKeywords(content, queries)) {
                continue;
              }

              if (this.containsExcludedKeywords(content, config.excluded_keywords)) {
                continue;
              }

              seenIds.add(post.id);

              results.push({
                content: this.sanitizeText(content),
                title: post.title,
                platform: 'reddit',
                platform_id: post.id,
                platform_url: `https://reddit.com${post.permalink}`,
                author_username: post.author,
                author_profile_url: `https://reddit.com/user/${post.author}`,
                discovered_at: new Date(post.created_utc * 1000),
                engagement_metrics: {
                  upvotes: post.ups,
                  downvotes: post.downs || 0,
                  score: post.score,
                  comments: post.num_comments,
                },
              });
            }

            await this.delay(1000);
          } catch (error) {
            console.error(
              `[Reddit] Error fetching new posts from r/${subreddit}:`,
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
