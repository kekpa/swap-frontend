// Created: useLocalTimeline hook for WhatsApp-grade local-first architecture - 2025-12-22
// Updated: 2025-12-23 - Implemented stale-while-revalidate + debounced events
// REACTIVE: Reads from SQLite, updates automatically on changes
// STALE-WHILE-REVALIDATE: Show cached data instantly, sync in background

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import debounce from 'lodash/debounce';
import logger from '../utils/logger';
import { eventEmitter } from '../utils/eventEmitter';
import { useCurrentEntityId } from '../hooks/useCurrentEntityId';
import {
  unifiedTimelineRepository,
  TIMELINE_UPDATED_EVENT,
  TimelineUpdateEvent,
} from '../localdb/UnifiedTimelineRepository';
import {
  LocalTimelineItem,
  isProcessingStatus,
  isTerminalStatus,
} from '../localdb/schema/local-timeline-schema';
import { timelineSyncService } from '../services/TimelineSyncService';

// Stale data threshold: 5 minutes
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

// Re-export types for convenience
export type { LocalTimelineItem, TimelineUpdateEvent };
export { isProcessingStatus, isTerminalStatus };

export interface UseLocalTimelineOptions {
  /** Page size for pagination */
  pageSize?: number;
  /** Whether to enable the hook */
  enabled?: boolean;
}

export interface UseLocalTimelineResult {
  /** Timeline items sorted by created_at DESC */
  items: LocalTimelineItem[];
  /** Loading state (initial load) */
  isLoading: boolean;
  /** Whether more items are available */
  hasMore: boolean;
  /** Error if any */
  error: Error | null;
  /** Manually refresh the timeline */
  refetch: () => Promise<void>;
  /** Load more items (pagination) */
  loadMore: () => Promise<void>;
  /** Loading more state */
  isLoadingMore: boolean;
  /** Total count of items */
  totalCount: number;
}

/**
 * useLocalTimeline - Reactive hook for local-first timeline
 *
 * INSTANT: Reads from SQLite, updates automatically on changes
 * NO NETWORK DEPENDENCY for displaying data
 *
 * Features:
 * - Reads directly from local_timeline SQLite table
 * - Subscribes to eventEmitter for reactive updates
 * - Profile-isolated data
 * - Pagination support
 * - Automatic refresh on timeline changes
 *
 * @param interactionId - The interaction to show timeline for
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * const { items, isLoading, loadMore, hasMore } = useLocalTimeline(interactionId);
 *
 * // items updates automatically when:
 * // - A new message/transaction is added locally
 * // - Sync status changes (pending → synced → completed)
 * // - Failed items are retried
 * ```
 */
export const useLocalTimeline = (
  interactionId: string | null | undefined,
  options: UseLocalTimelineOptions = {}
): UseLocalTimelineResult => {
  const { pageSize = 50, enabled = true } = options;

  // Get current entity ID for isolation (backend's universal identifier)
  const entityId = useCurrentEntityId();

  // State
  const [items, setItems] = useState<LocalTimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Refs for tracking
  const offsetRef = useRef(0);
  const isMountedRef = useRef(true);
  // Track if background sync is in progress (prevent duplicate syncs)
  const isSyncingRef = useRef(false);
  // Track last sync time for stale-while-revalidate
  const lastSyncTimeRef = useRef<number>(0);
  // Track if we've already attempted sync for this interaction (prevent infinite loops)
  const syncAttemptedRef = useRef<string | null>(null);

  /**
   * Check if cached data is stale (older than threshold)
   */
  const isDataStale = useCallback((timelineItems: LocalTimelineItem[]): boolean => {
    if (timelineItems.length === 0) return true;

    // Check most recent item's created_at (now at END since sorted ASC)
    const mostRecent = timelineItems[timelineItems.length - 1]; // Sorted ASC, newest at end
    if (!mostRecent.created_at) return true;

    // Data is stale if we haven't synced in the last 5 minutes
    const timeSinceLastSync = Date.now() - lastSyncTimeRef.current;
    const isStale = timeSinceLastSync > STALE_THRESHOLD_MS;

    return isStale;
  }, []);

  /**
   * Load timeline from SQLite - STALE-WHILE-REVALIDATE pattern
   *
   * 1. Always show cached data INSTANTLY (no blocking)
   * 2. Check if data is stale (empty or older than threshold)
   * 3. Sync in background if stale (don't await - invisible to user)
   * 4. UI updates seamlessly when sync completes
   */
  const loadTimeline = useCallback(
    async (reset: boolean = true) => {
      if (!interactionId || !entityId || !enabled) {
        logger.debug('[useLocalTimeline] Skipping load - missing requirements', 'data', {
          interactionId,
          entityId,
          enabled,
        });
        setItems([]);
        setIsLoading(false);
        return;
      }

      try {
        // Only show loading state on initial load (not on refreshes from events)
        const isInitialLoad = reset && items.length === 0;
        if (isInitialLoad) {
          setIsLoading(true);
        }

        if (reset) {
          offsetRef.current = 0;
        } else {
          setIsLoadingMore(true);
        }

        const offset = reset ? 0 : offsetRef.current;

        logger.debug(`[useLocalTimeline] Loading timeline for ${interactionId}`, 'data', {
          offset,
          pageSize,
          entityId,
        });

        // 1. INSTANT: Read from SQLite (local cache)
        const timelineItems = await unifiedTimelineRepository.getTimeline(
          interactionId,
          entityId,
          pageSize,
          offset
        );

        // Get total count for hasMore calculation
        const count = await unifiedTimelineRepository.getTimelineCount(interactionId, entityId);

        if (!isMountedRef.current) return;

        // 2. INSTANT: Update UI with cached data (even if stale)
        // Deduplicate by ID (defensive - handles stale cache with potential duplicates)
        const deduplicateById = (items: LocalTimelineItem[]): LocalTimelineItem[] => {
          const seen = new Set<string>();
          return items.filter((item) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        };

        if (reset) {
          const uniqueItems = deduplicateById(timelineItems);
          setItems(uniqueItems);
          offsetRef.current = uniqueItems.length;
        } else {
          setItems((prev) => {
            const combined = [...prev, ...timelineItems];
            return deduplicateById(combined);
          });
          offsetRef.current += timelineItems.length;
        }

        setTotalCount(count);
        setHasMore(offsetRef.current < count);
        setError(null);

        // Always stop loading - we showed data (or empty state)
        setIsLoading(false);
        setIsLoadingMore(false);

        logger.debug(`[useLocalTimeline] Loaded ${timelineItems.length} items (instant display)`, 'data', {
          total: count,
          offset: offsetRef.current,
          hasMore: offsetRef.current < count,
        });

        // 3. BACKGROUND: Check if data is stale and needs sync
        // GUARD: Only sync once per interaction to prevent infinite loops
        // If sync already attempted for this interaction and still empty, don't retry
        const alreadySyncedThisInteraction = syncAttemptedRef.current === interactionId;

        if (reset && !isSyncingRef.current && !alreadySyncedThisInteraction) {
          const needsSync = isDataStale(timelineItems);

          if (needsSync) {
            isSyncingRef.current = true;
            syncAttemptedRef.current = interactionId; // Mark as attempted
            logger.info(`[useLocalTimeline] 🔄 Background sync for ${interactionId} (stale data, entityId: ${entityId})`);

            // DON'T AWAIT - sync runs in background, user sees cached data instantly
            timelineSyncService.syncInteraction(interactionId)
              .then(() => {
                lastSyncTimeRef.current = Date.now();
                logger.debug(`[useLocalTimeline] ✅ Background sync completed for ${interactionId}`);
              })
              .catch((syncErr) => {
                logger.error('[useLocalTimeline] Background sync failed:', syncErr);
              })
              .finally(() => {
                isSyncingRef.current = false;
              });
          }
        } else if (alreadySyncedThisInteraction && timelineItems.length === 0) {
          // DEBUG: Log potential entity_id mismatch
          logger.warn(`[useLocalTimeline] ⚠️ Sync attempted but still empty for ${interactionId}. Possible entity_id mismatch (query entityId: ${entityId})`);
        }
      } catch (err) {
        logger.error('[useLocalTimeline] Error loading timeline:', err);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [interactionId, entityId, pageSize, enabled, items.length, isDataStale]
  );

  /**
   * Refetch (reset and reload)
   */
  const refetch = useCallback(async () => {
    await loadTimeline(true);
  }, [loadTimeline]);

  /**
   * Load more items (pagination)
   */
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }
    await loadTimeline(false);
  }, [loadTimeline, isLoadingMore, hasMore]);

  /**
   * DEBOUNCED: Reload timeline (batches multiple events into single reload)
   * 10 events within 300ms = 1 reload instead of 10
   */
  const debouncedLoadTimeline = useMemo(
    () =>
      debounce(
        () => {
          logger.debug(`[useLocalTimeline] 🔄 Debounced reload triggered for ${interactionId}`);
          loadTimeline(true);
        },
        300,
        { leading: false, trailing: true }
      ),
    [loadTimeline, interactionId]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedLoadTimeline.cancel();
    };
  }, [debouncedLoadTimeline]);

  /**
   * Handle timeline update events (reactive updates)
   * Uses debouncing to prevent cascading reloads
   */
  const handleTimelineUpdate = useCallback(
    (event: TimelineUpdateEvent) => {
      // Only handle events for this interaction
      if (event.interactionId !== interactionId) {
        return;
      }

      // Only handle events for current profile
      if (event.entityId !== entityId) {
        return;
      }

      logger.debug(`[useLocalTimeline] Received update event for ${interactionId}`, 'data', { event });

      // Use debounced reload to batch multiple events
      debouncedLoadTimeline();
    },
    [interactionId, entityId, debouncedLoadTimeline]
  );

  // Initial load
  useEffect(() => {
    isMountedRef.current = true;
    loadTimeline(true);

    return () => {
      isMountedRef.current = false;
    };
  }, [loadTimeline]);

  // Subscribe to timeline updates (reactive)
  // NOTE: This listener is DIFFERENT from TanStack Query hooks (useInteractions, useWalletTransactions)
  // - This hook reads directly from SQLite (instant, no API calls)
  // - The listener triggers SQLite reads, not API invalidations
  // - Already debounced above (debouncedLoadTimeline) - no flood risk
  // - Centralized handler in queryClient.ts handles TanStack Query invalidation
  useEffect(() => {
    if (!interactionId || !entityId || !enabled) {
      return;
    }

    logger.debug(`[useLocalTimeline] Subscribing to timeline updates for ${interactionId}`);

    eventEmitter.on(TIMELINE_UPDATED_EVENT, handleTimelineUpdate);

    return () => {
      logger.debug(`[useLocalTimeline] Unsubscribing from timeline updates for ${interactionId}`);
      eventEmitter.off(TIMELINE_UPDATED_EVENT, handleTimelineUpdate);
    };
  }, [interactionId, entityId, enabled, handleTimelineUpdate]);

  return {
    items,
    isLoading,
    hasMore,
    error,
    refetch,
    loadMore,
    isLoadingMore,
    totalCount,
  };
};

/**
 * Helper hook to get a single timeline item by ID
 */
export const useLocalTimelineItem = (
  itemId: string | null | undefined
): { item: LocalTimelineItem | null; isLoading: boolean } => {
  const [item, setItem] = useState<LocalTimelineItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!itemId) {
      setItem(null);
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const loadItem = async () => {
      try {
        const result = await unifiedTimelineRepository.getItemById(itemId);
        if (mounted) {
          setItem(result);
          setIsLoading(false);
        }
      } catch (err) {
        logger.error(`[useLocalTimelineItem] Error loading item ${itemId}:`, err);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadItem();

    // Subscribe to updates for this item
    const handleUpdate = (event: TimelineUpdateEvent) => {
      if (event.itemId === itemId) {
        loadItem();
      }
    };

    eventEmitter.on(TIMELINE_UPDATED_EVENT, handleUpdate);

    return () => {
      mounted = false;
      eventEmitter.off(TIMELINE_UPDATED_EVENT, handleUpdate);
    };
  }, [itemId]);

  return { item, isLoading };
};

export default useLocalTimeline;
