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
import { PlatformType } from '@/types/hunter';

// Export all hunters
export { BaseHunter } from './base-hunter';
export { RedditHunter } from './reddit-hunter';
export { TwitterHunter } from './twitter-hunter';
export { HackerNewsHunter } from './hackernews-hunter';
export { ProductHuntHunter } from './producthunt-hunter';
export { G2Hunter } from './g2-hunter';

/**
 * Factory function to get the appropriate hunter for a platform
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
      return new ProductHuntHunter();
    case 'g2':
      return new G2Hunter();
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
    new ProductHuntHunter(),
    new G2Hunter(),
  ];
}

/**
 * Get supported platforms
 */
export function getSupportedPlatforms(): PlatformType[] {
  return ['reddit', 'twitter', 'hackernews', 'producthunt', 'g2'];
}
