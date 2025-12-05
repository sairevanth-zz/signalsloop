/**
 * Twitter/X Syncer
 * Fetches mentions and keyword matches from Twitter
 */

import { BaseSyncer } from '../base-syncer';
import { IntegrationType, FeedbackIntegration, RawFeedbackItem } from '../types';

interface Tweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count?: number;
  };
  conversation_id?: string;
  in_reply_to_user_id?: string;
}

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  verified?: boolean;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
}

export class TwitterSyncer extends BaseSyncer {
  integrationType: IntegrationType = 'twitter';
  
  private baseUrl = 'https://api.twitter.com/2';
  
  async fetchFeedback(integration: FeedbackIntegration): Promise<RawFeedbackItem[]> {
    const bearerToken = integration.credentials.accessToken;
    if (!bearerToken) {
      throw new Error('Twitter bearer token not configured');
    }
    
    const items: RawFeedbackItem[] = [];
    const keywords = integration.config.keywords || [];
    
    if (keywords.length === 0) {
      console.warn('[Twitter] No keywords configured');
      return [];
    }
    
    // Build search query
    const query = keywords.map(kw => `"${kw}"`).join(' OR ');
    
    // Search recent tweets
    const { tweets, users } = await this.searchTweets(bearerToken, query, integration.lastSyncAt);
    
    // Create user lookup map
    const userMap = new Map(users.map(u => [u.id, u]));
    
    for (const tweet of tweets) {
      const user = userMap.get(tweet.author_id);
      
      const item: RawFeedbackItem = {
        sourceType: 'twitter',
        sourceId: tweet.id,
        sourceUrl: `https://twitter.com/${user?.username}/status/${tweet.id}`,
        sourceThreadId: tweet.conversation_id,
        
        content: tweet.text,
        
        authorId: tweet.author_id,
        authorName: user?.name,
        authorUsername: user?.username,
        authorAvatarUrl: user?.profile_image_url,
        authorMetadata: {
          verified: user?.verified,
          followerCount: user?.public_metrics?.followers_count,
          profileUrl: user ? `https://twitter.com/${user.username}` : undefined,
        },
        
        engagementMetrics: {
          likes: tweet.public_metrics?.like_count || 0,
          retweets: tweet.public_metrics?.retweet_count || 0,
          replies: tweet.public_metrics?.reply_count || 0,
          shares: tweet.public_metrics?.quote_count || 0,
          views: tweet.public_metrics?.impression_count || 0,
        },
        
        originalCreatedAt: new Date(tweet.created_at),
      };
      
      items.push(item);
    }
    
    return items;
  }
  
  private async searchTweets(
    bearerToken: string,
    query: string,
    since?: Date
  ): Promise<{ tweets: Tweet[]; users: TwitterUser[] }> {
    const params = new URLSearchParams({
      query: `${query} -is:retweet lang:en`,
      max_results: '100',
      'tweet.fields': 'author_id,created_at,public_metrics,conversation_id,in_reply_to_user_id',
      'user.fields': 'name,username,profile_image_url,verified,public_metrics',
      expansions: 'author_id',
    });
    
    if (since) {
      params.set('start_time', since.toISOString());
    }
    
    const response = await fetch(
      `${this.baseUrl}/tweets/search/recent?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
        },
      }
    );
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Twitter API error: ${response.status} - ${error.detail || response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      tweets: data.data || [],
      users: data.includes?.users || [],
    };
  }
}
