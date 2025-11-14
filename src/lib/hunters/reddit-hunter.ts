/**
 * Reddit Hunter
 * Discovers feedback from Reddit using the Reddit API (snoowrap)
 */

import snoowrap from 'snoowrap';
import { BaseHunter } from './base-hunter';
import {
  PlatformType,
  RawFeedback,
  HunterConfig,
  PlatformIntegration,
  PlatformIntegrationError,
} from '@/types/hunter';

export class RedditHunter extends BaseHunter {
  platform: PlatformType = 'reddit';

  /**
   * Hunt for feedback on Reddit
   */
  async hunt(
    config: HunterConfig,
    integration: PlatformIntegration
  ): Promise<RawFeedback[]> {
    try {
      // Use centralized API credentials from environment variables
      const clientId = process.env.REDDIT_CLIENT_ID;
      const clientSecret = process.env.REDDIT_CLIENT_SECRET;
      const username = process.env.REDDIT_USERNAME;
      const password = process.env.REDDIT_PASSWORD;

      if (!clientId || !clientSecret || !username || !password) {
        throw new PlatformIntegrationError(
          'Missing Reddit API credentials in environment variables. Please configure REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, and REDDIT_PASSWORD.',
          'reddit',
          { integration_id: integration.id }
        );
      }

      // Initialize Reddit API client with centralized credentials
      const reddit = new snoowrap({
        userAgent: 'SignalsLoop/1.0 (Feedback Hunter)',
        clientId,
        clientSecret,
        username,
        password,
      });

      // Build search queries
      const queries = [
        config.company_name,
        ...config.name_variations,
        ...config.keywords,
      ].filter(Boolean);

      const results: RawFeedback[] = [];
      const seenIds = new Set<string>();

      // Search Reddit-wide for mentions
      for (const query of queries) {
        // Skip if excluded
        if (this.containsExcludedKeywords(query, config.excluded_keywords)) {
          continue;
        }

        try {
          // Search posts
          const posts = await reddit.search({
            query,
            time: 'day', // Last 24 hours
            sort: 'new',
            limit: 100,
          });

          for (const post of posts) {
            if (seenIds.has(post.id)) continue;

            // Check if content is relevant
            const content = `${post.title} ${post.selftext}`;
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
              author_username: post.author.name,
              author_profile_url: `https://reddit.com/user/${post.author.name}`,
              discovered_at: new Date(post.created_utc * 1000),
              engagement_metrics: {
                upvotes: post.ups,
                downvotes: post.downs,
                score: post.score,
                comments: post.num_comments,
              },
            });
          }

          // Small delay to respect rate limits
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
              const posts = await reddit
                .getSubreddit(subreddit)
                .search({
                  query,
                  time: 'day',
                  sort: 'new',
                  limit: 50,
                });

              for (const post of posts) {
                if (seenIds.has(post.id)) continue;

                const content = `${post.title} ${post.selftext}`;
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
                  author_username: post.author.name,
                  author_profile_url: `https://reddit.com/user/${post.author.name}`,
                  discovered_at: new Date(post.created_utc * 1000),
                  engagement_metrics: {
                    upvotes: post.ups,
                    downvotes: post.downs,
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

      // Also search top comments in relevant subreddits
      if (integration.config.subreddits?.length) {
        for (const subreddit of integration.config.subreddits) {
          try {
            const posts = await reddit
              .getSubreddit(subreddit)
              .getNew({ limit: 25 });

            for (const post of posts) {
              // Check if post is from the last 24 hours
              const postAge = Date.now() - post.created_utc * 1000;
              if (postAge > 24 * 60 * 60 * 1000) continue;

              // Expand comments
              await post.expandReplies({ limit: 50, depth: 2 });
              const comments = post.comments as any[];

              for (const comment of comments) {
                if (!comment.body || seenIds.has(comment.id)) continue;

                // Check if comment mentions our keywords
                if (
                  !this.extractKeywords(
                    comment.body,
                    queries
                  )
                ) {
                  continue;
                }

                if (this.containsExcludedKeywords(comment.body, config.excluded_keywords)) {
                  continue;
                }

                seenIds.add(comment.id);

                results.push({
                  content: this.sanitizeText(comment.body),
                  platform: 'reddit',
                  platform_id: comment.id,
                  platform_url: `https://reddit.com${comment.permalink}`,
                  author_username: comment.author.name,
                  author_profile_url: `https://reddit.com/user/${comment.author.name}`,
                  discovered_at: new Date(comment.created_utc * 1000),
                  engagement_metrics: {
                    upvotes: comment.ups,
                    downvotes: comment.downs,
                    score: comment.score,
                  },
                });
              }

              await this.delay(500);
            }
          } catch (error) {
            console.error(
              `[Reddit] Error fetching comments from r/${subreddit}:`,
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
