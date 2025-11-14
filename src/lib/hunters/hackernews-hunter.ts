/**
 * Hacker News Hunter
 * Discovers feedback from Hacker News using the Algolia API
 */

import { BaseHunter } from './base-hunter';
import {
  PlatformType,
  RawFeedback,
  HunterConfig,
  PlatformIntegration,
  PlatformIntegrationError,
} from '@/types/hunter';

interface AlgoliaHit {
  objectID: string;
  created_at: string;
  author: string;
  title?: string;
  story_title?: string;
  comment_text?: string;
  story_text?: string;
  url?: string;
  story_url?: string;
  points?: number;
  num_comments?: number;
  _tags: string[];
}

interface AlgoliaResponse {
  hits: AlgoliaHit[];
  nbHits: number;
}

export class HackerNewsHunter extends BaseHunter {
  platform: PlatformType = 'hackernews';
  private readonly ALGOLIA_API_URL = 'https://hn.algolia.com/api/v1/search';
  private readonly ALGOLIA_API_URL_DATE = 'https://hn.algolia.com/api/v1/search_by_date';

  /**
   * Hunt for feedback on Hacker News
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
        ...(integration.config.hn_keywords || []),
        ...config.keywords,
      ].filter(Boolean);

      const results: RawFeedback[] = [];
      const seenIds = new Set<string>();

      // Get Unix timestamp for 24 hours ago
      const oneDayAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);

      for (const query of queries) {
        // Skip if excluded
        if (this.containsExcludedKeywords(query, config.excluded_keywords)) {
          continue;
        }

        try {
          // Search stories
          const storyData = await this.searchAlgolia(query, 'story', oneDayAgo);
          for (const hit of storyData.hits) {
            if (seenIds.has(hit.objectID)) continue;

            const content = hit.story_text || hit.title || '';
            if (!content || this.containsExcludedKeywords(content, config.excluded_keywords)) {
              continue;
            }

            seenIds.add(hit.objectID);

            results.push({
              content: this.sanitizeText(content),
              title: hit.title,
              platform: 'hackernews',
              platform_id: hit.objectID,
              platform_url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
              author_username: hit.author,
              author_profile_url: `https://news.ycombinator.com/user?id=${hit.author}`,
              discovered_at: new Date(hit.created_at),
              engagement_metrics: {
                points: hit.points || 0,
                comments: hit.num_comments || 0,
              },
            });
          }

          // Search comments
          const commentData = await this.searchAlgolia(query, 'comment', oneDayAgo);
          for (const hit of commentData.hits) {
            if (seenIds.has(hit.objectID)) continue;

            const content = hit.comment_text || '';
            if (!content || this.containsExcludedKeywords(content, config.excluded_keywords)) {
              continue;
            }

            seenIds.add(hit.objectID);

            results.push({
              content: this.sanitizeText(content),
              title: hit.story_title,
              platform: 'hackernews',
              platform_id: hit.objectID,
              platform_url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
              author_username: hit.author,
              author_profile_url: `https://news.ycombinator.com/user?id=${hit.author}`,
              discovered_at: new Date(hit.created_at),
              engagement_metrics: {
                points: hit.points || 0,
              },
            });
          }

          // Small delay between queries
          await this.delay(500);
        } catch (error) {
          console.error(`[HN] Error searching for "${query}":`, error);
        }
      }

      console.log(`[HackerNews] Found ${results.length} items`);
      return results;
    } catch (error) {
      console.error('[HackerNews] Hunt error:', error);
      throw new PlatformIntegrationError(
        `Hacker News hunt failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'hackernews',
        error
      );
    }
  }

  /**
   * Search Algolia HN API
   */
  private async searchAlgolia(
    query: string,
    tags: string,
    since: number
  ): Promise<AlgoliaResponse> {
    const params = new URLSearchParams({
      query,
      tags,
      numericFilters: `created_at_i>${since}`,
      hitsPerPage: '100',
    });

    const response = await fetch(`${this.ALGOLIA_API_URL_DATE}?${params}`);

    if (!response.ok) {
      throw new Error(`Algolia API error: ${response.statusText}`);
    }

    return response.json();
  }
}
