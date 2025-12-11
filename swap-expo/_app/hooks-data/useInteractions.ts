// TanStack Query hook for interactions with local-first pattern
// Replaces custom interaction fetching logic in DataContext
// Created: 2025-01-10 for TanStack Query migration
// Updated: 2025-01-12 - Added Option B deletion events pattern for sync

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../_api/apiClient';
import { queryKeys } from '../tanstack-query/queryKeys';
import logger from '../utils/logger';
import { useAuthContext } from '../features/auth/context/AuthContext';
import { interactionRepository } from '../localdb/InteractionRepository';
import { eventEmitter } from '../utils/eventEmitter';
import { useCurrentProfileId } from '../hooks/useCurrentProfileId';

export interface InteractionItem {
  id: string;
  name?: string;
  is_group: boolean;
  last_message_at?: string;
  updated_at?: string;
  members: Array<{
    entity_id: string;
    role: string;
    display_name?: string;
    avatar_url?: string;
    entity_type?: string;
  }>;
  last_message_snippet?: string;
  last_message_sender_id?: string;
  unread_count?: number;
}

export interface UseInteractionsOptions {
  enabled?: boolean;
  forceRefresh?: boolean;
}

export interface UseInteractionsResult {
  interactions: InteractionItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isRefetching: boolean;
  isFetching: boolean;
}

// Sync timestamp storage key for Option B deletion events pattern
const SYNC_TIMESTAMP_KEY = 'interactions_last_sync';

/**
 * Get the last sync timestamp from AsyncStorage
 * Used to request deleted interactions since last sync (Option B pattern)
 */
const getLastSyncTimestamp = async (): Promise<string | null> => {
  try {
    const timestamp = await AsyncStorage.getItem(SYNC_TIMESTAMP_KEY);
    logger.debug(`[useInteractions] Last sync timestamp: ${timestamp || 'none'}`);
    return timestamp;
  } catch (error) {
    logger.error('[useInteractions] Error reading sync timestamp:', error);
    return null;
  }
};

/**
 * Save the sync timestamp to AsyncStorage
 * Used for next sync request to get incremental deletions
 */
const saveSyncTimestamp = async (timestamp: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(SYNC_TIMESTAMP_KEY, timestamp);
    logger.debug(`[useInteractions] Saved sync timestamp: ${timestamp}`);
  } catch (error) {
    logger.error('[useInteractions] Error saving sync timestamp:', error);
  }
};

/**
 * TanStack Query hook for interactions with local-first pattern
 *
 * Features:
 * - Local-first loading from SQLite cache
 * - Background sync with API
 * - Automatic deduplication through TanStack Query
 * - Network-aware caching
 * - Member data included
 * - Deletion sync (Option B pattern) - processes deletedIds from backend
 *
 * @param options - Configuration options
 */
export const useInteractions = (
  options: UseInteractionsOptions = {}
): UseInteractionsResult => {
  const {
    enabled = true,
    forceRefresh = false
  } = options;

  const authContext = useAuthContext();
  const user = authContext?.user;
  const isAuthenticated = authContext?.isAuthenticated;
  const isProfileSwitching = authContext?.isProfileSwitching;
  const queryClient = useQueryClient();
  const profileId = useCurrentProfileId();

  // PROFILE SWITCH GUARD: Disable query during profile switch
  const shouldExecute = enabled && isAuthenticated && !!user && !!profileId && !isProfileSwitching;

  if (isProfileSwitching) {
    logger.debug('[useInteractions] ⏸️ SKIPPING: Profile switch in progress');
  }

  // Local-first interactions fetcher with deletion sync
  const fetchInteractions = useCallback(async (): Promise<InteractionItem[]> => {
    if (!isAuthenticated || !user) {
      logger.debug('[useInteractions] Not authenticated, returning empty array');
      return [];
    }

    logger.debug('[useInteractions] Fetching interactions with local-first pattern', 'interactions_query');

    let localInteractions: InteractionItem[] = [];
    let hasLocalData = false;

    // STEP 1: Load from local SQLite first (instant display)
    try {
      logger.debug('[useInteractions] Loading interactions from local cache with members', 'interactions_query');
      const localInteractionsWithMembers = await interactionRepository.getInteractionsWithMembers(profileId || '');
      
      if (localInteractionsWithMembers.length > 0) {
        // Transform to InteractionItem[] format
        localInteractions = localInteractionsWithMembers.map((local: any) => ({
          id: local.id,
          name: local.name || undefined,
          is_group: local.is_group || false,
          last_message_at: local.last_message_at || undefined,
          updated_at: local.updated_at || undefined,
          last_message_snippet: local.last_message_snippet || undefined,
          unread_count: local.unread_count || undefined,
          members: local.members.map((member: any) => ({
            entity_id: member.entity_id,
            role: member.role,
            display_name: member.display_name || undefined,
            avatar_url: member.avatar_url || undefined,
            entity_type: member.entity_type || undefined,
          }))
        }));
        
        hasLocalData = true;
        logger.info(`[useInteractions] Local interactions loaded: ${localInteractions.length} items`, 'interactions_query');
      }
    } catch (error) {
      logger.error('[useInteractions] Error loading local interactions:', error, 'interactions_query');
    }

    // STEP 2: Fetch from API with sync timestamp (Option B deletion events pattern)
    try {
      // Get last sync timestamp for incremental sync
      const lastSync = await getLastSyncTimestamp();

      // Build API URL with sync parameter
      const apiUrl = lastSync
        ? `/interactions?public=true&since=${encodeURIComponent(lastSync)}`
        : '/interactions?public=true';

      logger.debug(`[useInteractions] Fetching from API: ${apiUrl}`, 'interactions_query');
      const response = await apiClient.get(apiUrl);

      // Process API response - now with Option B deletion events support
      let fetchedInteractions: InteractionItem[] = [];
      let deletedIds: string[] = [];
      let syncTimestamp: string = new Date().toISOString();

      // Handle response format: {interactions, deletedIds, syncTimestamp, meta}
      if (response.data?.interactions && Array.isArray(response.data.interactions)) {
        fetchedInteractions = response.data.interactions;
        deletedIds = response.data.deletedIds || [];
        syncTimestamp = response.data.syncTimestamp || syncTimestamp;
      } else if (Array.isArray(response.data)) {
        // Fallback for direct array response
        fetchedInteractions = response.data;
      }

      logger.debug(`[useInteractions] Retrieved ${fetchedInteractions.length} API interactions, ${deletedIds.length} deleted`, 'interactions_query');

      // CRITICAL: Process deletions FIRST (Option B pattern!)
      // This ensures deleted interactions are removed before saving new ones
      if (deletedIds.length > 0) {
        logger.info(`[useInteractions] Processing ${deletedIds.length} deletions from backend`, 'interactions_query');
        await interactionRepository.deleteInteractions(deletedIds, profileId || '');
      }

      if (fetchedInteractions.length > 0) {
                 // Save to local cache in background
         try {
           for (const interaction of fetchedInteractions) {
             // Transform to LocalInteraction format
             const localInteraction = {
               id: interaction.id,
               name: interaction.name || null,
               is_group: interaction.is_group || false,
               updated_at: interaction.updated_at || new Date().toISOString(),
               last_message_snippet: interaction.last_message_snippet || null,
               last_message_at: interaction.last_message_at || null,
               unread_count: interaction.unread_count || 0,
               icon_url: null, // Not provided in API response
               metadata: null  // Not provided in API response
             };
             
             // Save interaction
             await interactionRepository.upsertInteraction(localInteraction, profileId || '');
            
                         // Save members if they exist
             if (interaction.members && interaction.members.length > 0) {
               const membersToSave: Array<{
                 interaction_id: string;
                 entity_id: string;
                 role: string;
                 display_name: string | null;
                 avatar_url: string | null;
                 entity_type: string;
                 joined_at: string;
               }> = interaction.members.map(member => ({
                 interaction_id: interaction.id,
                 entity_id: member.entity_id,
                 role: member.role,
                 display_name: member.display_name || null,
                 avatar_url: member.avatar_url || null,
                 entity_type: member.entity_type || 'profile',
                 joined_at: new Date().toISOString()
               }));
               await interactionRepository.saveInteractionMembers(membersToSave, profileId || '');
             }
          }
          logger.debug('[useInteractions] Interactions and members saved to local cache', 'interactions_query');
        } catch (saveError) {
          logger.warn(`[useInteractions] Error saving interactions to local cache: ${saveError}`);
        }

        // Save sync timestamp for next request (Option B pattern)
        await saveSyncTimestamp(syncTimestamp);

        // Emit update event for other components
        eventEmitter.emit('data_updated', { type: 'interactions', data: fetchedInteractions });

        return fetchedInteractions;
      } else {
        // No API data, but still save sync timestamp if provided
        // This ensures we track sync state even with empty results
        await saveSyncTimestamp(syncTimestamp);

        // Return local data if we have any
        return localInteractions;
      }
    } catch (apiError) {
      logger.error('[useInteractions] Failed to fetch API interactions', apiError, 'interactions_query');
      // Return local data on API error
      return localInteractions;
    }
  }, [isAuthenticated, user]);

  // TanStack Query configuration
  // PROFILE-SAFE: Disabled during profile switch to prevent stale queries
  const queryResult = useQuery({
    queryKey: queryKeys.interactionsByEntity(profileId || 'anonymous', user?.entityId || 'anonymous'),
    queryFn: fetchInteractions,
    enabled: shouldExecute,
    staleTime: 2 * 60 * 1000, // 2 minutes - interactions can be slightly stale
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
    refetchOnMount: false, // Don't refetch on mount to prevent loading glitches
    notifyOnChangeProps: ['data', 'error'], // Only notify on data/error changes, not loading states
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Refetch when coming back online
    retry: (failureCount, error: any) => {
      // Don't retry on 401 (unauthorized) or 403 (forbidden)
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      return failureCount < 2; // Retry up to 2 times for other errors
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Manual refetch function
  const refetch = useCallback(() => {
    logger.debug('[useInteractions] Manual refetch triggered', 'interactions_query');
    return queryResult.refetch();
  }, [queryResult.refetch]);

  return {
    interactions: queryResult.data || [],
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch,
    isRefetching: queryResult.isRefetching,
    isFetching: queryResult.isFetching,
  };
};

/**
 * Hook to prefetch interactions data for better UX
 */
export const usePrefetchInteractions = () => {
  const queryClient = useQueryClient();
  const authContext = useAuthContext();
  const user = authContext?.user;
  const profileId = useCurrentProfileId();

  return useCallback(() => {
    if (!user?.entityId || !profileId) return;

    queryClient.prefetchQuery({
      queryKey: queryKeys.interactionsByEntity(profileId, user.entityId),
      queryFn: async () => {
        logger.debug('[usePrefetchInteractions] Prefetching interactions', 'interactions_query');
        // This will be automatically deduplicated if already fetching
        return [];
      },
      staleTime: 2 * 60 * 1000,
    });
  }, [queryClient, user?.entityId, profileId]);
}; 