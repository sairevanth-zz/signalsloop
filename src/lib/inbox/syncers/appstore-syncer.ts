/**
 * App Store Syncer
 * Fetches reviews from Apple App Store using public RSS feed
 */

import { BaseSyncer } from '../base-syncer';
import { IntegrationType, FeedbackIntegration, RawFeedbackItem } from '../types';

interface AppStoreReview {
  id: string;
  title: string;
  content: string;
  author: string;
  rating: number;
  version: string;
  updated: string;
}

export class AppStoreSyncer extends BaseSyncer {
  integrationType: IntegrationType = 'app_store';
  
  async fetchFeedback(integration: FeedbackIntegration): Promise<RawFeedbackItem[]> {
    const appId = integration.config.appId;
    if (!appId) {
      throw new Error('App Store app ID not configured');
    }
    
    const countries = integration.config.countries || ['us'];
    const items: RawFeedbackItem[] = [];
    
    for (const country of countries) {
      try {
        const reviews = await this.fetchReviews(appId, country);
        
        for (const review of reviews) {
          const createdAt = new Date(review.updated);
          
          // Skip if before last sync
          if (integration.lastSyncAt && createdAt < integration.lastSyncAt) {
            continue;
          }
          
          const item: RawFeedbackItem = {
            sourceType: 'app_store',
            sourceId: `${country}-${review.id}`,
            sourceUrl: `https://apps.apple.com/${country}/app/id${appId}?action=write-review`,
            sourceChannel: country.toUpperCase(),
            
            title: review.title,
            content: `${review.title}\n\n${review.content}`,
            
            authorUsername: review.author,
            
            engagementMetrics: {
              score: review.rating,
            },
            
            originalCreatedAt: createdAt,
            
            metadata: {
              rating: review.rating,
              appVersion: review.version,
              country,
            },
          };
          
          items.push(item);
        }
        
        // Rate limiting between countries
        await this.delay(500);
      } catch (err) {
        console.error(`[AppStore] Error fetching reviews for ${country}:`, err);
      }
    }
    
    return items;
  }
  
  private async fetchReviews(appId: string, country: string): Promise<AppStoreReview[]> {
    // Apple's RSS feed for app reviews
    const url = `https://itunes.apple.com/${country}/rss/customerreviews/id=${appId}/sortby=mostrecent/json`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SignalsLoop/1.0',
      },
    });
    
    if (!response.ok) {
      throw new Error(`App Store API error: ${response.status}`);
    }
    
    const data = await response.json();
    const entries = data.feed?.entry || [];
    
    // First entry is app info, skip it
    const reviews = Array.isArray(entries) ? entries.slice(1) : [];
    
    return reviews.map((entry: any) => ({
      id: entry.id?.label || '',
      title: entry.title?.label || '',
      content: entry.content?.label || '',
      author: entry.author?.name?.label || 'Anonymous',
      rating: parseInt(entry['im:rating']?.label || '0', 10),
      version: entry['im:version']?.label || '',
      updated: entry.updated?.label || new Date().toISOString(),
    }));
  }
}
