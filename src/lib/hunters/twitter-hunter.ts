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
import { checkAIUsageLimit, incrementAIUsage } from '@/lib/ai-rate-limit';

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
      // Check rate limit before proceeding
      const usageCheck = await checkAIUsageLimit(config.project_id, 'hunter_scan');
      if (!usageCheck.allowed) {
        throw new PlatformIntegrationError(
          `X/Twitter scan limit reached (${usageCheck.current}/${usageCheck.limit} this month). ` +
          (usageCheck.plan === 'free'
            ? 'Upgrade to Pro for more scans!'
            : usageCheck.plan === 'pro'
              ? 'Upgrade to Premium for more scans!'
              : 'Limit will reset next month.'),
          'twitter',
          { limit_exceeded: true, current: usageCheck.current, limit: usageCheck.limit }
        );
      }

      const apiKey = process.env.XAI_API_KEY;

      if (!apiKey) {
        throw new PlatformIntegrationError(
          'Missing xAI API key in environment variables. Please configure XAI_API_KEY.',
          'twitter',
          { integration_id: integration.id }
        );
      }

      // Build search terms from config
      const searchTerms = [
        config.company_name,
        ...config.name_variations,
        ...(integration.config.twitter_search_terms || []),
        ...config.keywords,
      ].filter(Boolean);

      // Get lookback period (default 1 day)
      const lookbackDays = integration.config.twitter_lookback_days || 1;
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
          const posts = await this.searchWithGrok(
            term,
            apiKey,
            fromDate,
            config.excluded_keywords,
            integration.config.twitter_usernames
          );

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

      // Increment usage counter after successful scan
      await incrementAIUsage(config.project_id, 'hunter_scan');

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
   */
  private async searchWithGrok(
    query: string,
    apiKey: string,
    fromDate: string,
    excludedKeywords: string[],
    targetUsernames?: string[]
  ): Promise<RawFeedback[]> {
    // Build the prompt for Grok to search X
    const usernameContext = targetUsernames?.length
      ? `Focus on posts from these accounts if relevant: ${targetUsernames.join(', ')}.`
      : '';

    const systemPrompt = `You are a feedback discovery assistant. When asked to find posts about a topic, use the x_search tool to find relevant posts on X (Twitter). 

Return the results as a JSON array of posts with these fields:
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

Only include posts that contain genuine product feedback, complaints, feature requests, bug reports, or praise. Exclude promotional content, spam, and irrelevant mentions.`;

    const userPrompt = `Find recent X posts mentioning "${query}" that contain product feedback, user opinions, complaints, feature requests, or bug reports. ${usernameContext}

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
          tools: [
            {
              type: 'live_search',
              live_search: {
                sources: ['x'],  // Search X/Twitter
                from_date: fromDate,
                to_date: new Date().toISOString().split('T')[0],
              },
            },
          ],
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`xAI API error: ${response.status} - ${errorText}`);
      }

      const data: XAIResponse = await response.json();
      const content = data.choices[0]?.message?.content || '[]';

      // Parse the JSON response from Grok
      let posts: GrokXPost[] = [];
      try {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          posts = JSON.parse(jsonMatch[0]);
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
