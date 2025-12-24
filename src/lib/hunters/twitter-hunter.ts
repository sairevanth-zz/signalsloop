/**
 * Twitter/X Hunter
 * Discovers feedback from Twitter/X using xAI's Grok API with x_search tool
 * (Replaces the expensive Twitter API v2 with cost-effective Grok-powered search)
 */

import { BaseHunter } from './base-hunter';
import {
  PlatformType,
  RawFeedback,
  HunterConfig,
  PlatformIntegration,
  PlatformIntegrationError,
} from '@/types/hunter';
import { checkAIUsageLimit } from '@/lib/ai-rate-limit';
import { checkGrokRateLimit } from './concurrency';

/**
 * Structure of a post found via Grok's x_search
 */
interface GrokXPost {
  id: string;
  text: string;
  author_username: string;
  author_verified?: boolean;
  author_followers?: number;
  created_at: string;
  likes?: number;
  retweets?: number;
  replies?: number;
  url?: string;
}

/**
 * Response from xAI API
 */
interface XAIResponse {
  id: string;
  choices: {
    message: {
      content: string;
      tool_calls?: {
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }[];
    };
    finish_reason: string;
  }[];
  citations?: {
    url: string;
    title?: string;
    snippet?: string;
  }[];
}

export class TwitterHunter extends BaseHunter {
  platform: PlatformType = 'twitter';
  private readonly XAI_API_URL = 'https://api.x.ai/v1/chat/completions';

  /**
   * Hunt for feedback on Twitter/X using Grok's x_search
   */
  async hunt(
    config: HunterConfig,
    integration: PlatformIntegration
  ): Promise<RawFeedback[]> {
    try {
      // Twitter/X is Premium-only - check plan first
      const usageCheck = await checkAIUsageLimit(config.project_id, 'hunter_scan');
      if (usageCheck.plan !== 'premium') {
        console.log('[Twitter/Grok] Twitter/X is a Premium-only feature. Skipping scan.');
        return []; // Silently skip for Free/Pro users
      }

      // Check rate limit before proceeding
      if (!usageCheck.allowed) {
        throw new PlatformIntegrationError(
          `X/Twitter scan limit reached (${usageCheck.current}/${usageCheck.limit} this month). Limit will reset next month.`,
          'twitter',
          { limit_exceeded: true, current: usageCheck.current, limit: usageCheck.limit }
        );
      }

      const apiKey = process.env.XAI_API_KEY;

      console.log('[Twitter/Grok] Starting hunt, API key present:', !!apiKey);

      if (!apiKey) {
        console.error('[Twitter/Grok] XAI_API_KEY is missing!');
        throw new PlatformIntegrationError(
          'Missing xAI API key in environment variables. Please configure XAI_API_KEY.',
          'twitter',
          { integration_id: integration.id }
        );
      }

      // Check Grok/xAI rate limit before proceeding
      const grokRateLimitCheck = await checkGrokRateLimit();
      if (!grokRateLimitCheck.allowed) {
        console.warn(`[Twitter/Grok] Rate limit reached: ${grokRateLimitCheck.reason}`);
        return []; // Return empty results, will be retried next scan
      }

      // Build search terms from config (limit to 5 to avoid timeout)
      const searchTerms = [
        config.company_name,
        ...config.name_variations,
        ...(integration.config.twitter_search_terms || []),
        ...config.keywords,
      ].filter(Boolean).slice(0, 5);

      console.log('[Twitter/Grok] Search terms:', searchTerms);

      // Get lookback period (default 7 days for premium feature)
      const lookbackDays = integration.config.twitter_lookback_days || 7;
      const fromDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]; // YYYY-MM-DD format

      const results: RawFeedback[] = [];
      const seenIds = new Set<string>();

      // Search for each term using Grok
      for (const term of searchTerms) {
        if (this.containsExcludedKeywords(term, config.excluded_keywords)) {
          continue;
        }

        try {
          console.log(`[Twitter/Grok] Searching for term: "${term}"`);
          const productContext = this.getProductContextBlock(config);
          const posts = await this.searchWithGrok(
            term,
            apiKey,
            fromDate,
            config.excluded_keywords,
            integration.config.twitter_usernames,
            productContext
          );
          console.log(`[Twitter/Grok] Term "${term}" returned ${posts.length} posts`);

          for (const post of posts) {
            if (seenIds.has(post.platform_id)) continue;
            seenIds.add(post.platform_id);
            results.push(post);
          }

          // Rate limit: wait between searches
          await this.delay(1000);
        } catch (error) {
          console.error(`[Twitter/Grok] Error searching for "${term}":`, error);
        }
      }

      console.log(`[Twitter/Grok] Found ${results.length} items via Grok x_search`);

      // Usage is now tracked in trigger API, not per-platform

      return results;
    } catch (error) {
      console.error('[Twitter/Grok] Hunt error:', error);
      throw new PlatformIntegrationError(
        `Twitter hunt failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'twitter',
        error
      );
    }
  }

  /**
   * Search X posts using Grok's x_search capability
   * Enhanced with Product Context for better disambiguation
   */
  private async searchWithGrok(
    query: string,
    apiKey: string,
    fromDate: string,
    excludedKeywords: string[],
    targetUsernames?: string[],
    productContext?: string
  ): Promise<RawFeedback[]> {
    // Build the prompt for Grok to search X
    const usernameContext = targetUsernames?.length
      ? `Focus on posts from these accounts if relevant: ${targetUsernames.join(', ')}.`
      : '';

    const excludeContext = excludedKeywords.length > 0
      ? `\nEXCLUDE posts mentioning: ${excludedKeywords.join(', ')}`
      : '';

    const systemPrompt = `You are an expert product feedback discovery agent. Your mission is to find genuine user feedback, complaints, feature requests, and discussions about a specific product on X/Twitter.

You must be HIGHLY PRECISE - false positives waste PM time and damage trust.

${productContext || ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEARCH STRATEGY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. DIRECT MENTIONS (Highest confidence):
   - @handle mentions
   - Product name + ".com" or website
   - Product name in context of the product category

2. CONTEXTUAL MENTIONS (Medium confidence):
   - Product name + category keywords
   - Product name + competitor names
   - Discussions about switching to/from this product

3. CATEGORY DISCUSSIONS (Lower confidence):
   - "looking for [product category]" + relevant features
   - "alternative to [competitor]" discussions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRICT EXCLUSION CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEVER return posts that match these patterns:

❌ PROMOTIONAL SPAM:
   - Posts from the company's own account
   - Affiliate links or referral codes
   - Press releases or funding announcements

❌ WEAK ASSOCIATIONS:
   - Generic industry discussions that don't mention the specific product
   - Posts about similarly-named but different products
   - Posts where the product name appears but isn't the subject

❌ JOB POSTINGS:
   - Hiring posts mentioning the product as a tool requirement${excludeContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return a JSON array of posts with these fields:
- id: the post ID
- text: the post content
- author_username: the author's X username (without @)
- author_verified: whether the author is verified (boolean)
- author_followers: approximate follower count if available
- created_at: when the post was created (ISO format)
- likes: number of likes
- retweets: number of retweets
- replies: number of replies
- url: full URL to the post
- preliminary_relevance_score: 0-100 score for how relevant this is to the product
- mention_type: "direct" | "contextual" | "category_discussion"

Only include posts with preliminary_relevance_score >= 60.
Return ONLY a valid JSON array. No explanations.`;

    const userPrompt = `Find recent X posts mentioning "${query}" that contain product feedback, user opinions, complaints, feature requests, or bug reports. ${usernameContext}

IMPORTANT: Only return posts that are genuinely about this specific product, not similarly-named products.

Return ONLY a JSON array of posts. No explanations.`;

    try {
      const response = await fetch(this.XAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'grok-4-1-fast-reasoning',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          search_parameters: {
            mode: 'on',  // Enable live search
            sources: [{ type: 'x' }],  // Search X/Twitter
            from_date: fromDate,
            to_date: new Date().toISOString().split('T')[0],
            max_search_results: 30,
            return_citations: true,
          },
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`xAI API error: ${response.status} - ${errorText}`);
      }

      const data: XAIResponse = await response.json();
      console.log('[Twitter/Grok] API Response:', JSON.stringify(data, null, 2));

      const content = data.choices[0]?.message?.content || '[]';
      console.log('[Twitter/Grok] Content:', content.substring(0, 500));

      // Parse the JSON response from Grok
      let posts: GrokXPost[] = [];
      try {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          posts = JSON.parse(jsonMatch[0]);
          console.log('[Twitter/Grok] Parsed posts:', posts.length);
        } else {
          console.warn('[Twitter/Grok] No JSON array found in response');
        }
      } catch (parseError) {
        console.warn('[Twitter/Grok] Failed to parse response as JSON:', parseError);
        return [];
      }

      // Convert to RawFeedback format
      const results: RawFeedback[] = [];

      for (const post of posts) {
        // Skip if contains excluded keywords
        if (this.containsExcludedKeywords(post.text, excludedKeywords)) {
          continue;
        }

        const postUrl =
          post.url || `https://x.com/${post.author_username}/status/${post.id}`;

        results.push({
          content: this.sanitizeText(post.text),
          platform: 'twitter',
          platform_id: post.id,
          platform_url: postUrl,
          author_username: post.author_username,
          author_profile_url: `https://x.com/${post.author_username}`,
          author_metadata: {
            verified: post.author_verified,
            follower_count: post.author_followers,
          },
          discovered_at: new Date(post.created_at || Date.now()),
          engagement_metrics: {
            likes: post.likes || 0,
            retweets: post.retweets || 0,
            replies: post.replies || 0,
          },
        });
      }

      return results;
    } catch (error) {
      console.error('[Twitter/Grok] Search error:', error);
      throw error;
    }
  }
}
