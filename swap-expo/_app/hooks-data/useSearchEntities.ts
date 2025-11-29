/**
 * useSearchEntities - Stub implementation
 *
 * NOTE: This is a temporary stub. The original EntityResolver feature was
 * incomplete (expected direct Supabase queries which is incorrect for fintech).
 *
 * TODO: Implement proper search using apiClient → Backend → Search endpoint
 *
 * For now, this returns empty results to keep the UI functional.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../tanstack-query/queryKeys';
import logger from '../utils/logger';
import { networkService } from '../services/NetworkService';

export interface ResolvedEntity {
  id: string;
  type: 'user' | 'business';
  name: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  lastActiveAt?: string;
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
 * Hook for searching entities - STUB IMPLEMENTATION
 *
 * Returns empty results. Search functionality needs proper backend implementation.
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
    queryFn: async () => {
      // STUB: Return empty results
      // TODO: Implement actual search via apiClient when backend endpoint exists
      logger.debug('[useSearchEntities] Stub: returning empty results for query:', query);
      return EMPTY_RESULTS;
    },
    enabled: enabled && query.length >= 2 && !isOffline,
    staleTime: 30000,
    gcTime: 60000,
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
