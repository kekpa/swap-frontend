/**
 * Memoized Date Formatting Utility
 *
 * Professional solution for timestamp glitches during data refreshes.
 * Caches formatted timestamps so they don't recalculate on every render.
 *
 * Created: 2025-12-24
 * Purpose: Fix visual glitches where timestamps appear to "change" during
 *          periodic refreshes even when the underlying data hasn't changed.
 */

import logger from './logger';

interface CachedTimestamp {
  formatted: string;
  calculatedAt: number;
}

// Cache for formatted timestamps - key is `${id}-${dateString}`
const timestampCache = new Map<string, CachedTimestamp>();

// How long to keep cached timestamps (1 minute)
// This allows for day boundary crossings ("Today" → "Yesterday") to update
const CACHE_TTL_MS = 60000;

// Maximum cache size to prevent memory issues
const MAX_CACHE_SIZE = 500;

/**
 * Calculate relative time string from a date
 * Extracted from TransactionListScreen for reuse
 */
const calculateRelativeTime = (dateString: string): string => {
  if (!dateString) return 'Recent';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Recent';

    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `Today, ${timeString}`;
    } else if (diffInHours < 48) {
      const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `Yesterday, ${timeString}`;
    } else {
      const formattedDate = date.toLocaleDateString();
      const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${formattedDate}, ${timeString}`;
    }
  } catch (error) {
    logger.debug('[dateFormatting] Error calculating relative time: ' + String(error), 'data');
    return 'Recent';
  }
};

/**
 * Get a memoized formatted timestamp
 *
 * Returns cached value if:
 * 1. Cache entry exists for this id+dateString
 * 2. Cache entry is less than CACHE_TTL_MS old
 *
 * Otherwise recalculates and caches the result.
 *
 * @param id - Unique identifier for the item (transaction ID, message ID, etc.)
 * @param dateString - ISO date string to format
 * @returns Formatted relative timestamp string
 */
export const formatRelativeTimestamp = (id: string, dateString: string): string => {
  const cacheKey = `${id}-${dateString}`;
  const cached = timestampCache.get(cacheKey);

  const now = Date.now();

  // Use cached value if still valid
  if (cached && (now - cached.calculatedAt) < CACHE_TTL_MS) {
    return cached.formatted;
  }

  // Calculate new formatted timestamp
  const formatted = calculateRelativeTime(dateString);

  // Manage cache size
  if (timestampCache.size >= MAX_CACHE_SIZE) {
    clearOldTimestampCache();
  }

  // Cache the result
  timestampCache.set(cacheKey, { formatted, calculatedAt: now });
  return formatted;
};

/**
 * Clear old entries from the timestamp cache
 * Removes entries older than 5x the TTL
 */
export const clearOldTimestampCache = (): void => {
  const now = Date.now();
  const maxAge = CACHE_TTL_MS * 5;
  let cleared = 0;

  for (const [key, value] of timestampCache.entries()) {
    if (now - value.calculatedAt > maxAge) {
      timestampCache.delete(key);
      cleared++;
    }
  }

  if (cleared > 0) {
    logger.debug(`[dateFormatting] Cleared ${cleared} old timestamp cache entries`, 'data');
  }
};

/**
 * Clear the entire timestamp cache
 * Useful for testing or when user changes locale
 */
export const clearTimestampCache = (): void => {
  const size = timestampCache.size;
  timestampCache.clear();
  logger.debug(`[dateFormatting] Cleared all ${size} timestamp cache entries`, 'data');
};

/**
 * Get cache statistics for debugging
 */
export const getTimestampCacheStats = (): { size: number; maxSize: number; ttlMs: number } => {
  return {
    size: timestampCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttlMs: CACHE_TTL_MS,
  };
};

// Re-export the raw calculator for cases where memoization isn't needed
export { calculateRelativeTime };
