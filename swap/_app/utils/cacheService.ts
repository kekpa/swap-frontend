/**
 * Created: Added global caching service for efficient API data management
 *
 * This utility provides a centralized caching mechanism for API responses
 * to reduce unnecessary network requests and improve app performance.
 */

import logger from "./logger";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Cache entry interface
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Default TTL values (in milliseconds)
export const DEFAULT_CACHE_TTL = {
  // User data - longer TTL as it changes less frequently
  PROFILE: 3600000, // 1 hour
  USER_SETTINGS: 3600000, // 1 hour

  // Financial data - shorter TTL as it changes more frequently
  BALANCES: 900000, // 15 minutes
  TRANSACTIONS: 1800000, // 30 minutes

  // Map data - varies by zoom level and activity
  MAP_LOCATIONS_HIGH_ZOOM: 150000, // 2.5 minutes for high zoom (more dynamic)
  MAP_LOCATIONS_LOW_ZOOM: 600000,  // 10 minutes for low zoom (more stable)
  MAP_SEARCH: 1800000, // 30 minutes for search results

  // App data - can be cached longer
  APP_CONFIG: 86400000, // 24 hours

  // Default fallback
  DEFAULT: 300000, // 5 minutes
};

// Feature to cache key mapping
export const FEATURE_CACHE_KEYS: Record<string, string[]> = {
  wallet: ["balances", "transactions", "profile"],
  transfers: ["balances", "currencies", "profile"],
  settings: ["profile", "user_settings"],
  map: ["map-locations"], // Map viewport-based location caching
  // Add more feature mappings as needed
};

// Memory cache for faster access
const memoryCache: Record<string, CacheEntry<any>> = {};

// Pending requests tracking to prevent duplicate fetches
const pendingRequests: Record<string, Promise<any>> = {};

/**
 * Get data from cache
 * @param key Cache key
 * @returns Cached data or null if not found/expired
 */
export const getFromCache = async <T>(
  key: string
): Promise<CacheEntry<T> | null> => {
  try {
    // Try memory cache first (faster)
    if (memoryCache[key] && Date.now() < memoryCache[key].expiresAt) {
      logger.debug(`Cache hit (memory): ${key}`, "cache");
      return memoryCache[key] as CacheEntry<T>;
    }

    // Try persistent storage
    const cachedData = await AsyncStorage.getItem(`cache:${key}`);
    if (!cachedData) return null;

    const parsedData = JSON.parse(cachedData) as CacheEntry<T>;

    // Check if expired
    if (Date.now() > parsedData.expiresAt) {
      logger.debug(`Cache expired: ${key}`, "cache");
      // Clean up expired cache
      await AsyncStorage.removeItem(`cache:${key}`);
      delete memoryCache[key];
      return null;
    }

    // Update memory cache
    memoryCache[key] = parsedData;
    logger.debug(`Cache hit (storage): ${key}`, "cache");
    return parsedData;
  } catch (error) {
    logger.error(`Error getting from cache: ${key}`, error, "cache");
    return null;
  }
};

/**
 * Save data to cache
 * @param key Cache key
 * @param data Data to cache
 * @param ttl Time to live in milliseconds
 */
export const saveToCache = async <T>(
  key: string,
  data: T,
  ttl: number = DEFAULT_CACHE_TTL.DEFAULT
): Promise<void> => {
  try {
    const now = Date.now();
    const cacheEntry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    };

    // Save to memory cache
    memoryCache[key] = cacheEntry;

    // Save to persistent storage
    await AsyncStorage.setItem(`cache:${key}`, JSON.stringify(cacheEntry));

    logger.debug(
      `Cached: ${key} (expires in ${Math.round(ttl / 60000)}m)`,
      "cache"
    );
  } catch (error) {
    logger.error(`Error saving to cache: ${key}`, error, "cache");
  }
};

/**
 * Remove item from cache
 * @param key Cache key
 */
export const removeFromCache = async (key: string): Promise<void> => {
  try {
    // Remove from memory cache
    delete memoryCache[key];

    // Remove from persistent storage
    await AsyncStorage.removeItem(`cache:${key}`);

    logger.debug(`Removed from cache: ${key}`, "cache");
  } catch (error) {
    logger.error(`Error removing from cache: ${key}`, error, "cache");
  }
};

/**
 * Clear all cache
 */
export const clearCache = async (): Promise<void> => {
  try {
    // Clear memory cache
    Object.keys(memoryCache).forEach((key) => {
      delete memoryCache[key];
    });

    // Get all cache keys
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith("cache:"));

    // Remove all cache items
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }

    logger.info(`Cleared ${cacheKeys.length} cache entries`, "cache");
  } catch (error) {
    logger.error("Error clearing cache", error, "cache");
  }
};

/**
 * Fetch with cache
 * @param key Cache key
 * @param fetchFn Function to fetch data if not in cache
 * @param ttl Time to live in milliseconds
 * @param forceRefresh Force refresh (ignore cache)
 * @param feature Optional feature name for refresh state tracking
 * @returns Fetched or cached data
 */
export const fetchWithCache = async <T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = DEFAULT_CACHE_TTL.DEFAULT,
  forceRefresh: boolean = false,
  feature?: string
): Promise<T> => {
  try {
    // If there's already a pending request for this key, return that promise
    // to avoid duplicate fetches for the same resource
    if (key in pendingRequests) {
      logger.debug(`Using pending request for: ${key}`, "cache");
      return pendingRequests[key];
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = await getFromCache<T>(key);
      if (cachedData) {
        return cachedData.data;
      }
    }

    // Create the fetch promise and store it
    const fetchPromise = (async () => {
      try {
        // Fetch fresh data
        logger.debug(
          `Fetching fresh data: ${key}${
            feature ? ` for feature: ${feature}` : ""
          }`,
          "cache"
        );
        const data = await fetchFn();

        // Save to cache
        await saveToCache(key, data, ttl);

        return data;
      } finally {
        // Clean up the pending request when done
        delete pendingRequests[key];
      }
    })();

    // Store the promise to prevent duplicate requests
    pendingRequests[key] = fetchPromise;

    return fetchPromise;
  } catch (error) {
    // Clean up the pending request on error
    delete pendingRequests[key];

    logger.error(`Error in fetchWithCache: ${key}`, error, "cache");
    throw error;
  }
};

/**
 * Clear cache for a specific category
 * @param prefix Cache key prefix
 */
export const clearCacheCategory = async (prefix: string): Promise<void> => {
  try {
    // Clear from memory cache
    Object.keys(memoryCache).forEach((key) => {
      if (key.startsWith(prefix)) {
        delete memoryCache[key];
      }
    });

    // Get all cache keys
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(
      (key) => key.startsWith("cache:") && key.substring(6).startsWith(prefix)
    );

    // Remove matching cache items
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }

    logger.info(
      `Cleared ${cacheKeys.length} cache entries for category: ${prefix}`,
      "cache"
    );
  } catch (error) {
    logger.error(`Error clearing cache category: ${prefix}`, error, "cache");
  }
};

/**
 * Clear cache for a specific feature
 * @param feature Feature name
 */
export const clearFeatureCache = async (feature: string): Promise<void> => {
  try {
    const cacheKeys = FEATURE_CACHE_KEYS[feature];

    if (!cacheKeys || cacheKeys.length === 0) {
      logger.warn(`No cache keys defined for feature: ${feature}`, "cache");
      return;
    }

    // Clear each cache key associated with the feature
    for (const key of cacheKeys) {
      await removeFromCache(key);
    }

    logger.info(`Cleared cache for feature: ${feature}`, "cache");
  } catch (error) {
    logger.error(`Error clearing feature cache: ${feature}`, error, "cache");
  }
};

/**
 * Check if a cache key is stale (older than a certain threshold)
 * @param key Cache key
 * @param threshold Threshold in milliseconds (default: 5 minutes)
 * @returns Boolean indicating if cache is stale
 */
export const isCacheStale = async (
  key: string,
  threshold: number = 300000 // 5 minutes
): Promise<boolean> => {
  try {
    const cachedData = await getFromCache(key);
    if (!cachedData) return true;

    const now = Date.now();
    return now - cachedData.timestamp > threshold;
  } catch (error) {
    logger.error(`Error checking if cache is stale: ${key}`, error, "cache");
    return true; // Assume stale on error
  }
};

export default {
  getFromCache,
  saveToCache,
  removeFromCache,
  clearCache,
  fetchWithCache,
  clearCacheCategory,
  clearFeatureCache,
  isCacheStale,
  DEFAULT_CACHE_TTL,
  FEATURE_CACHE_KEYS,
};
