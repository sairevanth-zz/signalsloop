/**
 * Twitter/X Hunter
 * Discovers feedback from Twitter/X using the Twitter API v2
 */

import { BaseHunter } from './base-hunter';
import {
  PlatformType,
  RawFeedback,
  HunterConfig,
  PlatformIntegration,
  PlatformIntegrationError,
} from '@/types/hunter';

interface Tweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
}

interface TwitterUser {
  id: string;
  username: string;
  verified?: boolean;
  public_metrics?: {
    followers_count: number;
  };
}

interface TwitterResponse {
  data?: Tweet[];
  includes?: {
    users?: TwitterUser[];
  };
  meta?: {
    result_count: number;
    next_token?: string;
  };
}

export class TwitterHunter extends BaseHunter {
  platform: PlatformType = 'twitter';
  private readonly TWITTER_API_URL = 'https://api.twitter.com/2/tweets/search/recent';

  /**
   * Hunt for feedback on Twitter
   */
  async hunt(
    config: HunterConfig,
    integration: PlatformIntegration
  ): Promise<RawFeedback[]> {
    try {
      // Use centralized API credentials from environment variables
      const bearerToken = process.env.TWITTER_BEARER_TOKEN;

      if (!bearerToken) {
        throw new PlatformIntegrationError(
          'Missing Twitter API bearer token in environment variables. Please configure TWITTER_BEARER_TOKEN.',
          'twitter',
          { integration_id: integration.id }
        );
      }

      // Build search queries
      const searchTerms = [
        config.company_name,
        ...config.name_variations,
        ...(integration.config.twitter_search_terms || []),
        ...config.keywords,
      ].filter(Boolean);

      // Also search for specific usernames if configured
      const usernames = integration.config.twitter_usernames || [];

      const results: RawFeedback[] = [];
      const seenIds = new Set<string>();

      // Search for mentions
      for (const term of searchTerms) {
        // Skip if excluded
        if (this.containsExcludedKeywords(term, config.excluded_keywords)) {
          continue;
        }

        try {
          const tweets = await this.searchTweets(
            term,
            bearerToken,
            config.excluded_keywords
          );

          for (const tweet of tweets) {
            if (seenIds.has(tweet.id)) continue;

            seenIds.add(tweet.id);
            results.push(tweet);
          }

          // Rate limit: wait between searches
          await this.delay(2000);
        } catch (error) {
          console.error(`[Twitter] Error searching for "${term}":`, error);
        }
      }

      // Search for tweets from specific usernames
      for (const username of usernames) {
        try {
          const tweets = await this.searchTweets(
            `from:${username}`,
            bearerToken,
            config.excluded_keywords
          );

          for (const tweet of tweets) {
            if (seenIds.has(tweet.id)) continue;

            seenIds.add(tweet.id);
            results.push(tweet);
          }

          await this.delay(2000);
        } catch (error) {
          console.error(`[Twitter] Error searching for @${username}:`, error);
        }
      }

      console.log(`[Twitter] Found ${results.length} items`);
      return results;
    } catch (error) {
      console.error('[Twitter] Hunt error:', error);
      throw new PlatformIntegrationError(
        `Twitter hunt failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'twitter',
        error
      );
    }
  }

  /**
   * Search Twitter API
   */
  private async searchTweets(
    query: string,
    bearerToken: string,
    excludedKeywords: string[]
  ): Promise<RawFeedback[]> {
    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const params = new URLSearchParams({
      query: `${query} -is:retweet`, // Exclude retweets
      'tweet.fields': 'created_at,public_metrics,author_id',
      'user.fields': 'username,verified,public_metrics',
      expansions: 'author_id',
      max_results: '100',
      start_time: startTime,
    });

    const response = await fetch(`${this.TWITTER_API_URL}?${params}`, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twitter API error: ${response.statusText} - ${error}`);
    }

    const data: TwitterResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      return [];
    }

    // Build user map
    const userMap = new Map<string, TwitterUser>();
    if (data.includes?.users) {
      for (const user of data.includes.users) {
        userMap.set(user.id, user);
      }
    }

    const results: RawFeedback[] = [];

    for (const tweet of data.data) {
      // Check for excluded keywords
      if (this.containsExcludedKeywords(tweet.text, excludedKeywords)) {
        continue;
      }

      const author = userMap.get(tweet.author_id);
      const username = author?.username || 'unknown';

      results.push({
        content: this.sanitizeText(tweet.text),
        platform: 'twitter',
        platform_id: tweet.id,
        platform_url: `https://twitter.com/${username}/status/${tweet.id}`,
        author_username: username,
        author_profile_url: `https://twitter.com/${username}`,
        author_metadata: author
          ? {
              verified: author.verified,
              follower_count: author.public_metrics?.followers_count,
            }
          : undefined,
        discovered_at: new Date(tweet.created_at),
        engagement_metrics: {
          likes: tweet.public_metrics.like_count,
          retweets: tweet.public_metrics.retweet_count,
          replies: tweet.public_metrics.reply_count,
          shares: tweet.public_metrics.quote_count,
        },
      });
    }

    return results;
  }
}
