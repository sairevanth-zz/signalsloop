/**
 * Reddit Syncer
 * Fetches posts and comments from Reddit using public API
 */

import { BaseSyncer } from '../base-syncer';
import { IntegrationType, FeedbackIntegration, RawFeedbackItem } from '../types';

interface RedditPost {
  id: string;
  name: string;
  title: string;
  selftext: string;
  selftext_html?: string;
  author: string;
  subreddit: string;
  permalink: string;
  created_utc: number;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  url: string;
  is_self: boolean;
}

export class RedditSyncer extends BaseSyncer {
  integrationType: IntegrationType = 'reddit';
  
  private baseUrl = 'https://www.reddit.com';
  
  async fetchFeedback(integration: FeedbackIntegration): Promise<RawFeedbackItem[]> {
    const items: RawFeedbackItem[] = [];
    const keywords = integration.config.keywords || [];
    const subreddits = integration.config.channels || []; // Using channels for subreddits
    
    // Search by keywords across Reddit
    if (keywords.length > 0) {
      const searchItems = await this.searchPosts(keywords, integration.lastSyncAt);
      items.push(...searchItems);
    }
    
    // Also fetch from specific subreddits
    for (const subreddit of subreddits) {
      try {
        const subredditItems = await this.fetchSubredditPosts(subreddit, keywords, integration.lastSyncAt);
        items.push(...subredditItems);
        
        // Rate limiting
        await this.delay(1000);
      } catch (err) {
        console.error(`[Reddit] Error fetching r/${subreddit}:`, err);
      }
    }
    
    // Dedupe by source ID
    const uniqueItems = Array.from(
      new Map(items.map(item => [item.sourceId, item])).values()
    );
    
    return uniqueItems;
  }
  
  private async searchPosts(keywords: string[], since?: Date): Promise<RawFeedbackItem[]> {
    const query = keywords.join(' OR ');
    const params = new URLSearchParams({
      q: query,
      sort: 'new',
      limit: '100',
      t: 'week', // Last week
    });
    
    const response = await fetch(
      `${this.baseUrl}/search.json?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'SignalsLoop/1.0',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }
    
    const data = await response.json();
    const posts: RedditPost[] = data.data?.children?.map((c: any) => c.data) || [];
    
    return this.convertPosts(posts, since);
  }
  
  private async fetchSubredditPosts(
    subreddit: string,
    keywords: string[],
    since?: Date
  ): Promise<RawFeedbackItem[]> {
    const response = await fetch(
      `${this.baseUrl}/r/${subreddit}/new.json?limit=50`,
      {
        headers: {
          'User-Agent': 'SignalsLoop/1.0',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }
    
    const data = await response.json();
    let posts: RedditPost[] = data.data?.children?.map((c: any) => c.data) || [];
    
    // Filter by keywords if provided
    if (keywords.length > 0) {
      posts = posts.filter(post => {
        const text = `${post.title} ${post.selftext}`.toLowerCase();
        return keywords.some(kw => text.includes(kw.toLowerCase()));
      });
    }
    
    return this.convertPosts(posts, since);
  }
  
  private convertPosts(posts: RedditPost[], since?: Date): RawFeedbackItem[] {
    const items: RawFeedbackItem[] = [];
    
    for (const post of posts) {
      const createdAt = new Date(post.created_utc * 1000);
      
      // Skip if before last sync
      if (since && createdAt < since) {
        continue;
      }
      
      // Skip if no text content
      if (!post.selftext && !post.title) {
        continue;
      }
      
      const content = post.selftext 
        ? `${post.title}\n\n${post.selftext}`
        : post.title;
      
      const item: RawFeedbackItem = {
        sourceType: 'reddit',
        sourceId: post.id,
        sourceUrl: `https://www.reddit.com${post.permalink}`,
        sourceChannel: `r/${post.subreddit}`,
        
        title: post.title,
        content: content,
        contentHtml: post.selftext_html,
        
        authorUsername: post.author,
        authorMetadata: {
          profileUrl: `https://www.reddit.com/user/${post.author}`,
        },
        
        engagementMetrics: {
          upvotes: Math.max(0, post.score),
          comments: post.num_comments,
          score: post.score,
        },
        
        originalCreatedAt: createdAt,
        
        metadata: {
          upvoteRatio: post.upvote_ratio,
          subreddit: post.subreddit,
        },
      };
      
      items.push(item);
    }
    
    return items;
  }
}
