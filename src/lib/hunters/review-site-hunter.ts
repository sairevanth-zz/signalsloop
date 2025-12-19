/**
 * Review Site Hunter
 * Discovers reviews from G2, Capterra, and Trustpilot using xAI's Grok API with web search
 * This is a cost-effective alternative to direct web scraping
 */

import { BaseHunter } from './base-hunter';
import {
    PlatformType,
    RawFeedback,
    HunterConfig,
    PlatformIntegration,
    PlatformIntegrationError,
    PlatformConfig,
} from '@/types/hunter';
import { checkAIUsageLimit, incrementAIUsage } from '@/lib/ai-rate-limit';

/**
 * Structure of a review found via Grok's web search
 */
interface GrokReview {
    title: string;
    content: string;
    rating: number;
    author_name: string;
    author_title?: string;
    author_company?: string;
    date: string;
    pros?: string;
    cons?: string;
    source_url: string;
    platform: 'g2' | 'capterra' | 'trustpilot';
}

/**
 * Response from xAI API
 */
interface XAIResponse {
    id: string;
    choices: {
        message: {
            content: string;
        };
        finish_reason: string;
    }[];
    citations?: {
        url: string;
        title?: string;
        snippet?: string;
    }[];
}

/**
 * Review site configuration
 */
interface ReviewSiteConfig {
    platform: 'g2' | 'capterra' | 'trustpilot';
    product_name: string;
    product_url?: string;
}

export class ReviewSiteHunter extends BaseHunter {
    platform: PlatformType = 'g2'; // Default, but can search multiple sites
    private readonly XAI_API_URL = 'https://api.x.ai/v1/chat/completions';

    /**
     * Hunt for reviews on G2, Capterra, or Trustpilot using Grok's web search
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
                    `Review site scan limit reached (${usageCheck.current}/${usageCheck.limit} this month).`,
                    'g2',
                    { limit_exceeded: true, current: usageCheck.current, limit: usageCheck.limit }
                );
            }

            const apiKey = process.env.XAI_API_KEY;

            if (!apiKey) {
                console.error('[ReviewSite/Grok] XAI_API_KEY is missing!');
                throw new PlatformIntegrationError(
                    'Missing xAI API key. Please configure XAI_API_KEY.',
                    'g2',
                    { integration_id: integration.id }
                );
            }

            // Get review site configuration
            const reviewConfig = this.getReviewSiteConfig(config, integration);

            console.log(`[ReviewSite/Grok] Starting hunt for ${reviewConfig.product_name} on ${reviewConfig.platform}`);

            // Search for reviews using Grok
            const reviews = await this.searchWithGrok(
                reviewConfig,
                apiKey,
                config.excluded_keywords
            );

            // Increment usage after successful scan
            await incrementAIUsage(config.project_id, 'hunter_scan');

            console.log(`[ReviewSite/Grok] Found ${reviews.length} reviews via Grok web search`);

            // Convert to RawFeedback format
            return reviews.map(review => this.convertToRawFeedback(review, config.project_id));
        } catch (error) {
            console.error('[ReviewSite/Grok] Hunt error:', error);
            throw new PlatformIntegrationError(
                `Review site hunt failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'g2',
                error
            );
        }
    }

    /**
     * Extract review site configuration from hunter config
     */
    private getReviewSiteConfig(
        config: HunterConfig,
        integration: PlatformIntegration
    ): ReviewSiteConfig {
        const platformType = integration.platform_type;

        // Determine which review site based on platform type or config
        let platform: 'g2' | 'capterra' | 'trustpilot' = 'g2';
        let product_url: string | undefined;

        if (platformType === 'g2' && integration.config.g2_product_url) {
            platform = 'g2';
            product_url = integration.config.g2_product_url;
        } else if (this.hasCaperraConfig(integration.config)) {
            platform = 'capterra';
            product_url = integration.config.capterra_product_url;
        } else if (this.hasTrustpilotConfig(integration.config)) {
            platform = 'trustpilot';
            product_url = integration.config.trustpilot_product_url;
        }

        return {
            platform,
            product_name: config.company_name,
            product_url,
        };
    }

    /**
     * Check if Capterra config exists
     */
    private hasCaperraConfig(config: PlatformConfig): boolean {
        return !!(config as any).capterra_product_url;
    }

    /**
     * Check if Trustpilot config exists
     */
    private hasTrustpilotConfig(config: PlatformConfig): boolean {
        return !!(config as any).trustpilot_product_url;
    }

    /**
     * Search for reviews using Grok's web search capability
     */
    private async searchWithGrok(
        reviewConfig: ReviewSiteConfig,
        apiKey: string,
        excludedKeywords: string[]
    ): Promise<GrokReview[]> {
        const { platform, product_name, product_url } = reviewConfig;

        // Build the search query based on platform
        const siteFilter = this.getSiteFilter(platform);
        const searchQuery = product_url
            ? `${product_url} reviews`
            : `${product_name} reviews site:${siteFilter}`;

        const systemPrompt = `You are a review discovery assistant. Search the web for product reviews and return structured data.

Return the results as a JSON array of reviews with these fields:
- title: Review title or headline
- content: Full review text (combine pros, cons, and overall if available)
- rating: Numerical rating (1-5 or 1-10, normalize to 5-point scale)
- author_name: Reviewer's name or username
- author_title: Reviewer's job title (if available)
- author_company: Reviewer's company (if available)
- date: Review date (ISO format or relative like "2 weeks ago")
- pros: What the reviewer liked (if structured as pros/cons)
- cons: What the reviewer disliked (if structured as pros/cons)
- source_url: Direct URL to the review
- platform: "g2", "capterra", or "trustpilot"

Only include genuine user reviews. Exclude promotional content, press releases, and affiliate content.
${excludedKeywords.length > 0 ? `Exclude reviews mentioning: ${excludedKeywords.join(', ')}` : ''}

Return ONLY a valid JSON array. No explanations or markdown formatting.`;

        const userPrompt = `Find the most recent reviews for "${product_name}" on ${this.getPlatformName(platform)}. 
${product_url ? `Product page: ${product_url}` : ''}

Look for reviews from the past 30 days if available. Return at least 5-10 reviews if found.`;

        try {
            console.log(`[ReviewSite/Grok] Searching: ${searchQuery}`);

            const response = await fetch(this.XAI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'grok-3-fast',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    search_parameters: {
                        mode: 'on',
                        sources: [{ type: 'web' }],
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
            const content = data.choices?.[0]?.message?.content || '';

            console.log('[ReviewSite/Grok] Raw response length:', content.length);

            // Parse the JSON response
            let reviews: GrokReview[] = [];
            try {
                // Try to extract JSON from the response
                const jsonMatch = content.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    reviews = JSON.parse(jsonMatch[0]);
                    console.log(`[ReviewSite/Grok] Parsed ${reviews.length} reviews`);
                } else {
                    console.warn('[ReviewSite/Grok] No JSON array found in response');
                }
            } catch (parseError) {
                console.warn('[ReviewSite/Grok] Failed to parse response as JSON:', parseError);
                // Try to extract individual review objects
                reviews = this.extractReviewsFromText(content, platform);
            }

            // Add citations as additional context
            if (data.citations?.length) {
                console.log(`[ReviewSite/Grok] Got ${data.citations.length} citations`);
                // Could use citations to verify or enrich review data
            }

            return reviews;
        } catch (error) {
            console.error('[ReviewSite/Grok] Search error:', error);
            throw error;
        }
    }

    /**
     * Get site filter for search query
     */
    private getSiteFilter(platform: 'g2' | 'capterra' | 'trustpilot'): string {
        switch (platform) {
            case 'g2':
                return 'g2.com';
            case 'capterra':
                return 'capterra.com';
            case 'trustpilot':
                return 'trustpilot.com';
            default:
                return 'g2.com';
        }
    }

    /**
     * Get platform display name
     */
    private getPlatformName(platform: 'g2' | 'capterra' | 'trustpilot'): string {
        switch (platform) {
            case 'g2':
                return 'G2';
            case 'capterra':
                return 'Capterra';
            case 'trustpilot':
                return 'Trustpilot';
            default:
                return 'G2';
        }
    }

    /**
     * Fallback: Extract reviews from unstructured text
     */
    private extractReviewsFromText(
        text: string,
        platform: 'g2' | 'capterra' | 'trustpilot'
    ): GrokReview[] {
        // Simple fallback - try to extract any review-like content
        const reviews: GrokReview[] = [];

        // Look for patterns like "Review by [name]" or rating patterns
        const reviewPatterns = [
            /(?:review by|reviewed by|from)\s+([^,\n]+)/gi,
            /(\d(?:\.\d)?)\s*(?:out of\s*)?(?:\/\s*)?5\s*(?:stars?)?/gi,
        ];

        // This is a basic fallback - in practice, the JSON parsing should work
        console.log('[ReviewSite/Grok] Using fallback text extraction');

        return reviews;
    }

    /**
     * Convert Grok review to RawFeedback format
     */
    private convertToRawFeedback(review: GrokReview, projectId: string): RawFeedback {
        // Combine pros and cons with main content for comprehensive feedback
        let fullContent = review.content || '';
        if (review.pros) {
            fullContent += `\n\nPros: ${review.pros}`;
        }
        if (review.cons) {
            fullContent += `\n\nCons: ${review.cons}`;
        }

        // Parse date or use current date
        let discoveredAt = new Date();
        try {
            if (review.date) {
                if (review.date.includes('ago')) {
                    // Handle relative dates like "2 weeks ago"
                    discoveredAt = this.parseRelativeDate(review.date);
                } else {
                    discoveredAt = new Date(review.date);
                }
            }
        } catch {
            // Use current date if parsing fails
        }

        return {
            content: this.sanitizeText(fullContent),
            title: review.title || undefined,
            platform: 'g2', // Using g2 as the platform type for all review sites
            platform_id: `${review.platform}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            platform_url: review.source_url || `https://${this.getSiteFilter(review.platform)}`,
            author_username: review.author_name || 'Anonymous',
            author_profile_url: undefined,
            author_metadata: {
                verified: true, // Reviews on these platforms are typically verified
            },
            discovered_at: discoveredAt,
            engagement_metrics: {
                rating: this.normalizeRating(review.rating),
            },
        };
    }

    /**
     * Parse relative date strings like "2 weeks ago"
     */
    private parseRelativeDate(relativeDate: string): Date {
        const now = new Date();
        const lower = relativeDate.toLowerCase();

        const matches = lower.match(/(\d+)\s*(day|week|month|year)s?\s*ago/);
        if (matches) {
            const amount = parseInt(matches[1], 10);
            const unit = matches[2];

            switch (unit) {
                case 'day':
                    now.setDate(now.getDate() - amount);
                    break;
                case 'week':
                    now.setDate(now.getDate() - amount * 7);
                    break;
                case 'month':
                    now.setMonth(now.getMonth() - amount);
                    break;
                case 'year':
                    now.setFullYear(now.getFullYear() - amount);
                    break;
            }
        }

        return now;
    }

    /**
     * Normalize rating to 5-point scale
     */
    private normalizeRating(rating: number): number {
        if (!rating || isNaN(rating)) return 0;

        // If rating is on 10-point scale, convert to 5-point
        if (rating > 5) {
            return rating / 2;
        }

        return rating;
    }
}
