/**
 * Discord Syncer
 * Fetches messages from configured Discord channels
 */

import { BaseSyncer } from '../base-syncer';
import { IntegrationType, FeedbackIntegration, RawFeedbackItem } from '../types';

interface DiscordMessage {
  id: string;
  type: number;
  content: string;
  channel_id: string;
  author: {
    id: string;
    username: string;
    discriminator: string;
    avatar?: string;
    global_name?: string;
  };
  timestamp: string;
  edited_timestamp?: string;
  thread?: {
    id: string;
    name: string;
  };
  reactions?: Array<{
    emoji: { name: string };
    count: number;
  }>;
  message_reference?: {
    message_id: string;
    channel_id: string;
  };
}

export class DiscordSyncer extends BaseSyncer {
  integrationType: IntegrationType = 'discord';
  
  private baseUrl = 'https://discord.com/api/v10';
  
  async fetchFeedback(integration: FeedbackIntegration): Promise<RawFeedbackItem[]> {
    const botToken = integration.credentials.accessToken;
    if (!botToken) {
      throw new Error('Discord bot token not configured');
    }
    
    const items: RawFeedbackItem[] = [];
    const channels = integration.config.channels || [];
    const keywords = integration.config.keywords || [];
    
    for (const channelId of channels) {
      const messages = await this.fetchChannelMessages(botToken, channelId, integration.lastSyncAt);
      
      for (const message of messages) {
        // Skip bot messages
        if (message.author.id === integration.credentials.botId) {
          continue;
        }
        
        // Skip empty messages (embeds only, etc.)
        if (!message.content.trim()) {
          continue;
        }
        
        // Filter by keywords if configured
        if (keywords.length > 0) {
          const hasKeyword = keywords.some(kw =>
            message.content.toLowerCase().includes(kw.toLowerCase())
          );
          if (!hasKeyword) continue;
        }
        
        const avatarUrl = message.author.avatar
          ? `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png`
          : undefined;
        
        const item: RawFeedbackItem = {
          sourceType: 'discord',
          sourceId: message.id,
          sourceUrl: `https://discord.com/channels/${integration.credentials.guildId}/${channelId}/${message.id}`,
          sourceChannel: channelId,
          sourceThreadId: message.thread?.id,
          
          content: message.content,
          
          authorId: message.author.id,
          authorName: message.author.global_name || message.author.username,
          authorUsername: `${message.author.username}#${message.author.discriminator}`,
          authorAvatarUrl: avatarUrl,
          
          engagementMetrics: {
            likes: this.countReactions(message.reactions),
          },
          
          originalCreatedAt: new Date(message.timestamp),
        };
        
        items.push(item);
      }
      
      // Rate limiting
      await this.delay(500);
    }
    
    return items;
  }
  
  private async fetchChannelMessages(
    botToken: string,
    channelId: string,
    since?: Date
  ): Promise<DiscordMessage[]> {
    const params = new URLSearchParams({
      limit: '100',
    });
    
    if (since) {
      // Discord uses snowflake IDs which encode timestamps
      const snowflake = this.dateToSnowflake(since);
      params.set('after', snowflake);
    }
    
    const response = await fetch(
      `${this.baseUrl}/channels/${channelId}/messages?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bot ${botToken}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  private dateToSnowflake(date: Date): string {
    // Discord epoch is 2015-01-01T00:00:00.000Z
    const DISCORD_EPOCH = 1420070400000n;
    const timestamp = BigInt(date.getTime()) - DISCORD_EPOCH;
    const snowflake = timestamp << 22n;
    return snowflake.toString();
  }
  
  private countReactions(reactions?: DiscordMessage['reactions']): number {
    if (!reactions) return 0;
    return reactions.reduce((sum, r) => sum + r.count, 0);
  }
}
