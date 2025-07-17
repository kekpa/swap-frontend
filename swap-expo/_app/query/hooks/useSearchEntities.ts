// Enhanced entity search with local-first architecture - 2025-01-10
// TanStack Query integration for search functionality

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { EntityResolver, ResolvedEntity } from '../../services/EntityResolver';
import logger from '../../utils/logger';
import { networkService } from '../../services/NetworkService';

interface SearchResults {
  entities: ResolvedEntity[];
  total: number;
  hasMore: boolean;
}

interface UseSearchEntitiesOptions {
  query: string;
  limit?: number;
  enabled?: boolean;
}

interface UseSearchEntitiesResult {
  results: SearchResults;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isOffline: boolean;
  refetch: () => void;
}

/**
 * Hook for searching entities with local-first pattern
 * 
 * Features:
 * - Local-first search with cache priority
 * - Automatic request deduplication via TanStack Query
 * - Offline-aware search functionality
 * - Real-time search results
 * - Intelligent caching with stale-while-revalidate
 * 
 * @param options Search configuration options
 * @returns Search results and loading state
 */
export const useSearchEntities = ({
  query,
  limit = 20,
  enabled = true
}: UseSearchEntitiesOptions): UseSearchEntitiesResult => {
  const isOffline = !networkService.isOnline();
  
  // Only search if query is meaningful (2+ characters)
  const shouldSearch = enabled && query.length >= 2;
  
  const {
    data: results = { entities: [], total: 0, hasMore: false },
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.searchEntities(query),
    queryFn: async (): Promise<SearchResults> => {
      logger.debug(`[useSearchEntities] Searching for: "${query}"`);
      
      try {
        // For now, return empty results as a placeholder
        // This will be replaced with actual search implementation
        logger.debug(`[useSearchEntities] Search functionality not yet implemented for "${query}"`);
        
        return {
          entities: [],
          total: 0,
          hasMore: false
        };
      } catch (error) {
        logger.error(`[useSearchEntities] Search failed for "${query}":`, error);
        
        // In offline mode or on error, return empty results
        if (isOffline) {
          logger.debug(`[useSearchEntities] Returning empty results for offline search: "${query}"`);
          return { entities: [], total: 0, hasMore: false };
        }
        
        throw error;
      }
    },
    enabled: shouldSearch,
    staleTime: 30 * 1000, // 30 seconds - search results can be stale briefly
    gcTime: 5 * 60 * 1000, // 5 minutes - keep search results in cache
    retry: (failureCount, error) => {
      // Don't retry if offline
      if (isOffline) return false;
      
      // Retry up to 2 times for network errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false, // Don't refetch on window focus for search
    refetchOnReconnect: true, // Refetch when coming back online
    networkMode: isOffline ? 'offlineFirst' : 'online',
  });
  
  return {
    results,
    isLoading: shouldSearch ? isLoading : false,
    isError: shouldSearch ? isError : false,
    error: shouldSearch ? (error as Error | null) : null,
    isOffline,
    refetch,
  };
};

/**
 * Hook for recent searches (placeholder implementation)
 */
export const useRecentSearches = () => {
  return useQuery({
    queryKey: ['search', 'recent'],
    queryFn: async (): Promise<string[]> => {
      logger.debug('[useRecentSearches] Loading recent searches');
      
      try {
        // Placeholder implementation - return empty array
        logger.debug('[useRecentSearches] Recent searches not yet implemented');
        return [];
      } catch (error) {
        logger.error('[useRecentSearches] Failed to load recent searches:', error);
        return [];
      }
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for search suggestions (placeholder implementation)
 */
export const useSearchSuggestions = (partialQuery: string) => {
  const shouldGetSuggestions = partialQuery.length >= 1;
  
  return useQuery({
    queryKey: ['search', 'suggestions', partialQuery],
    queryFn: async (): Promise<string[]> => {
      logger.debug(`[useSearchSuggestions] Getting suggestions for: "${partialQuery}"`);
      
      try {
        // Placeholder implementation - return empty array
        logger.debug(`[useSearchSuggestions] Search suggestions not yet implemented for "${partialQuery}"`);
        return [];
      } catch (error) {
        logger.error(`[useSearchSuggestions] Failed to get suggestions for "${partialQuery}":`, error);
        return [];
      }
    },
    enabled: shouldGetSuggestions,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

export default useSearchEntities; 