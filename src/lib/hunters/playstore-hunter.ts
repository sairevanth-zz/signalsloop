/**
 * Play Store Hunter
 * Discovers app reviews from Google Play Store
 * Uses web scraping since there's no public API
 */

import { BaseHunter } from './base-hunter';
import {
    PlatformType,
    RawFeedback,
    HunterConfig,
    PlatformIntegration,
    PlatformIntegrationError,
} from '@/types/hunter';

interface PlayStoreReview {
    id: string;
    userName: string;
    userImage?: string;
    content: string;
    score: number;
    thumbsUp: number;
    date: Date;
    version?: string;
}

export class PlayStoreHunter extends BaseHunter {
    platform: PlatformType = 'playstore';
    private readonly PLAY_STORE_URL = 'https://play.google.com/store/apps/details';

    /**
     * Hunt for app reviews on Play Store
     */
    async hunt(
        config: HunterConfig,
        integration: PlatformIntegration
    ): Promise<RawFeedback[]> {
        try {
            const appId = integration.config.app_id;

            if (!appId) {
                console.warn('[PlayStore] No app_id configured');
                return [];
            }

            const results: RawFeedback[] = [];

            try {
                // Fetch reviews page with sorting by newest first
                const reviewsUrl = `${this.PLAY_STORE_URL}?id=${encodeURIComponent(appId)}&hl=en&showAllReviews=true`;

                const response = await fetch(reviewsUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                    },
                });

                if (!response.ok) {
                    console.error(`[PlayStore] Failed to fetch app page: ${response.status}`);
                    return [];
                }

                const html = await response.text();
                const reviews = this.parseReviews(html);

                console.log(`[PlayStore] Parsed ${reviews.length} reviews from page`);

                // Filter reviews from last 7 days
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                for (const review of reviews) {
                    // Skip old reviews
                    if (review.date < sevenDaysAgo) continue;

                    // Check if review matches keywords
                    const matchesKeywords = this.containsAnyKeyword(
                        review.content,
                        [...(config.keywords || []), config.company_name, ...config.name_variations]
                    );

                    // Always include low-rating reviews (1-2 stars) or those matching keywords
                    if (review.score <= 2 || matchesKeywords) {
                        // Skip if contains excluded keywords
                        if (this.containsExcludedKeywords(review.content, config.excluded_keywords)) {
                            continue;
                        }

                        results.push({
                            content: this.sanitizeText(review.content),
                            title: `${review.score}★ Review`,
                            platform: 'playstore',
                            platform_id: review.id,
                            platform_url: `${this.PLAY_STORE_URL}?id=${appId}&reviewId=${review.id}`,
                            author_username: review.userName,
                            discovered_at: review.date,
                            engagement_metrics: {
                                upvotes: review.thumbsUp,
                                score: review.score,
                            },
                            author_metadata: {
                                app_version: review.version,
                                rating: review.score,
                            },
                        });
                    }
                }
            } catch (error) {
                console.error(`[PlayStore] Error fetching reviews for ${appId}:`, error);
            }

            console.log(`[PlayStore] Found ${results.length} relevant reviews`);
            return results;
        } catch (error) {
            console.error('[PlayStore] Hunt error:', error);
            throw new PlatformIntegrationError(
                `Play Store hunt failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'playstore',
                error
            );
        }
    }

    /**
     * Parse reviews from Play Store HTML
     * Note: This is a basic parser and may need updates if Google changes their HTML
     */
    private parseReviews(html: string): PlayStoreReview[] {
        const reviews: PlayStoreReview[] = [];

        try {
            // Look for review blocks - Play Store embeds review data in script tags
            // Extract review text content
            const reviewTextRegex = /<div[^>]*class="[^"]*h3YV2d[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
            const reviewMatches = html.match(reviewTextRegex) || [];

            // Extract star ratings
            const ratingRegex = /aria-label="Rated (\d) stars out of five stars"/gi;
            const ratingMatches = html.match(ratingRegex) || [];

            // Extract reviewer names
            const nameRegex = /<span[^>]*class="[^"]*X43Kjb[^"]*"[^>]*>([^<]+)<\/span>/gi;
            const nameMatches = html.match(nameRegex) || [];

            // Extract dates (format: "Month Day, Year")
            const dateRegex = /<span[^>]*class="[^"]*bp9Aid[^"]*"[^>]*>([^<]+)<\/span>/gi;
            const dateMatches = html.match(dateRegex) || [];

            // Parse up to 50 reviews
            const maxReviews = Math.min(reviewMatches.length, 50);

            for (let i = 0; i < maxReviews; i++) {
                try {
                    // Extract text content
                    let content = reviewMatches[i] || '';
                    content = content.replace(/<[^>]*>/g, '').trim();

                    if (!content || content.length < 10) continue;

                    // Extract rating
                    let score = 3; // Default to 3 stars
                    if (ratingMatches[i]) {
                        const ratingMatch = ratingMatches[i].match(/Rated (\d)/);
                        if (ratingMatch) score = parseInt(ratingMatch[1], 10);
                    }

                    // Extract name
                    let userName = 'A Google user';
                    if (nameMatches[i]) {
                        userName = nameMatches[i].replace(/<[^>]*>/g, '').trim();
                    }

                    // Extract date
                    let date = new Date();
                    if (dateMatches[i]) {
                        const dateStr = dateMatches[i].replace(/<[^>]*>/g, '').trim();
                        const parsedDate = new Date(dateStr);
                        if (!isNaN(parsedDate.getTime())) {
                            date = parsedDate;
                        }
                    }

                    reviews.push({
                        id: `ps-${Date.now()}-${i}`,
                        userName,
                        content,
                        score,
                        thumbsUp: 0,
                        date,
                    });
                } catch (e) {
                    // Skip malformed reviews
                }
            }
        } catch (error) {
            console.error('[PlayStore] Error parsing reviews:', error);
        }

        return reviews;
    }

    /**
     * Check if content contains any of the keywords
     */
    private containsAnyKeyword(content: string, keywords: string[]): boolean {
        const lowerContent = content.toLowerCase();
        return keywords.some(keyword =>
            keyword && lowerContent.includes(keyword.toLowerCase())
        );
    }
}
