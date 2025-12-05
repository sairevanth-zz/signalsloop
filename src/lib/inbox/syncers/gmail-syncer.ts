/**
 * Gmail Syncer
 * Fetches emails from Gmail using Google API
 */

import { BaseSyncer } from '../base-syncer';
import { IntegrationType, FeedbackIntegration, RawFeedbackItem } from '../types';

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{
      name: string;
      value: string;
    }>;
    body?: {
      data?: string;
    };
    parts?: Array<{
      mimeType: string;
      body?: {
        data?: string;
      };
    }>;
  };
  internalDate: string;
}

export class GmailSyncer extends BaseSyncer {
  integrationType: IntegrationType = 'email_gmail';
  
  private baseUrl = 'https://gmail.googleapis.com/gmail/v1';
  
  async fetchFeedback(integration: FeedbackIntegration): Promise<RawFeedbackItem[]> {
    let accessToken = integration.credentials.accessToken;
    const refreshToken = integration.credentials.refreshToken;
    
    if (!accessToken && !refreshToken) {
      throw new Error('Gmail credentials not configured');
    }
    
    // Refresh access token if we have a refresh token
    if (refreshToken) {
      accessToken = await this.refreshAccessToken(refreshToken);
    }
    
    const items: RawFeedbackItem[] = [];
    
    // Build query
    const query = this.buildQuery(integration);
    
    // Fetch message list
    const messageIds = await this.fetchMessageList(accessToken!, query, integration.lastSyncAt);
    
    // Fetch full message details
    for (const messageId of messageIds) {
      try {
        const message = await this.fetchMessage(accessToken!, messageId);
        if (!message) continue;
        
        const item = this.parseMessage(message, integration);
        if (item) {
          items.push(item);
        }
        
        // Rate limiting
        await this.delay(50);
      } catch (err) {
        console.error(`[Gmail] Error fetching message ${messageId}:`, err);
      }
    }
    
    return items;
  }
  
  private buildQuery(integration: FeedbackIntegration): string {
    const parts: string[] = [];
    
    // Filter by label if configured
    if (integration.config.labelFilter) {
      parts.push(`label:${integration.config.labelFilter}`);
    }
    
    // Filter by keywords
    if (integration.config.keywords && integration.config.keywords.length > 0) {
      const keywordQuery = integration.config.keywords
        .map(kw => `"${kw}"`)
        .join(' OR ');
      parts.push(`(${keywordQuery})`);
    }
    
    // Exclude sent emails
    parts.push('-in:sent');
    
    return parts.join(' ');
  }
  
  private async refreshAccessToken(refreshToken: string): Promise<string> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh Gmail access token');
    }
    
    const data = await response.json();
    return data.access_token;
  }
  
  private async fetchMessageList(
    accessToken: string,
    query: string,
    since?: Date
  ): Promise<string[]> {
    const params = new URLSearchParams({
      maxResults: '100',
      q: query,
    });
    
    if (since) {
      // Gmail uses Unix timestamp in seconds
      const afterDate = Math.floor(since.getTime() / 1000);
      params.set('q', `${query} after:${afterDate}`);
    }
    
    const response = await fetch(
      `${this.baseUrl}/users/me/messages?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return (data.messages || []).map((m: { id: string }) => m.id);
  }
  
  private async fetchMessage(accessToken: string, messageId: string): Promise<GmailMessage | null> {
    const response = await fetch(
      `${this.baseUrl}/users/me/messages/${messageId}?format=full`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  }
  
  private parseMessage(message: GmailMessage, integration: FeedbackIntegration): RawFeedbackItem | null {
    const headers = message.payload.headers;
    
    const getHeader = (name: string) => 
      headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value;
    
    const subject = getHeader('Subject') || '';
    const from = getHeader('From') || '';
    const date = getHeader('Date');
    
    // Parse from header for name and email
    const fromMatch = from.match(/^(?:"?(.+?)"?\s*)?<?([^\s<>]+@[^\s<>]+)>?$/);
    const authorName = fromMatch?.[1]?.trim();
    const authorEmail = fromMatch?.[2]?.trim();
    
    // Skip if no email (likely invalid)
    if (!authorEmail) return null;
    
    // Get body content
    const body = this.extractBody(message);
    if (!body) return null;
    
    // Parse date
    const createdAt = date 
      ? new Date(date)
      : new Date(parseInt(message.internalDate));
    
    return {
      sourceType: 'email_gmail',
      sourceId: message.id,
      sourceUrl: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
      sourceThreadId: message.threadId,
      
      title: subject,
      content: body,
      
      authorEmail,
      authorName,
      
      originalCreatedAt: createdAt,
      
      metadata: {
        labelIds: message.labelIds,
      },
    };
  }
  
  private extractBody(message: GmailMessage): string {
    // Try to get plain text body first
    if (message.payload.body?.data) {
      return this.decodeBase64(message.payload.body.data);
    }
    
    // Check parts for text/plain
    if (message.payload.parts) {
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return this.decodeBase64(part.body.data);
        }
      }
      
      // Fall back to text/html and strip tags
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          const html = this.decodeBase64(part.body.data);
          return this.stripHtml(html);
        }
      }
    }
    
    // Fall back to snippet
    return message.snippet || '';
  }
  
  private decodeBase64(data: string): string {
    // Gmail uses URL-safe base64
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
  }
}
