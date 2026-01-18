/**
 * Outlook Syncer
 * Fetches emails from Outlook using Microsoft Graph API
 */

import { BaseSyncer } from '../base-syncer';
import { IntegrationType, FeedbackIntegration, RawFeedbackItem } from '../types';

interface OutlookMessage {
    id: string;
    conversationId: string;
    subject: string;
    bodyPreview: string;
    body: {
        contentType: string;
        content: string;
    };
    from: {
        emailAddress: {
            name?: string;
            address: string;
        };
    };
    receivedDateTime: string;
    categories: string[];
    isRead: boolean;
}

export class OutlookSyncer extends BaseSyncer {
    integrationType: IntegrationType = 'email_outlook';

    private baseUrl = 'https://graph.microsoft.com/v1.0';

    async fetchFeedback(integration: FeedbackIntegration): Promise<RawFeedbackItem[]> {
        let accessToken = integration.credentials.accessToken;
        const refreshToken = integration.credentials.refreshToken;

        if (!accessToken && !refreshToken) {
            throw new Error('Outlook credentials not configured');
        }

        // Refresh access token if we have a refresh token
        if (refreshToken) {
            accessToken = await this.refreshAccessToken(refreshToken);
        }

        const items: RawFeedbackItem[] = [];

        // Fetch messages
        const messages = await this.fetchMessages(accessToken!, integration);

        for (const message of messages) {
            const item = this.parseMessage(message);
            if (item) {
                items.push(item);
            }
        }

        return items;
    }

    private async refreshAccessToken(refreshToken: string): Promise<string> {
        const clientId = process.env.MICROSOFT_CLIENT_ID;
        const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            throw new Error('Microsoft OAuth credentials not configured');
        }

        const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
                scope: 'https://graph.microsoft.com/Mail.Read offline_access',
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('[Outlook] Token refresh error:', errorData);
            throw new Error('Failed to refresh Outlook access token');
        }

        const data = await response.json();
        return data.access_token;
    }

    private async fetchMessages(
        accessToken: string,
        integration: FeedbackIntegration
    ): Promise<OutlookMessage[]> {
        // Build filter query
        const filters: string[] = [];

        // Filter by date if we have a last sync time
        if (integration.lastSyncAt) {
            const isoDate = integration.lastSyncAt.toISOString();
            filters.push(`receivedDateTime ge ${isoDate}`);
        }

        // Build query params
        const params = new URLSearchParams({
            '$top': '100',
            '$orderby': 'receivedDateTime desc',
            '$select': 'id,conversationId,subject,bodyPreview,body,from,receivedDateTime,categories,isRead',
        });

        if (filters.length > 0) {
            params.set('$filter', filters.join(' and '));
        }

        // Add search for keywords if configured
        if (integration.config.keywords && integration.config.keywords.length > 0) {
            const searchQuery = integration.config.keywords.join(' OR ');
            params.set('$search', `"${searchQuery}"`);
        }

        // Filter by folder/label if configured
        let endpoint = `${this.baseUrl}/me/messages`;
        if (integration.config.labelFilter) {
            // Try to get the folder by name
            const folderId = await this.getFolderId(accessToken, integration.config.labelFilter);
            if (folderId) {
                endpoint = `${this.baseUrl}/me/mailFolders/${folderId}/messages`;
            }
        }

        const response = await fetch(
            `${endpoint}?${params.toString()}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Outlook] API error:', response.status, errorText);
            throw new Error(`Outlook API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.value || [];
    }

    private async getFolderId(accessToken: string, folderName: string): Promise<string | null> {
        try {
            const response = await fetch(
                `${this.baseUrl}/me/mailFolders?$filter=displayName eq '${folderName}'`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                }
            );

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            return data.value?.[0]?.id || null;
        } catch {
            return null;
        }
    }

    private parseMessage(message: OutlookMessage): RawFeedbackItem | null {
        const authorEmail = message.from?.emailAddress?.address;
        const authorName = message.from?.emailAddress?.name;

        // Skip if no email
        if (!authorEmail) return null;

        // Get body content (prefer plain text preview, fall back to full body)
        let content = message.bodyPreview || '';
        if (!content && message.body?.content) {
            content = message.body.contentType === 'text'
                ? message.body.content
                : this.stripHtml(message.body.content);
        }

        if (!content) return null;

        const createdAt = new Date(message.receivedDateTime);

        return {
            sourceType: 'email_outlook',
            sourceId: message.id,
            sourceUrl: `https://outlook.office365.com/mail/inbox/id/${message.id}`,
            sourceThreadId: message.conversationId,

            title: message.subject || '(No Subject)',
            content: message.subject ? `${message.subject}\n\n${content}` : content,

            authorEmail,
            authorName,

            originalCreatedAt: createdAt,

            metadata: {
                categories: message.categories,
                isRead: message.isRead,
            },
        };
    }
}
