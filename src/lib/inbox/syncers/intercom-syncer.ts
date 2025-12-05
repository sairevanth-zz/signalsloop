/**
 * Intercom Syncer
 * Fetches conversations and messages from Intercom
 */

import { BaseSyncer } from '../base-syncer';
import { IntegrationType, FeedbackIntegration, RawFeedbackItem } from '../types';

interface IntercomConversation {
  id: string;
  type: string;
  created_at: number;
  updated_at: number;
  source: {
    type: string;
    id: string;
    delivered_as: string;
    subject?: string;
    body: string;
    author: {
      type: string;
      id: string;
      name?: string;
      email?: string;
    };
    url?: string;
  };
  contacts: {
    type: string;
    contacts: Array<{
      id: string;
      type: string;
      external_id?: string;
    }>;
  };
  conversation_rating?: {
    rating: number;
    remark?: string;
  };
  tags?: {
    type: string;
    tags: Array<{ id: string; name: string }>;
  };
  state: string;
  open: boolean;
  read: boolean;
  priority: string;
}

interface IntercomContact {
  id: string;
  type: string;
  external_id?: string;
  email?: string;
  name?: string;
  avatar?: {
    image_url?: string;
  };
  location?: {
    country?: string;
    city?: string;
  };
  companies?: {
    data: Array<{
      id: string;
      name: string;
    }>;
  };
}

export class IntercomSyncer extends BaseSyncer {
  integrationType: IntegrationType = 'intercom';
  
  private baseUrl = 'https://api.intercom.io';
  
  async fetchFeedback(integration: FeedbackIntegration): Promise<RawFeedbackItem[]> {
    const accessToken = integration.credentials.accessToken;
    if (!accessToken) {
      throw new Error('Intercom access token not configured');
    }
    
    const items: RawFeedbackItem[] = [];
    
    // Fetch recent conversations
    const conversations = await this.fetchConversations(accessToken, integration.lastSyncAt);
    
    for (const conversation of conversations) {
      // Get contact details
      const contact = await this.fetchContact(
        accessToken,
        conversation.contacts.contacts[0]?.id
      );
      
      // Convert to raw feedback item
      const item: RawFeedbackItem = {
        sourceType: 'intercom',
        sourceId: conversation.id,
        sourceUrl: `https://app.intercom.com/a/inbox/conversation/${conversation.id}`,
        sourceChannel: conversation.source.type,
        
        title: conversation.source.subject,
        content: this.cleanHtml(conversation.source.body),
        contentHtml: conversation.source.body,
        
        authorId: contact?.id,
        authorName: contact?.name || conversation.source.author.name,
        authorEmail: contact?.email || conversation.source.author.email,
        authorAvatarUrl: contact?.avatar?.image_url,
        authorMetadata: {
          company: contact?.companies?.data[0]?.name,
          location: contact?.location?.country,
        },
        
        engagementMetrics: conversation.conversation_rating ? {
          score: conversation.conversation_rating.rating,
        } : undefined,
        
        originalCreatedAt: new Date(conversation.created_at * 1000),
        
        metadata: {
          state: conversation.state,
          priority: conversation.priority,
          tags: conversation.tags?.tags.map(t => t.name) || [],
          rating: conversation.conversation_rating,
        },
      };
      
      items.push(item);
      
      // Rate limiting
      await this.delay(100);
    }
    
    return items;
  }
  
  private async fetchConversations(
    accessToken: string,
    since?: Date
  ): Promise<IntercomConversation[]> {
    const conversations: IntercomConversation[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;
    
    while (hasMore) {
      const params = new URLSearchParams({
        per_page: '50',
        order: 'desc',
        sort_field: 'updated_at',
      });
      
      if (since) {
        params.set('updated_since', String(Math.floor(since.getTime() / 1000)));
      }
      
      if (startingAfter) {
        params.set('starting_after', startingAfter);
      }
      
      const response = await fetch(
        `${this.baseUrl}/conversations?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Intercom-Version': '2.10',
            'Accept': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`Intercom API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Only include conversations initiated by users (not admin/bot)
      const userConversations = data.conversations.filter(
        (c: IntercomConversation) => c.source.author.type === 'user' || c.source.author.type === 'lead'
      );
      
      conversations.push(...userConversations);
      
      // Check if more pages
      hasMore = data.pages?.next !== null;
      startingAfter = data.pages?.next?.starting_after;
      
      // Limit to 200 conversations per sync
      if (conversations.length >= 200) {
        break;
      }
    }
    
    return conversations;
  }
  
  private async fetchContact(
    accessToken: string,
    contactId?: string
  ): Promise<IntercomContact | null> {
    if (!contactId) return null;
    
    try {
      const response = await fetch(
        `${this.baseUrl}/contacts/${contactId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Intercom-Version': '2.10',
            'Accept': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch {
      return null;
    }
  }
  
  private cleanHtml(html: string): string {
    if (!html) return '';
    
    // Remove HTML tags but preserve newlines
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
