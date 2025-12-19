/**
 * Hunter Factory
 * Exports all hunters and provides a factory function to get the right hunter
 */

import { BaseHunter } from './base-hunter';
import { RedditHunter } from './reddit-hunter';
import { TwitterHunter } from './twitter-hunter';
import { HackerNewsHunter } from './hackernews-hunter';
import { ProductHuntHunter } from './producthunt-hunter';
import { G2Hunter } from './g2-hunter';
import { ReviewSiteHunter } from './review-site-hunter';
import { PlayStoreHunter } from './playstore-hunter';
import { PlatformType } from '@/types/hunter';

// Export all hunters
export { BaseHunter } from './base-hunter';
export { RedditHunter } from './reddit-hunter';
export { TwitterHunter } from './twitter-hunter';
export { HackerNewsHunter } from './hackernews-hunter';
export { ProductHuntHunter } from './producthunt-hunter';
export { G2Hunter } from './g2-hunter';
export { ReviewSiteHunter } from './review-site-hunter';
export { PlayStoreHunter } from './playstore-hunter';

/**
 * Factory function to get the appropriate hunter for a platform
 * Note: g2, capterra, trustpilot, and producthunt all use ReviewSiteHunter (Grok-powered)
 */
export function getHunter(platform: PlatformType): BaseHunter {
  switch (platform) {
    case 'reddit':
      return new RedditHunter();
    case 'twitter':
      return new TwitterHunter();
    case 'hackernews':
      return new HackerNewsHunter();
    case 'producthunt':
      // Use ReviewSiteHunter with Grok - no API key needed
      return new ReviewSiteHunter();
    case 'g2':
      // Use ReviewSiteHunter with Grok for better reliability than scraping
      return new ReviewSiteHunter();
    case 'capterra':
      return new ReviewSiteHunter();
    case 'trustpilot':
      return new ReviewSiteHunter();
    case 'playstore':
      return new PlayStoreHunter();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Get all available hunters
 */
export function getAllHunters(): BaseHunter[] {
  return [
    new RedditHunter(),
    new TwitterHunter(),
    new HackerNewsHunter(),
    new ReviewSiteHunter(), // Handles G2, Capterra, Trustpilot, ProductHunt
    new PlayStoreHunter(),
  ];
}

/**
 * Get supported platforms
 */
export function getSupportedPlatforms(): PlatformType[] {
  return ['reddit', 'twitter', 'hackernews', 'producthunt', 'g2', 'capterra', 'trustpilot', 'playstore'];
}
