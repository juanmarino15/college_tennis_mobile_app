// src/services/cacheService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheConfig {
  rankings: number;
  tournaments: number;
  stats: number;
  matches: number;
  profiles: number;
  batch: number;
}

const FIVE_HOURS = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  rankings: TWENTY_FOUR_HOURS, // Rankings update weekly
  tournaments: FIVE_HOURS,
  stats: FIVE_HOURS,
  matches: FIVE_HOURS,
  profiles: TWENTY_FOUR_HOURS, // Player/team profiles rarely change
  batch: FIVE_HOURS,
};

class CacheService {
  private config: CacheConfig;
  private keyPrefix = '@tennis_cache:';

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {...DEFAULT_CACHE_CONFIG, ...config};
  }

  /**
   * Generate a cache key from category and parameters
   */
  private generateKey(category: string, params: any): string {
    const paramString = JSON.stringify(params);
    return `${this.keyPrefix}${category}:${paramString}`;
  }

  /**
   * Get data from cache
   */
  async get<T>(category: keyof CacheConfig, params: any): Promise<T | null> {
    try {
      const key = this.generateKey(category, params);
      const cached = await AsyncStorage.getItem(key);

      if (!cached) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();

      // Check if cache has expired
      if (now - entry.timestamp > entry.ttl) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      console.log(`✅ Cache HIT: ${category}`, params);
      return entry.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async set<T>(
    category: keyof CacheConfig,
    params: any,
    data: T,
  ): Promise<void> {
    try {
      const key = this.generateKey(category, params);
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: this.config[category],
      };

      await AsyncStorage.setItem(key, JSON.stringify(entry));
      console.log(`💾 Cache SET: ${category}`, params);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Wrapper function to cache API calls
   */
  async cachedCall<T>(
    category: keyof CacheConfig,
    params: any,
    apiCall: () => Promise<T>,
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(category, params);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, make API call
    console.log(`🌐 Cache MISS: ${category}`, params);
    const data = await apiCall();

    // Store in cache
    await this.set(category, params, data);

    return data;
  }
}

// Export singleton instance
export const cacheService = new CacheService();
export default cacheService;
