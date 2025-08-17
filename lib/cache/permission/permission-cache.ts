// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_CACHE_SIZE = 1000; // Maximum number of cached entries

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

export class PermissionCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  set(key: string, data: T): void {
    // Clean cache if it's getting too large
    if (this.cache.size >= MAX_CACHE_SIZE) {
      this.evictOldEntries();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry.data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  // Invalidate all entries for a specific user or resource
  invalidatePattern(pattern: string): void {
    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  private evictOldEntries(): void {
    // Convert to array and sort by last accessed time (LRU)
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.lastAccessed - b.lastAccessed
    );

    // Remove oldest 25% of entries
    const entriesToRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < entriesToRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  // Get cache statistics (useful for monitoring)
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed,
      })),
    };
  }

  // Clear all cache entries
  clear(): void {
    this.cache.clear();
  }

  // Get current cache size
  getSize(): number {
    return this.cache.size;
  }
}
