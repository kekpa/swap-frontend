/**
 * useSearchEntities - Privacy-aware entity search
 *
 * Uses the backend's unified search endpoint (GET /search?q=...)
 * which respects discovery_settings.searchable_by for privacy.
 *
 * Backend features:
 * - Privacy-aware search (only returns entities user can see)
 * - 30-second Redis caching
 * - Rate limited (30 requests/minute)
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../tanstack-query/queryKeys';
import logger from '../utils/logger';
import { networkService } from '../services/NetworkService';
import apiClient from '../_api/apiClient';
import { SEARCH_PATHS } from '../_api/apiPaths';

export interface ResolvedEntity {
  id: string;
  displayName: string;
  entityType: 'profile' | 'business' | 'account';
  avatarUrl?: string;
  secondaryText?: string;
}

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

const EMPTY_RESULTS: SearchResults = {
  entities: [],
  total: 0,
  hasMore: false,
};

/**
 * Hook for searching entities with privacy-aware backend
 *
 * Uses GET /search?q={query} endpoint which:
 * - Respects discovery_settings.searchable_by
 * - Returns entities + existing interactions matching query
 * - Has 30-second Redis caching on backend
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

  const queryResult = useQuery({
    queryKey: queryKeys.searchEntities(query),
    queryFn: async (): Promise<SearchResults> => {
      logger.debug('[useSearchEntities] Searching for:', query);

      try {
        // Use existing SEARCH_PATHS.ALL = '/search' (privacy-aware)
        const response = await apiClient.get(SEARCH_PATHS.ALL, {
          params: { q: query, limit }
        });

        // Backend returns: { results: [...], total: N, query: "..." }
        const { results = [], total = 0 } = response.data;

        // Map backend response to ResolvedEntity format
        const entities: ResolvedEntity[] = results.map((r: any) => ({
          id: r.id,
          displayName: r.name,
          entityType: r.type as 'profile' | 'business' | 'account',
          avatarUrl: r.avatarUrl,
          secondaryText: r.secondaryText,
        }));

        logger.debug(`[useSearchEntities] Found ${entities.length} results for "${query}"`);

        return {
          entities,
          total,
          hasMore: entities.length < total,
        };
      } catch (error: any) {
        logger.error('[useSearchEntities] Search failed:', error?.message);
        throw error;
      }
    },
    enabled: enabled && query.length >= 2 && !isOffline,
    staleTime: 30000, // 30s - matches backend Redis cache TTL
    gcTime: 60000,    // 1 minute garbage collection
  });

  return {
    results: queryResult.data ?? EMPTY_RESULTS,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    isOffline,
    refetch: queryResult.refetch,
  };
};

export default useSearchEntities;
