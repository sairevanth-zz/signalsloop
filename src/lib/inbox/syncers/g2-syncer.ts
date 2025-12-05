/**
 * G2 Syncer
 * Fetches reviews from G2 using their API
 */

import { BaseSyncer } from '../base-syncer';
import { IntegrationType, FeedbackIntegration, RawFeedbackItem } from '../types';

interface G2Review {
  id: string;
  attributes: {
    title: string;
    comment_answers: {
      love?: { value?: string };
      hate?: { value?: string };
      recommendations?: { value?: string };
      problems_solved?: { value?: string };
    };
    star_rating: number;
    submitted_at: string;
    secondary_answers?: {
      business_type?: { value?: string };
      business_size?: { value?: string };
      user_role?: { value?: string };
    };
  };
  relationships?: {
    reviewer?: {
      data?: {
        attributes?: {
          name?: string;
          job_title?: string;
          industry?: string;
        };
      };
    };
  };
}

export class G2Syncer extends BaseSyncer {
  integrationType: IntegrationType = 'g2';
  
  private baseUrl = 'https://data.g2.com/api/v1';
  
  async fetchFeedback(integration: FeedbackIntegration): Promise<RawFeedbackItem[]> {
    const apiKey = integration.credentials.apiKey;
    if (!apiKey) {
      throw new Error('G2 API key not configured');
    }
    
    const productId = integration.config.productId;
    if (!productId) {
      throw new Error('G2 product ID not configured');
    }
    
    const items: RawFeedbackItem[] = [];
    
    // Fetch reviews
    const reviews = await this.fetchReviews(apiKey, productId, integration.lastSyncAt);
    
    for (const review of reviews) {
      const item = this.convertReview(review, integration);
      if (item) {
        items.push(item);
      }
    }
    
    return items;
  }
  
  private async fetchReviews(
    apiKey: string,
    productId: string,
    since?: Date
  ): Promise<G2Review[]> {
    const params = new URLSearchParams({
      'filter[product_id]': productId,
      'page[size]': '50',
      'sort': '-submitted_at',
    });
    
    if (since) {
      params.set('filter[submitted_at_gte]', since.toISOString());
    }
    
    const response = await fetch(
      `${this.baseUrl}/survey-responses?${params.toString()}`,
      {
        headers: {
          'Authorization': `Token token=${apiKey}`,
          'Content-Type': 'application/vnd.api+json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`G2 API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data || [];
  }
  
  private convertReview(review: G2Review, integration: FeedbackIntegration): RawFeedbackItem | null {
    const attrs = review.attributes;
    const reviewer = review.relationships?.reviewer?.data?.attributes;
    
    // Build content from all review sections
    const contentParts: string[] = [];
    
    if (attrs.title) {
      contentParts.push(`## ${attrs.title}`);
    }
    
    if (attrs.comment_answers.love?.value) {
      contentParts.push(`\n**What do you like best?**\n${attrs.comment_answers.love.value}`);
    }
    
    if (attrs.comment_answers.hate?.value) {
      contentParts.push(`\n**What do you dislike?**\n${attrs.comment_answers.hate.value}`);
    }
    
    if (attrs.comment_answers.problems_solved?.value) {
      contentParts.push(`\n**Problems solved:**\n${attrs.comment_answers.problems_solved.value}`);
    }
    
    if (attrs.comment_answers.recommendations?.value) {
      contentParts.push(`\n**Recommendations:**\n${attrs.comment_answers.recommendations.value}`);
    }
    
    const content = contentParts.join('\n');
    
    if (!content.trim()) {
      return null;
    }
    
    // Convert star rating to sentiment score
    // 1-2 stars = negative, 3 = neutral, 4-5 = positive
    const sentimentFromRating = (attrs.star_rating - 3) / 2; // -1 to +1
    
    return {
      sourceType: 'g2',
      sourceId: review.id,
      sourceUrl: `https://www.g2.com/products/${integration.config.productSlug}/reviews/${review.id}`,
      
      title: attrs.title,
      content: content,
      
      authorName: reviewer?.name,
      authorMetadata: {
        role: reviewer?.job_title,
        company: attrs.secondary_answers?.business_type?.value,
        companySize: attrs.secondary_answers?.business_size?.value,
        industry: reviewer?.industry,
      },
      
      engagementMetrics: {
        score: attrs.star_rating,
      },
      
      originalCreatedAt: new Date(attrs.submitted_at),
      
      metadata: {
        starRating: attrs.star_rating,
        businessSize: attrs.secondary_answers?.business_size?.value,
      },
    };
  }
}
