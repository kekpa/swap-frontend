// TanStack Query hook for interaction timeline with local-first pattern
// Replaces custom deduplicateRequest function in DataContext
// Created: 2025-01-10 for TanStack Query migration

import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import apiClient from '../_api/apiClient';
import { API_PATHS } from '../_api/apiPaths';
import { TimelineItem, MessageTimelineItem, TransactionTimelineItem } from '../types/timeline.types';
import { queryKeys } from '../tanstack-query/queryKeys';
import logger from '../utils/logger';
import { useAuthContext } from '../features/auth/context/AuthContext';
import { timelineRepository } from '../localdb/TimelineRepository';
import { messageRepository } from '../localdb/MessageRepository';
import { transactionRepository } from '../localdb/TransactionRepository';

export interface UseTimelineOptions {
  enabled?: boolean;
  forceRefresh?: boolean;
  silentUpdate?: boolean;
  limit?: number;
}

export interface UseTimelineResult {
  timeline: TimelineItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isRefetching: boolean;
  isFetching: boolean;
}

/**
 * TanStack Query hook for interaction timeline with local-first pattern
 * 
 * Features:
 * - Automatic request deduplication (replaces custom deduplicateRequest)
 * - Local-first loading from SQLite cache
 * - Background sync with API
 * - Optimistic updates support
 * - Network-aware caching
 * 
 * @param interactionId - The interaction ID to fetch timeline for
 * @param options - Configuration options
 */
export const useTimeline = (
  interactionId: string,
  options: UseTimelineOptions = {}
): UseTimelineResult => {
  const {
    enabled = true,
    forceRefresh = false,
    silentUpdate = false,
    limit = 100
  } = options;

  const authContext = useAuthContext();
  const user = authContext?.user;
  const queryClient = useQueryClient();

  // Debug logging
  logger.debug(`[useTimeline] 🚀 HOOK CALLED: interactionId=${interactionId}, enabled=${enabled}, user=${user?.entityId}`, 'timeline_query');

  // Local-first timeline fetcher (WhatsApp-style)
  const fetchTimeline = useCallback(async (): Promise<TimelineItem[]> => {
    if (!interactionId) {
      logger.debug('[useTimeline] No interaction ID provided');
      return [];
    }

    logger.debug(`[useTimeline] 🚀 QUERY FUNCTION CALLED for interactionId: ${interactionId}`, 'timeline_query');
    logger.debug(`[useTimeline] Fetching timeline for interaction: ${interactionId}`, 'timeline_query');

    // SECURITY FIX: Validate profileId for data isolation
    if (!user?.profileId) {
      logger.warn('[useTimeline] Missing profileId, aborting to prevent data leakage', 'timeline_query');
      return [];
    }

    // STEP 1: ALWAYS load from local SQLite first (WhatsApp behavior)
    let localTimelineItems: TimelineItem[] = [];
    let hasLocalData = false;

    try {
      if (await messageRepository.isSQLiteAvailable()) {
        logger.debug(`[useTimeline] Loading from local cache: ${interactionId}`, 'timeline_query');
        
        // Get local timeline data
        const localTimeline = await timelineRepository.getTimelineForInteraction(
          interactionId,
          user.profileId,  // Add profileId for profile isolation
          limit,
          {
            includeMessages: true,
            includeTransactions: true,
            filter: 'all',
            currentUserEntityId: user?.entityId
          }
        );

        if (localTimeline.length > 0) {
          // Add date separators to local timeline
          localTimelineItems = timelineRepository.addDateSeparators(localTimeline);
          hasLocalData = true;
          
          logger.debug(`[useTimeline] ✅ INSTANT: Loaded ${localTimeline.length} items from SQLite cache (${localTimelineItems.length} with dates)`, 'timeline_query');
          
          // WHATSAPP BEHAVIOR: Return local data immediately and sync in background
          setTimeout(async () => {
            try {
              logger.debug(`[useTimeline] 🔄 Background sync starting for: ${interactionId}`, 'timeline_query');
              
              const path = API_PATHS.INTERACTION.TIMELINE(interactionId);
              const params: any = { limit };
              
              if (user?.entityId) {
                params.currentUserEntityId = user.entityId;
              }
              
              logger.debug(`[useTimeline] 🚀 BACKGROUND API CALL: ${path}`, 'timeline_query', { params });
              const response = await apiClient.get(path, { params });
              
              let fetchedItems: any[] = [];
              const raw = response.data;

              // Parse API response - handle multiple possible formats including double-stringified
              if (Array.isArray(raw?.items)) {
                fetchedItems = raw.items;
              } else if (raw?.data && Array.isArray(raw.data.items)) {
                fetchedItems = raw.data.items;
              } else if (typeof raw?.items === 'string') {
                // Handle stringified response
                try {
                  const parsedItems = JSON.parse(raw.items);
                  if (Array.isArray(parsedItems)) {
                    fetchedItems = parsedItems;
                  } else if (parsedItems && typeof parsedItems === 'object') {
                    // Handle object with numeric keys (common backend serialization)
                    fetchedItems = Object.values(parsedItems).map(item => {
                      if (typeof item === 'string') {
                        try {
                          return JSON.parse(item);
                        } catch {
                          return item;
                        }
                      }
                      return item;
                    });
                  }
                } catch (parseError) {
                  logger.warn(`[useTimeline] Background sync - Error parsing stringified items: ${String(parseError)}`, 'timeline_query');
                }
              }
              
              if (fetchedItems.length > 0) {
                logger.debug(`[useTimeline] 🔄 Background sync: Got ${fetchedItems.length} items from API`, 'timeline_query');
                
                // Save to local cache in background
                const messagesToSave = fetchedItems
                  .filter(item => (item.type === 'message' || item.itemType === 'message') && item.id && item.interaction_id)
                  .map(item => ({
                    ...item,
                    id: String(item.id),
                    interaction_id: String(item.interaction_id),
                    itemType: 'message',
                    type: 'message',
                    sender_entity_id: item.sender_entity_id ? String(item.sender_entity_id) : 'system_or_unknown',
                    created_at: typeof item.createdAt === 'number' ? new Date(item.createdAt).toISOString() : String(item.createdAt || item.timestamp),
                    metadata: { ...item.metadata, isOptimistic: false }
                  }));
                  
                const transactionsToSave = fetchedItems
                  .filter(item => (item.type === 'transaction' || item.itemType === 'transaction') && item.id && item.interaction_id)
                  .map(item => ({
                    ...item,
                    id: String(item.id),
                    interaction_id: String(item.interaction_id),
                    itemType: 'transaction',
                    type: 'transaction',
                    from_account_id: item.from_account_id || item.from_entity_id,
                    to_account_id: item.to_account_id || item.to_entity_id,
                    created_at: typeof item.createdAt === 'number' ? new Date(item.createdAt).toISOString() : String(item.createdAt || item.timestamp),
                    status: item.status || 'completed',
                    transaction_type: item.transaction_type || 'transfer',
                    entry_type: item.entry_type,
                    metadata: { ...item.metadata, isOptimistic: false }
                  }));

                // Save to repositories and update TanStack Query cache
                if (messagesToSave.length > 0) {
                  await messageRepository.saveMessages(messagesToSave, user.profileId);
                }

                if (transactionsToSave.length > 0) {
                  await transactionRepository.saveTransactions(transactionsToSave, user.profileId);
                }
                
                // Update TanStack Query cache with new data
                const updatedTimeline = timelineRepository.addDateSeparators(fetchedItems);
                queryClient.setQueryData(queryKeys.timelineWithLimit(interactionId, limit), updatedTimeline);
                
                logger.debug(`[useTimeline] ✅ Background sync complete: Updated cache with ${fetchedItems.length} items`, 'timeline_query');
              }
            } catch (apiError) {
              logger.debug(`[useTimeline] Background API sync failed (not critical): ${String(apiError)}`, 'timeline_query');
            }
          }, 100); // Small delay to ensure UI renders first
          
          return localTimelineItems;
        } else {
          logger.debug(`[useTimeline] No local cache found for: ${interactionId}`, 'timeline_query');
        }
      }
    } catch (localError) {
      logger.warn(`[useTimeline] Error loading from local cache: ${String(localError)}`, 'timeline_query');
    }

    // STEP 2: No local data - fetch from API (first time loading)
    try {
      const path = API_PATHS.INTERACTION.TIMELINE(interactionId);
      const params: any = { limit };
      
      if (user?.entityId) {
        params.currentUserEntityId = user.entityId;
        logger.debug(`[useTimeline] Adding currentUserEntityId: ${user.entityId}`, 'timeline_query');
      }
      
      logger.debug(`[useTimeline] 🚀 MAKING API CALL: ${path}`, 'timeline_query', { params });
      const response = await apiClient.get(path, { params });
      logger.debug(`[useTimeline] 📥 API RESPONSE RECEIVED: status=${response.status}, dataType=${typeof response.data}`, 'timeline_query');
      
      let fetchedItems: any[] = [];
      const raw = response.data;

      // Parse API response - handle multiple possible formats including double-stringified
      if (Array.isArray(raw?.items)) {
        fetchedItems = raw.items;
        logger.debug(`[useTimeline] 📋 Parsed items from raw.items: ${fetchedItems.length} items`, 'timeline_query');
      } else if (raw?.data && Array.isArray(raw.data.items)) {
        fetchedItems = raw.data.items;
        logger.debug(`[useTimeline] 📋 Parsed items from raw.data.items: ${fetchedItems.length} items`, 'timeline_query');
      } else if (typeof raw?.items === 'string') {
        // Handle stringified response
        try {
          const parsedItems = JSON.parse(raw.items);
          if (Array.isArray(parsedItems)) {
            fetchedItems = parsedItems;
            logger.debug(`[useTimeline] 📋 Parsed items from stringified raw.items: ${fetchedItems.length} items`, 'timeline_query');
          } else if (parsedItems && typeof parsedItems === 'object') {
            // Handle object with numeric keys (common backend serialization)
            fetchedItems = Object.values(parsedItems).map(item => {
              if (typeof item === 'string') {
                try {
                  return JSON.parse(item);
                } catch {
                  return item;
                }
              }
              return item;
            });
            logger.debug(`[useTimeline] 📋 Parsed items from object with numeric keys: ${fetchedItems.length} items`, 'timeline_query');
          }
        } catch (parseError) {
          logger.warn(`[useTimeline] Error parsing stringified items: ${String(parseError)}`, 'timeline_query');
        }
      } else {
        logger.warn(`[useTimeline] Unexpected API response format:`, 'timeline_query', { raw });
      }
      
      logger.debug(`[useTimeline] Retrieved ${fetchedItems.length} API timeline items`, 'timeline_query');

      if (fetchedItems.length > 0) {
        // Add date separators to API timeline
        const timelineWithDates = timelineRepository.addDateSeparators(fetchedItems);
        
        logger.info(`[useTimeline] API timeline loaded: ${fetchedItems.length} items`, 'timeline_query');

        // Save to local cache for future instant loading
        if (await messageRepository.isSQLiteAvailable()) {
          const messagesToSave = fetchedItems
            .filter(item => (item.type === 'message' || item.itemType === 'message') && item.id && item.interaction_id)
            .map(item => ({
              ...item,
              id: String(item.id),
              interaction_id: String(item.interaction_id),
              itemType: 'message',
              type: 'message',
              sender_entity_id: item.sender_entity_id ? String(item.sender_entity_id) : 'system_or_unknown',
              created_at: typeof item.createdAt === 'number' ? new Date(item.createdAt).toISOString() : String(item.createdAt || item.timestamp),
              metadata: { ...item.metadata, isOptimistic: false }
            }));
            
          const transactionsToSave = fetchedItems
            .filter(item => (item.type === 'transaction' || item.itemType === 'transaction') && item.id && item.interaction_id)
            .map(item => ({
              ...item,
              id: String(item.id),
              interaction_id: String(item.interaction_id),
              itemType: 'transaction',
              type: 'transaction',
              from_account_id: item.from_account_id || item.from_entity_id,
              to_account_id: item.to_account_id || item.to_entity_id,
              created_at: typeof item.createdAt === 'number' ? new Date(item.createdAt).toISOString() : String(item.createdAt || item.timestamp),
              status: item.status || 'completed',
              transaction_type: item.transaction_type || 'transfer',
              entry_type: item.entry_type,
              metadata: { ...item.metadata, isOptimistic: false }
            }));

          // Save to repositories
          if (messagesToSave.length > 0) {
            messageRepository.saveMessages(messagesToSave, user.profileId).catch((err: any) => {
              logger.warn('[useTimeline] Error saving API messages to local DB', 'timeline_query', { error: String(err) });
            });
          }

          if (transactionsToSave.length > 0) {
            transactionRepository.saveTransactions(transactionsToSave, user.profileId).catch((err: any) => {
              logger.warn('[useTimeline] Error saving API transactions to local DB', 'timeline_query', { error: String(err) });
            });
          }
        }

        return timelineWithDates;
      } else {
        // No API data, return empty array
        return [];
      }
    } catch (apiError) {
      logger.error(`[useTimeline] Failed to fetch API timeline`, apiError, 'timeline_query');
      // Return empty array on API error
      return [];
    }
  }, [interactionId, limit, user?.entityId, queryClient]);

  // TanStack Query configuration for TRUE LOCAL-FIRST behavior (WhatsApp-style)
  const queryResult = useQuery({
    queryKey: queryKeys.timelineWithLimit(interactionId, limit),
    queryFn: () => {
      logger.debug(`[useTimeline] 🚀 QUERY FUNCTION CALLED for interactionId: ${interactionId}`, 'timeline_query');
      return fetchTimeline();
    },
    enabled: enabled && !!interactionId && !!user?.entityId, // CRITICAL: Ensure user is available
    staleTime: 10 * 60 * 1000, // 10 minutes - longer staleness for better UX
    gcTime: 60 * 60 * 1000, // 1 hour - keep in cache much longer
    refetchOnWindowFocus: false, // Never refetch on window focus
    refetchOnReconnect: true, // Only refetch when coming back online
    refetchOnMount: false, // OPTIMIZED: Don't refetch if we have cached data
    
    // WHATSAPP-STYLE: Prioritize cached data
    networkMode: 'offlineFirst', // Prefer cached data over network
    
    // Background updates without blocking UI
    refetchInterval: false, // Disable automatic background refetch
    refetchIntervalInBackground: false,
    
    // Optimize for instant loading
    structuralSharing: true,
    
    // PROFESSIONAL: Add placeholderData for smoother transitions
    placeholderData: (previousData) => previousData,
    
    // Conservative retry for timeline data with CancelledError handling
    retry: (failureCount, error: any) => {
      if (!interactionId || !enabled) return false;
      
      // Don't retry for CancelledError - this is expected behavior
      if (error?.name === 'CancelledError' || error?.message?.includes('CancelledError')) {
        logger.debug(`[useTimeline] Ignoring CancelledError for ${interactionId} - query was superseded`, 'timeline_query');
        return false;
      }
      
      if (error?.status >= 400 && error?.status < 500) return false;
      return failureCount < 1;
    },
    
    retryDelay: 2000,
  });

  // Debug logging for query state
  useEffect(() => {
    logger.debug(`[useTimeline] 📊 QUERY STATE: enabled=${enabled && !!interactionId && !!user?.entityId}, interactionId=${interactionId}, user=${user?.entityId}, isLoading=${queryResult.isLoading}, isFetching=${queryResult.isFetching}, dataLength=${queryResult.data?.length || 0}`, 'timeline_query');
    
    // CRITICAL DEBUG: Log why query might not be running
    if (!enabled) {
      logger.debug(`[useTimeline] ⚠️ Query disabled by enabled flag`, 'timeline_query');
    }
    if (!interactionId) {
      logger.debug(`[useTimeline] ⚠️ Query disabled - no interactionId`, 'timeline_query');
    }
    if (!user?.entityId) {
      logger.debug(`[useTimeline] ⚠️ Query disabled - no user entityId`, 'timeline_query');
    }
  }, [enabled, interactionId, user?.entityId, queryResult.isLoading, queryResult.isFetching, queryResult.data?.length]);

  // Manual refetch function
  const refetch = useCallback(() => {
    logger.debug(`[useTimeline] Manual refetch triggered for: ${interactionId}`, 'timeline_query');
    queryResult.refetch();
  }, [queryResult.refetch, interactionId]);

  return {
    timeline: queryResult.data || [],
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch,
    isRefetching: queryResult.isRefetching,
    isFetching: queryResult.isFetching,
  };
};

/**
 * Hook to prefetch timeline data for better UX
 */
export const usePrefetchTimeline = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  
  return useCallback(async (interactionId: string, options: UseTimelineOptions = {}) => {
    const { limit = 100 } = options;

    // SECURITY FIX: Validate profileId for data isolation
    if (!interactionId || !user?.entityId || !user?.profileId) {
      logger.debug(`[usePrefetchTimeline] Skipping prefetch - missing interactionId, entityId, or profileId`, 'timeline_query');
      return;
    }
    
    // Check if we already have fresh data
    const existingData = queryClient.getQueryData(queryKeys.timelineWithLimit(interactionId, limit));
    if (existingData && Array.isArray(existingData) && existingData.length > 0) {
      logger.debug(`[usePrefetchTimeline] Skipping prefetch - fresh data exists for: ${interactionId}`, 'timeline_query');
      return;
    }
    
    logger.debug(`[usePrefetchTimeline] Prefetching timeline for: ${interactionId}`, 'timeline_query');
    
    try {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.timelineWithLimit(interactionId, limit),
        queryFn: async () => {
          // Use same logic as useTimeline but optimized for prefetching
          logger.debug(`[usePrefetchTimeline] Loading from local cache first: ${interactionId}`, 'timeline_query');
          
          // Step 1: Try to load from local cache first
          const cachedItems = await timelineRepository.getTimelineForInteraction(interactionId, user.profileId, limit, { filter: 'all', currentUserEntityId: user.entityId });
          
          if (cachedItems.length > 0) {
            logger.debug(`[usePrefetchTimeline] Found ${cachedItems.length} items in cache for: ${interactionId}`, 'timeline_query');
            return cachedItems;
          }
          
          // Step 2: If no cache, fetch from API
          logger.debug(`[usePrefetchTimeline] No cache found, fetching from API: ${interactionId}`, 'timeline_query');
          
          const path = `/interactions/${interactionId}/timeline`;
          const params = { limit, currentUserEntityId: user.entityId };
          
          const response = await apiClient.get(path, { params });
          
          let fetchedItems: any[] = [];
          const raw = response.data;

          // Parse API response (same logic as main hook)
          if (Array.isArray(raw?.items)) {
            fetchedItems = raw.items;
          } else if (raw?.data && Array.isArray(raw.data.items)) {
            fetchedItems = raw.data.items;
          } else if (typeof raw?.items === 'string') {
            try {
              const parsedItems = JSON.parse(raw.items);
              if (Array.isArray(parsedItems)) {
                fetchedItems = parsedItems;
              } else if (parsedItems && typeof parsedItems === 'object') {
                fetchedItems = Object.values(parsedItems).map(item => {
                  if (typeof item === 'string') {
                    try {
                      return JSON.parse(item);
                    } catch {
                      return item;
                    }
                  }
                  return item;
                });
              }
            } catch (parseError) {
              logger.warn(`[usePrefetchTimeline] Error parsing stringified items: ${String(parseError)}`, 'timeline_query');
            }
          }
          
          if (fetchedItems.length > 0) {
            // Save to local cache for future instant loading (background)
            setTimeout(async () => {
              try {
                const messagesToSave = fetchedItems
                  .filter(item => (item.type === 'message' || item.itemType === 'message') && item.id && item.interaction_id)
                  .map(item => ({
                    ...item,
                    id: String(item.id),
                    interaction_id: String(item.interaction_id),
                    itemType: 'message',
                    type: 'message',
                    sender_entity_id: item.sender_entity_id ? String(item.sender_entity_id) : 'system_or_unknown',
                    created_at: typeof item.createdAt === 'number' ? new Date(item.createdAt).toISOString() : String(item.createdAt || item.timestamp),
                    metadata: { ...item.metadata, isOptimistic: false }
                  }));
                  
                const transactionsToSave = fetchedItems
                  .filter(item => (item.type === 'transaction' || item.itemType === 'transaction') && item.id && item.interaction_id)
                  .map(item => ({
                    ...item,
                    id: String(item.id),
                    interaction_id: String(item.interaction_id),
                    itemType: 'transaction',
                    type: 'transaction',
                    from_account_id: item.from_account_id || item.from_entity_id,
                    to_account_id: item.to_account_id || item.to_entity_id,
                    created_at: typeof item.createdAt === 'number' ? new Date(item.createdAt).toISOString() : String(item.createdAt || item.timestamp),
                    status: item.status || 'completed',
                    transaction_type: item.transaction_type || 'transfer',
                    entry_type: item.entry_type,
                    metadata: { ...item.metadata, isOptimistic: false }
                  }));

                // Save to repositories (background, don't await)
                if (messagesToSave.length > 0) {
                  messageRepository.saveMessages(messagesToSave, user.profileId).catch((err: any) => {
                    logger.debug('[usePrefetchTimeline] Background save of messages failed', 'timeline_query', { error: String(err) });
                  });
                }

                if (transactionsToSave.length > 0) {
                  transactionRepository.saveTransactions(transactionsToSave, user.profileId).catch((err: any) => {
                    logger.debug('[usePrefetchTimeline] Background save of transactions failed', 'timeline_query', { error: String(err) });
                  });
                }
              } catch (error) {
                logger.debug('[usePrefetchTimeline] Background save failed', 'timeline_query', { error: String(error) });
              }
            }, 100);
            
            // Add date separators and return
            const timelineWithDates = timelineRepository.addDateSeparators(fetchedItems);
            logger.debug(`[usePrefetchTimeline] Prefetched ${fetchedItems.length} items for: ${interactionId}`, 'timeline_query');
            return timelineWithDates;
          }
          
          return [];
        },
        staleTime: 5 * 60 * 1000, // 5 minutes for prefetched data
        gcTime: 30 * 60 * 1000, // 30 minutes
      });
    } catch (error) {
      logger.debug(`[usePrefetchTimeline] Prefetch failed for ${interactionId}: ${String(error)}`, 'timeline_query');
    }
  }, [queryClient, user?.entityId]);
};

// ==================== INFINITE QUERY FOR PAGINATION ====================

export interface UseTimelineInfiniteOptions {
  enabled?: boolean;
  pageSize?: number;
}

export interface UseTimelineInfiniteResult {
  pages: TimelineItem[][];
  flatTimeline: TimelineItem[]; // All pages flattened for convenience
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  refetch: () => void;
}

/**
 * Infinite query hook for paginated timeline loading (WhatsApp-style "load more")
 * Use this for chat conversations with "scroll to top to load older messages" pattern
 *
 * Features:
 * - Cursor-based pagination (backend returns next_cursor)
 * - Local-first: first page from cache, subsequent pages from API
 * - WhatsApp behavior: smooth infinite scroll upwards
 * - Memory efficient: limits max pages
 *
 * @param interactionId - The interaction ID to fetch timeline for
 * @param options - Configuration options
 */
export const useTimelineInfinite = (
  interactionId: string,
  options: UseTimelineInfiniteOptions = {}
): UseTimelineInfiniteResult => {
  const { enabled = true, pageSize = 50 } = options;

  const authContext = useAuthContext();
  const user = authContext?.user;

  logger.debug(`[useTimelineInfinite] Hook called: interactionId=${interactionId}, pageSize=${pageSize}`, 'timeline_query');

  const queryResult = useInfiniteQuery({
    queryKey: queryKeys.timelineInfinite(interactionId, pageSize),
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as string | undefined;

      logger.debug(`[useTimelineInfinite] Fetching page: cursor=${cursor || 'initial'}`, 'timeline_query');

      // SECURITY FIX: Validate profileId for data isolation
      if (!user?.profileId) {
        logger.warn('[useTimelineInfinite] Missing profileId, aborting to prevent data leakage', 'timeline_query');
        return { items: [], nextCursor: undefined, hasMore: false };
      }

      // Build API request
      const path = API_PATHS.INTERACTION.TIMELINE(interactionId);
      const params: any = {
        limit: pageSize,
        currentUserEntityId: user?.entityId
      };

      if (cursor) {
        params.cursor = cursor;
      }

      try {
        const response = await apiClient.get(path, { params });

        let items: TimelineItem[] = [];
        let nextCursor: string | undefined;
        let hasMore = false;

        // Parse response (backend returns: {items, next_cursor, has_more_next})
        const raw = response.data;

        if (Array.isArray(raw?.items)) {
          items = raw.items;
          nextCursor = raw.next_cursor || raw.nextCursor;
          hasMore = raw.has_more_next ?? raw.hasMore ?? false;
        } else if (raw?.data && Array.isArray(raw.data.items)) {
          items = raw.data.items;
          nextCursor = raw.data.next_cursor || raw.data.nextCursor;
          hasMore = raw.data.has_more_next ?? raw.data.hasMore ?? false;
        } else if (typeof raw?.items === 'string') {
          // Handle stringified response
          try {
            const parsedItems = JSON.parse(raw.items);
            if (Array.isArray(parsedItems)) {
              items = parsedItems;
            } else if (parsedItems && typeof parsedItems === 'object') {
              items = Object.values(parsedItems).map(item => {
                if (typeof item === 'string') {
                  try {
                    return JSON.parse(item);
                  } catch {
                    return item;
                  }
                }
                return item;
              });
            }
            nextCursor = raw.next_cursor || raw.nextCursor;
            hasMore = raw.has_more_next ?? raw.hasMore ?? false;
          } catch (parseError) {
            logger.warn(`[useTimelineInfinite] Error parsing stringified items: ${String(parseError)}`, 'timeline_query');
          }
        }

        logger.debug(`[useTimelineInfinite] Page loaded: ${items.length} items, hasMore=${hasMore}, nextCursor=${nextCursor}`, 'timeline_query');

        // Save to local cache (background)
        if (items.length > 0) {
          setTimeout(async () => {
            try {
              const messagesToSave = items
                .filter(item => (item.type === 'message' || item.itemType === 'message') && item.id && item.interaction_id)
                .map(item => ({
                  ...item,
                  id: String(item.id),
                  interaction_id: String(item.interaction_id),
                  itemType: 'message',
                  type: 'message',
                  sender_entity_id: item.sender_entity_id ? String(item.sender_entity_id) : 'system_or_unknown',
                  created_at: typeof item.createdAt === 'number' ? new Date(item.createdAt).toISOString() : String(item.createdAt || item.timestamp),
                  metadata: { ...item.metadata, isOptimistic: false }
                }));

              const transactionsToSave = items
                .filter(item => (item.type === 'transaction' || item.itemType === 'transaction') && item.id && item.interaction_id)
                .map(item => ({
                  ...item,
                  id: String(item.id),
                  interaction_id: String(item.interaction_id),
                  itemType: 'transaction',
                  type: 'transaction',
                  from_account_id: item.from_account_id || item.from_entity_id,
                  to_account_id: item.to_account_id || item.to_entity_id,
                  created_at: typeof item.createdAt === 'number' ? new Date(item.createdAt).toISOString() : String(item.createdAt || item.timestamp),
                  status: item.status || 'completed',
                  transaction_type: item.transaction_type || 'transfer',
                  entry_type: item.entry_type,
                  metadata: { ...item.metadata, isOptimistic: false }
                }));

              if (messagesToSave.length > 0) {
                await messageRepository.saveMessages(messagesToSave, user.profileId);
              }
              if (transactionsToSave.length > 0) {
                await transactionRepository.saveTransactions(transactionsToSave, user.profileId);
              }
            } catch (saveError) {
              logger.debug(`[useTimelineInfinite] Background save failed: ${String(saveError)}`, 'timeline_query');
            }
          }, 100);
        }

        // Add date separators to this page
        const itemsWithDates = timelineRepository.addDateSeparators(items);

        return {
          items: itemsWithDates,
          nextCursor,
          hasMore,
        };
      } catch (error) {
        logger.error(`[useTimelineInfinite] Failed to fetch page: ${String(error)}`, 'timeline_query');
        throw error;
      }
    },
    getNextPageParam: (lastPage) => {
      // Return nextCursor if there are more pages, undefined otherwise
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
    initialPageParam: undefined, // No cursor for first page
    enabled: enabled && !!interactionId && !!user?.entityId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: false,
    networkMode: 'offlineFirst',
    maxPages: 10, // Limit memory usage - keep max 10 pages (500 messages)
    retry: (failureCount, error: any) => {
      if (!interactionId || !enabled) return false;
      
      // Don't retry for CancelledError - this is expected behavior
      if (error?.name === 'CancelledError' || error?.message?.includes('CancelledError')) {
        logger.debug(`[useTimelineInfinite] Ignoring CancelledError for ${interactionId} - query was superseded`, 'timeline_query');
        return false;
      }
      
      if (error?.status >= 400 && error?.status < 500) return false;
      return failureCount < 1;
    },
    retryDelay: 2000,
  });

  // Flatten all pages for convenience
  const flatTimeline = queryResult.data?.pages.flatMap(page => page.items) || [];

  logger.debug(`[useTimelineInfinite] Query state: pages=${queryResult.data?.pages.length || 0}, flatItems=${flatTimeline.length}, hasNextPage=${queryResult.hasNextPage}`, 'timeline_query');

  return {
    pages: queryResult.data?.pages.map(p => p.items) || [],
    flatTimeline,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    fetchNextPage: queryResult.fetchNextPage,
    hasNextPage: queryResult.hasNextPage ?? false,
    isFetchingNextPage: queryResult.isFetchingNextPage,
    refetch: queryResult.refetch,
  };
};

/**
 * Hook to prefetch first page of infinite timeline
 */
export const usePrefetchTimelineInfinite = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useCallback(async (interactionId: string, pageSize: number = 50) => {
    if (!interactionId || !user?.entityId) {
      logger.debug(`[usePrefetchTimelineInfinite] Skipping - missing interactionId or user`, 'timeline_query');
      return;
    }

    // Check if we already have data
    const existingData = queryClient.getQueryData(queryKeys.timelineInfinite(interactionId, pageSize));
    if (existingData) {
      logger.debug(`[usePrefetchTimelineInfinite] Skipping - data exists for: ${interactionId}`, 'timeline_query');
      return;
    }

    logger.debug(`[usePrefetchTimelineInfinite] Prefetching for: ${interactionId}`, 'timeline_query');

    try {
      await queryClient.prefetchInfiniteQuery({
        queryKey: queryKeys.timelineInfinite(interactionId, pageSize),
        queryFn: async ({ pageParam }) => {
          const cursor = pageParam as string | undefined;
          const path = API_PATHS.INTERACTION.TIMELINE(interactionId);
          const params: any = {
            limit: pageSize,
            currentUserEntityId: user.entityId
          };

          if (cursor) {
            params.cursor = cursor;
          }

          const response = await apiClient.get(path, { params });
          const raw = response.data;

          let items: TimelineItem[] = [];
          let nextCursor: string | undefined;
          let hasMore = false;

          if (Array.isArray(raw?.items)) {
            items = raw.items;
            nextCursor = raw.next_cursor || raw.nextCursor;
            hasMore = raw.has_more_next ?? raw.hasMore ?? false;
          }

          const itemsWithDates = timelineRepository.addDateSeparators(items);

          return {
            items: itemsWithDates,
            nextCursor,
            hasMore,
          };
        },
        initialPageParam: undefined,
        pages: 1, // Only prefetch first page
      });
    } catch (error) {
      logger.debug(`[usePrefetchTimelineInfinite] Prefetch failed: ${String(error)}`, 'timeline_query');
    }
  }, [queryClient, user?.entityId]);
};