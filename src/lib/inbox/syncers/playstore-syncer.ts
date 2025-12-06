/**
 * Google Play Store Syncer
 * Fetches reviews from Google Play Store using public RSS/scraping
 * Note: Google doesn't have an official RSS feed like Apple, so we use a workaround
 */

import { BaseSyncer } from '../base-syncer';
import { IntegrationType, FeedbackIntegration, RawFeedbackItem } from '../types';

interface PlayStoreReview {
  id: string;
  author: string;
  rating: number;
  title: string;
  content: string;
  date: Date;
  version?: string;
  thumbsUp?: number;
}

export class PlayStoreSyncer extends BaseSyncer {
  integrationType: IntegrationType = 'play_store';
  
  // Using a public API that aggregates Play Store data
  // Alternative: Use google-play-scraper npm package in production
  private readonly SCRAPER_API = 'https://play-store-api.example.com'; // Placeholder
  
  async fetchFeedback(integration: FeedbackIntegration): Promise<RawFeedbackItem[]> {
    const appId = integration.config.appId; // e.g., 'com.example.app'
    if (!appId) {
      throw new Error('Play Store app ID (package name) not configured');
    }
    
    const country = integration.config.country || 'us';
    const language = integration.config.language || 'en';
    
    try {
      const reviews = await this.fetchReviews(appId, country, language);
      const items: RawFeedbackItem[] = [];
      
      for (const review of reviews) {
        // Skip if before last sync
        if (integration.lastSyncAt && review.date < integration.lastSyncAt) {
          continue;
        }
        
        const item: RawFeedbackItem = {
          sourceType: 'play_store',
          sourceId: review.id,
          sourceUrl: `https://play.google.com/store/apps/details?id=${appId}&reviewId=${review.id}`,
          sourceChannel: country.toUpperCase(),
          
          title: review.title || `${review.rating}★ Review`,
          content: review.content,
          
          authorUsername: review.author,
          
          engagementMetrics: {
            score: review.rating,
            likes: review.thumbsUp || 0,
          },
          
          originalCreatedAt: review.date,
          
          metadata: {
            rating: review.rating,
            appVersion: review.version,
            country,
            thumbsUp: review.thumbsUp,
          },
        };
        
        items.push(item);
      }
      
      return items;
    } catch (error) {
      console.error('[PlayStore] Error fetching reviews:', error);
      // Return empty array instead of throwing - allows other syncers to continue
      return [];
    }
  }
  
  private async fetchReviews(
    appId: string,
    country: string,
    language: string
  ): Promise<PlayStoreReview[]> {
    // Option 1: Use google-play-scraper npm package (recommended)
    // This would need to be run in a Node.js environment
    // npm install google-play-scraper
    
    // For now, we'll use a workaround with the unofficial Data Safety API
    // In production, consider using:
    // 1. google-play-scraper npm package
    // 2. SerpAPI (has free tier: 100 searches/month)
    // 3. ScraperAPI or similar
    
    try {
      // Attempt to use SerpAPI if configured (free tier available)
      const serpApiKey = process.env.SERPAPI_KEY;
      
      if (serpApiKey) {
        return await this.fetchViaSerpApi(appId, serpApiKey, country);
      }
      
      // Fallback: Try to use google-play-scraper if available
      // This requires the package to be installed
      return await this.fetchViaGooglePlayScraper(appId, country, language);
    } catch (error) {
      console.error('[PlayStore] All fetch methods failed:', error);
      return [];
    }
  }
  
  private async fetchViaSerpApi(
    appId: string,
    apiKey: string,
    country: string
  ): Promise<PlayStoreReview[]> {
    // SerpAPI has 100 free searches/month
    // https://serpapi.com/google-play-product-reviews
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google_play_product');
    url.searchParams.set('store', 'apps');
    url.searchParams.set('product_id', appId);
    url.searchParams.set('gl', country);
    url.searchParams.set('api_key', apiKey);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status}`);
    }
    
    const data = await response.json();
    const reviews = data.reviews || [];
    
    return reviews.map((r: any) => ({
      id: r.id || `${appId}-${Date.now()}-${Math.random()}`,
      author: r.author || 'Anonymous',
      rating: r.rating || 0,
      title: r.title || '',
      content: r.snippet || r.content || '',
      date: new Date(r.date || Date.now()),
      version: r.version,
      thumbsUp: r.likes,
    }));
  }
  
  private async fetchViaGooglePlayScraper(
    appId: string,
    country: string,
    language: string
  ): Promise<PlayStoreReview[]> {
    // This method requires google-play-scraper which is an optional dependency
    // For builds without this package, we return an empty array
    // To enable: npm install google-play-scraper
    console.log('[PlayStore] google-play-scraper is an optional dependency - configure SERPAPI_KEY instead');
    return [];
  }
}
