/**
 * Slack Syncer
 * Fetches messages from configured Slack channels
 */

import { BaseSyncer } from '../base-syncer';
import { IntegrationType, FeedbackIntegration, RawFeedbackItem } from '../types';

interface SlackMessage {
  type: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  reply_count?: number;
  reactions?: Array<{
    name: string;
    count: number;
  }>;
}

interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  profile?: {
    email?: string;
    display_name?: string;
    image_72?: string;
    title?: string;
  };
}

export class SlackSyncer extends BaseSyncer {
  integrationType: IntegrationType = 'slack';
  
  private baseUrl = 'https://slack.com/api';
  
  async fetchFeedback(integration: FeedbackIntegration): Promise<RawFeedbackItem[]> {
    const accessToken = integration.credentials.accessToken;
    if (!accessToken) {
      throw new Error('Slack access token not configured');
    }
    
    const items: RawFeedbackItem[] = [];
    const channels = integration.config.channels || [];
    const keywords = integration.config.keywords || [];
    
    // Cache users for efficiency
    const userCache = new Map<string, SlackUser>();
    
    for (const channelId of channels) {
      const messages = await this.fetchChannelMessages(
        accessToken,
        channelId,
        integration.lastSyncAt
      );
      
      for (const message of messages) {
        // Skip bot messages and system messages
        if (!message.user || message.type !== 'message') {
          continue;
        }
        
        // Filter by keywords if configured
        if (keywords.length > 0) {
          const hasKeyword = keywords.some(kw => 
            message.text.toLowerCase().includes(kw.toLowerCase())
          );
          if (!hasKeyword) continue;
        }
        
        // Get user details
        let user = userCache.get(message.user);
        if (!user) {
          user = await this.fetchUser(accessToken, message.user);
          if (user) userCache.set(message.user, user);
        }
        
        // Get channel info for URL
        const channelInfo = await this.fetchChannelInfo(accessToken, channelId);
        
        const item: RawFeedbackItem = {
          sourceType: 'slack',
          sourceId: message.ts,
          sourceUrl: channelInfo?.name 
            ? `slack://channel?id=${channelId}&message=${message.ts}`
            : undefined,
          sourceChannel: channelInfo?.name || channelId,
          sourceThreadId: message.thread_ts,
          
          content: message.text,
          
          authorId: message.user,
          authorName: user?.real_name || user?.name,
          authorEmail: user?.profile?.email,
          authorUsername: user?.name,
          authorAvatarUrl: user?.profile?.image_72,
          authorMetadata: {
            title: user?.profile?.title,
          },
          
          engagementMetrics: {
            replies: message.reply_count || 0,
            likes: this.countReactions(message.reactions),
          },
          
          originalCreatedAt: new Date(parseFloat(message.ts) * 1000),
        };
        
        items.push(item);
      }
      
      // Rate limiting
      await this.delay(1000);
    }
    
    return items;
  }
  
  private async fetchChannelMessages(
    accessToken: string,
    channelId: string,
    since?: Date
  ): Promise<SlackMessage[]> {
    const params: Record<string, string> = {
      channel: channelId,
      limit: '100',
    };
    
    if (since) {
      params.oldest = String(since.getTime() / 1000);
    }
    
    const response = await fetch(
      `${this.baseUrl}/conversations.history?${new URLSearchParams(params)}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }
    
    return data.messages || [];
  }
  
  private async fetchUser(accessToken: string, userId: string): Promise<SlackUser | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/users.info?user=${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      
      const data = await response.json();
      return data.ok ? data.user : null;
    } catch {
      return null;
    }
  }
  
  private async fetchChannelInfo(
    accessToken: string, 
    channelId: string
  ): Promise<{ name?: string } | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/conversations.info?channel=${channelId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      
      const data = await response.json();
      return data.ok ? { name: data.channel?.name } : null;
    } catch {
      return null;
    }
  }
  
  private countReactions(reactions?: SlackMessage['reactions']): number {
    if (!reactions) return 0;
    return reactions.reduce((sum, r) => sum + r.count, 0);
  }
}
