/**
 * Product Hunt Hunter
 * Discovers feedback from Product Hunt using their GraphQL API
 */

import { BaseHunter } from './base-hunter';
import {
  PlatformType,
  RawFeedback,
  HunterConfig,
  PlatformIntegration,
  PlatformIntegrationError,
} from '@/types/hunter';

interface ProductHuntComment {
  id: string;
  body: string;
  createdAt: string;
  user: {
    username: string;
    profileImage?: string;
  };
  votesCount: number;
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
  comments?: {
    edges: Array<{
      node: ProductHuntComment;
    }>;
  };
}

export class ProductHuntHunter extends BaseHunter {
  platform: PlatformType = 'producthunt';
  private readonly PH_API_URL = 'https://api.producthunt.com/v2/api/graphql';

  /**
   * Hunt for feedback on Product Hunt
   */
  async hunt(
    config: HunterConfig,
    integration: PlatformIntegration
  ): Promise<RawFeedback[]> {
    try {
      // Validate configuration
      if (!integration.config.producthunt_api_key) {
        throw new PlatformIntegrationError(
          'Missing Product Hunt API key',
          'producthunt',
          { integration_id: integration.id }
        );
      }

      if (!integration.config.producthunt_product_slug) {
        throw new PlatformIntegrationError(
          'Missing Product Hunt product slug',
          'producthunt',
          { integration_id: integration.id }
        );
      }

      const results: RawFeedback[] = [];

      // Fetch product and its comments
      const post = await this.fetchProduct(
        integration.config.producthunt_product_slug,
        integration.config.producthunt_api_key
      );

      if (!post) {
        console.log('[ProductHunt] Product not found');
        return results;
      }

      // Process comments
      if (post.comments?.edges) {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

        for (const edge of post.comments.edges) {
          const comment = edge.node;

          // Only get comments from last 24 hours
          const commentDate = new Date(comment.createdAt).getTime();
          if (commentDate < oneDayAgo) continue;

          // Check for excluded keywords
          if (this.containsExcludedKeywords(comment.body, config.excluded_keywords)) {
            continue;
          }

          results.push({
            content: this.sanitizeText(comment.body),
            platform: 'producthunt',
            platform_id: comment.id,
            platform_url: `https://www.producthunt.com/posts/${post.slug}#comment-${comment.id}`,
            author_username: comment.user.username,
            author_profile_url: `https://www.producthunt.com/@${comment.user.username}`,
            discovered_at: new Date(comment.createdAt),
            engagement_metrics: {
              upvotes: comment.votesCount,
            },
          });
        }
      }

      console.log(`[ProductHunt] Found ${results.length} items`);
      return results;
    } catch (error) {
      console.error('[ProductHunt] Hunt error:', error);
      throw new PlatformIntegrationError(
        `Product Hunt hunt failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'producthunt',
        error
      );
    }
  }

  /**
   * Fetch product data from Product Hunt GraphQL API
   */
  private async fetchProduct(
    slug: string,
    apiKey: string
  ): Promise<ProductHuntPost | null> {
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
          comments(first: 100, order: NEWEST) {
            edges {
              node {
                id
                body
                createdAt
                votesCount
                user {
                  username
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
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        variables: { slug },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Product Hunt API error: ${response.statusText} - ${error}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(
        `Product Hunt GraphQL error: ${JSON.stringify(data.errors)}`
      );
    }

    return data.data?.post || null;
  }
}
