/**
 * Unit tests for Stakeholder Cache
 */

import { stakeholderCache, CacheKeys, CacheTTL, withCache } from '@/lib/stakeholder/cache';

describe('StakeholderCache', () => {
  beforeEach(() => {
    stakeholderCache.clear();
  });

  describe('Basic cache operations', () => {
    it('should set and get cache values', () => {
      const key = 'test-key';
      const value = { data: 'test' };

      stakeholderCache.set(key, value);
      const retrieved = stakeholderCache.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should return null for non-existent keys', () => {
      const retrieved = stakeholderCache.get('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should respect TTL and expire entries', async () => {
      const key = 'expiring-key';
      const value = { data: 'test' };
      const shortTTL = 100; // 100ms

      stakeholderCache.set(key, value, shortTTL);

      // Should exist immediately
      expect(stakeholderCache.get(key)).toEqual(value);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      expect(stakeholderCache.get(key)).toBeNull();
    });

    it('should check if key exists', () => {
      const key = 'test-key';

      expect(stakeholderCache.has(key)).toBe(false);

      stakeholderCache.set(key, { data: 'test' });

      expect(stakeholderCache.has(key)).toBe(true);
    });

    it('should delete cache entries', () => {
      const key = 'test-key';

      stakeholderCache.set(key, { data: 'test' });
      expect(stakeholderCache.has(key)).toBe(true);

      stakeholderCache.delete(key);
      expect(stakeholderCache.has(key)).toBe(false);
    });

    it('should clear all cache entries', () => {
      stakeholderCache.set('key1', { data: 'test1' });
      stakeholderCache.set('key2', { data: 'test2' });

      expect(stakeholderCache.stats().size).toBe(2);

      stakeholderCache.clear();

      expect(stakeholderCache.stats().size).toBe(0);
    });
  });

  describe('Cache key generators', () => {
    it('should generate unique keys for different project contexts', () => {
      const key1 = CacheKeys.projectContext('project-1');
      const key2 = CacheKeys.projectContext('project-2');

      expect(key1).not.toEqual(key2);
      expect(key1).toBe('context:project-1');
      expect(key2).toBe('context:project-2');
    });

    it('should generate unique keys for different component data', () => {
      const key1 = CacheKeys.componentData('project-1', 'feedback', { limit: 10 });
      const key2 = CacheKeys.componentData('project-1', 'feedback', { limit: 20 });

      expect(key1).not.toEqual(key2);
    });

    it('should generate consistent keys for identical parameters', () => {
      const key1 = CacheKeys.queryResponse('proj-1', 'test query', 'ceo');
      const key2 = CacheKeys.queryResponse('proj-1', 'test query', 'ceo');

      expect(key1).toEqual(key2);
    });
  });

  describe('withCache helper', () => {
    it('should cache function results on first call', async () => {
      const key = 'test-with-cache';
      let callCount = 0;

      const expensiveFunction = async () => {
        callCount++;
        return { result: 'success' };
      };

      const result1 = await withCache(key, 1000, expensiveFunction);

      expect(result1).toEqual({ result: 'success' });
      expect(callCount).toBe(1);
    });

    it('should return cached result on subsequent calls', async () => {
      const key = 'test-with-cache';
      let callCount = 0;

      const expensiveFunction = async () => {
        callCount++;
        return { result: 'success' };
      };

      const result1 = await withCache(key, 1000, expensiveFunction);
      const result2 = await withCache(key, 1000, expensiveFunction);
      const result3 = await withCache(key, 1000, expensiveFunction);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
      expect(callCount).toBe(1); // Function only called once
    });

    it('should re-execute function after cache expiration', async () => {
      const key = 'test-with-cache-expiry';
      let callCount = 0;

      const expensiveFunction = async () => {
        callCount++;
        return { result: 'success', count: callCount };
      };

      const result1 = await withCache(key, 100, expensiveFunction);
      expect(result1.count).toBe(1);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      const result2 = await withCache(key, 100, expensiveFunction);
      expect(result2.count).toBe(2); // Function called again
      expect(callCount).toBe(2);
    });
  });

  describe('Cache stats', () => {
    it('should return accurate cache statistics', () => {
      stakeholderCache.set('key1', { data: 1 });
      stakeholderCache.set('key2', { data: 2 });
      stakeholderCache.set('key3', { data: 3 });

      const stats = stakeholderCache.stats();

      expect(stats.size).toBe(3);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
      expect(stats.keys).toContain('key3');
    });
  });

  describe('TTL constants', () => {
    it('should have appropriate TTL values', () => {
      expect(CacheTTL.projectContext).toBe(5 * 60 * 1000); // 5 minutes
      expect(CacheTTL.componentData).toBe(2 * 60 * 1000); // 2 minutes
      expect(CacheTTL.queryResponse).toBe(10 * 60 * 1000); // 10 minutes
      expect(CacheTTL.themesSentiment).toBe(10 * 60 * 1000); // 10 minutes
      expect(CacheTTL.events).toBe(1 * 60 * 1000); // 1 minute
    });
  });
});
