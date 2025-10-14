import crypto from 'crypto';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  key: string;
}

/**
 * Simple in-memory LRU cache with TTL support
 */
class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize: number = 100, ttlMs: number = 120000) { // Default 120s TTL
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  /**
   * Generate a hash key from preferences
   */
  private generateKey(sessionId: string, preferences: any): string {
    const prefsString = JSON.stringify(preferences, Object.keys(preferences).sort());
    const hash = crypto.createHash('md5').update(prefsString).digest('hex');
    return `${sessionId}|${hash}`;
  }

  /**
   * Check if an entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > this.ttlMs;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cached value
   */
  get(sessionId: string, preferences: any): T | null {
    const key = this.generateKey(sessionId, preferences);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set cached value
   */
  set(sessionId: string, preferences: any, value: T): void {
    const key = this.generateKey(sessionId, preferences);

    // Remove if already exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // If at capacity, remove least recently used
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    // Add new entry
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      key
    };

    this.cache.set(key, entry);

    // Periodic cleanup
    if (Math.random() < 0.1) { // 10% chance to trigger cleanup
      this.cleanup();
    }
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let validCount = 0;

    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > this.ttlMs) {
        expiredCount++;
      } else {
        validCount++;
      }
    }

    return {
      totalSize: this.cache.size,
      validEntries: validCount,
      expiredEntries: expiredCount,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs
    };
  }
}

// Global cache instance for recommendations
export const recommendationsCache = new LRUCache(100, 120000); // 100 entries, 2 minutes TTL

/**
 * Cache wrapper function for recommendation handlers
 */
export function withCache<T>(
  handler: () => Promise<T> | T,
  sessionId: string,
  preferences: any
): Promise<T> {
  return new Promise<T>(async (resolve, reject) => {
    try {
      // Try to get from cache first
      const cached = recommendationsCache.get(sessionId, preferences);
      if (cached) {
        resolve(cached as T);
        return;
      }

      // Execute handler
      const result = await handler();

      // Cache the result
      recommendationsCache.set(sessionId, preferences, result);

      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}