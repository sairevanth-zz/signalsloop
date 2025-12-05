/**
 * Hacker News Syncer
 * Fetches feedback from Hacker News using the free Algolia API
 * No authentication required!
 */

import { BaseSyncer } from '../base-syncer';
import { IntegrationType, FeedbackIntegration, RawFeedbackItem } from '../types';

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

export class HackerNewsSyncer extends BaseSyncer {
  integrationType: IntegrationType = 'hackernews';
  
  private readonly ALGOLIA_API_URL = 'https://hn.algolia.com/api/v1/search_by_date';
  
  async fetchFeedback(integration: FeedbackIntegration): Promise<RawFeedbackItem[]> {
    const keywords = integration.config.keywords || [];
    
    if (keywords.length === 0) {
      console.log('[HackerNews] No keywords configured, skipping');
      return [];
    }
    
    const items: RawFeedbackItem[] = [];
    const seenIds = new Set<string>();
    
    // Get Unix timestamp for since last sync or 24 hours ago
    const sinceDate = integration.lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sinceTimestamp = Math.floor(sinceDate.getTime() / 1000);
    
    for (const keyword of keywords) {
      try {
        // Search stories
        const storyResults = await this.searchAlgolia(keyword, 'story', sinceTimestamp);
        for (const hit of storyResults.hits) {
          if (seenIds.has(hit.objectID)) continue;
          seenIds.add(hit.objectID);
          
          const content = hit.story_text || hit.title || '';
          if (!content) continue;
          
          items.push(this.convertHit(hit, 'story'));
        }
        
        // Search comments
        const commentResults = await this.searchAlgolia(keyword, 'comment', sinceTimestamp);
        for (const hit of commentResults.hits) {
          if (seenIds.has(hit.objectID)) continue;
          seenIds.add(hit.objectID);
          
          const content = hit.comment_text || '';
          if (!content) continue;
          
          items.push(this.convertHit(hit, 'comment'));
        }
        
        // Rate limiting - 500ms between queries
        await this.delay(500);
      } catch (err) {
        console.error(`[HackerNews] Error searching for "${keyword}":`, err);
      }
    }
    
    console.log(`[HackerNews] Found ${items.length} items`);
    return items;
  }
  
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
    
    const response = await fetch(`${this.ALGOLIA_API_URL}?${params}`, {
      headers: {
        'User-Agent': 'SignalsLoop/1.0',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Algolia API error: ${response.status}`);
    }
    
    return response.json();
  }
  
  private convertHit(hit: AlgoliaHit, type: 'story' | 'comment'): RawFeedbackItem {
    const content = type === 'story' 
      ? (hit.story_text || hit.title || '')
      : (hit.comment_text || '');
    
    return {
      sourceType: 'hackernews',
      sourceId: hit.objectID,
      sourceUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      sourceChannel: type,
      
      title: hit.title || hit.story_title,
      content: this.stripHtml(content),
      
      authorUsername: hit.author,
      authorMetadata: {
        profileUrl: `https://news.ycombinator.com/user?id=${hit.author}`,
      },
      
      engagementMetrics: {
        likes: hit.points || 0,
        comments: hit.num_comments || 0,
      },
      
      originalCreatedAt: new Date(hit.created_at),
      
      metadata: {
        type,
        points: hit.points,
        numComments: hit.num_comments,
        storyUrl: hit.story_url || hit.url,
      },
    };
  }
  
  private stripHtml(text: string): string {
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#39;/g, "'")
      .trim();
  }
}
