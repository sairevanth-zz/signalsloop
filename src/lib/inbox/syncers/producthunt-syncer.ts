/**
 * Product Hunt Syncer
 * Fetches feedback from Product Hunt using their GraphQL API
 * Requires PRODUCTHUNT_API_TOKEN (free to obtain)
 */

import { BaseSyncer } from '../base-syncer';
import { IntegrationType, FeedbackIntegration, RawFeedbackItem } from '../types';

interface ProductHuntComment {
  id: string;
  body: string;
  createdAt: string;
  votesCount: number;
  user: {
    id: string;
    username: string;
    name?: string;
    headline?: string;
    profileImage?: string;
  };
}

interface ProductHuntPost {
  id: string;
  name: string;
  tagline: string;
  description?: string;
  votesCount: number;
  commentsCount: number;
  createdAt: string;
  slug: string;
  url: string;
  comments?: {
    edges: Array<{
      node: ProductHuntComment;
    }>;
  };
}

export class ProductHuntSyncer extends BaseSyncer {
  integrationType: IntegrationType = 'producthunt';
  
  private readonly PH_API_URL = 'https://api.producthunt.com/v2/api/graphql';
  
  async fetchFeedback(integration: FeedbackIntegration): Promise<RawFeedbackItem[]> {
    const apiToken = process.env.PRODUCTHUNT_API_TOKEN;
    
    if (!apiToken) {
      console.log('[ProductHunt] No API token configured (PRODUCTHUNT_API_TOKEN), skipping');
      return [];
    }
    
    const productSlug = integration.config.productSlug;
    if (!productSlug) {
      throw new Error('Product Hunt product slug not configured');
    }
    
    const items: RawFeedbackItem[] = [];
    
    try {
      const post = await this.fetchProduct(productSlug, apiToken);
      
      if (!post) {
        console.log(`[ProductHunt] Product "${productSlug}" not found`);
        return [];
      }
      
      // Add the product launch itself as feedback
      items.push({
        sourceType: 'producthunt',
        sourceId: `post-${post.id}`,
        sourceUrl: post.url,
        sourceChannel: 'launch',
        
        title: post.name,
        content: `${post.tagline}\n\n${post.description || ''}`,
        
        engagementMetrics: {
          likes: post.votesCount,
          comments: post.commentsCount,
        },
        
        originalCreatedAt: new Date(post.createdAt),
        
        metadata: {
          type: 'launch',
          votesCount: post.votesCount,
          commentsCount: post.commentsCount,
        },
      });
      
      // Process comments
      if (post.comments?.edges) {
        for (const edge of post.comments.edges) {
          const comment = edge.node;
          const createdAt = new Date(comment.createdAt);
          
          // Skip if before last sync
          if (integration.lastSyncAt && createdAt < integration.lastSyncAt) {
            continue;
          }
          
          items.push({
            sourceType: 'producthunt',
            sourceId: comment.id,
            sourceUrl: `https://www.producthunt.com/posts/${post.slug}#comment-${comment.id}`,
            sourceChannel: 'comment',
            
            content: comment.body,
            
            authorName: comment.user.name || comment.user.username,
            authorUsername: comment.user.username,
            authorMetadata: {
              headline: comment.user.headline,
              profileUrl: `https://www.producthunt.com/@${comment.user.username}`,
              avatarUrl: comment.user.profileImage,
            },
            
            engagementMetrics: {
              likes: comment.votesCount,
            },
            
            originalCreatedAt: createdAt,
            
            metadata: {
              type: 'comment',
              votesCount: comment.votesCount,
            },
          });
        }
      }
      
      console.log(`[ProductHunt] Found ${items.length} items for "${productSlug}"`);
    } catch (err) {
      console.error('[ProductHunt] Error fetching product:', err);
    }
    
    return items;
  }
  
  private async fetchProduct(slug: string, apiToken: string): Promise<ProductHuntPost | null> {
    const query = `
      query GetProduct($slug: String!) {
        post(slug: $slug) {
          id
          name
          tagline
          description
          votesCount
          commentsCount
          createdAt
          slug
          url
          comments(first: 100, order: NEWEST) {
            edges {
              node {
                id
                body
                createdAt
                votesCount
                user {
                  id
                  username
                  name
                  headline
                  profileImage
                }
              }
            }
          }
        }
      }
    `;
    
    const response = await fetch(this.PH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        query,
        variables: { slug },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Product Hunt API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`Product Hunt GraphQL error: ${JSON.stringify(data.errors)}`);
    }
    
    return data.data?.post || null;
  }
}
