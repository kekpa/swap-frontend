/**
 * useRoscaPools Hook
 *
 * TanStack Query hook for available Rosca (Sol) pools.
 * Pools are public data, no entity isolation needed.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../tanstack-query/queryKeys';
import apiClient from '../_api/apiClient';
import { ROSCA_PATHS } from '../_api/apiPaths';
import logger from '../utils/logger';
import { roscaRepository } from '../localdb/RoscaRepository';
import { parseApiResponse } from '../utils/apiResponseParser';
import type { RoscaPool, RoscaPoolDetails } from '../types/rosca.types';

interface UseRoscaPoolsOptions {
  enabled?: boolean;
  scope?: 'joinable' | 'upcoming' | 'all';
  months?: number;
  sort?: 'recommended' | 'payout' | 'contribution' | 'duration' | 'popular';
}

/**
 * useRoscaPools Hook
 *
 * Fetches available public pools with local-first caching.
 * Pools don't change often, so we use longer cache times.
 *
 * @param options.scope - 'joinable' (default), 'upcoming', or 'all'
 * @param options.months - Months to look ahead for upcoming scope (default: 3)
 * @param options.sort - 'recommended' (default), 'payout', 'contribution', 'duration' (shortest first), 'popular'
 */
export const useRoscaPools = (options: UseRoscaPoolsOptions = {}) => {
  const { enabled = true, scope, months, sort } = options;
  const queryClient = useQueryClient();

  const fetchPools = async (): Promise<RoscaPool[]> => {
    logger.debug(`[useRoscaPools] Fetching pools with scope: ${scope || 'joinable'}`);

    // For non-default scopes, skip local cache (calendar needs fresh data)
    const useLocalCache = !scope || scope === 'joinable';

    if (useLocalCache) {
      // STEP 1: Load from local cache first
      const cachedPools = await roscaRepository.getPools();
      logger.debug(`[useRoscaPools] Loaded ${cachedPools.length} pools from SQLite cache`);

      // STEP 2: Return cached data if available
      if (cachedPools.length > 0) {
        // Background sync
        setTimeout(async () => {
          try {
            logger.debug(`[useRoscaPools] 🔄 BACKGROUND SYNC: Fetching fresh pools from API`);
            const response = await apiClient.get(ROSCA_PATHS.POOLS, {
              params: { scope, months, sort },
            });
            const apiPools: RoscaPool[] = parseApiResponse(response.data, 'rosca-pools');

            if (apiPools.length > 0) {
              await roscaRepository.savePools(apiPools);
              queryClient.setQueryData(queryKeys.roscaPools(scope, months, sort), apiPools);
              logger.debug(`[useRoscaPools] ✅ BACKGROUND SYNC: Updated ${apiPools.length} pools`);
            }
          } catch (error) {
            logger.debug(`[useRoscaPools] ⚠️ Background sync failed: ${error instanceof Error ? error.message : String(error)}`);
          }
        }, 3000);

        return cachedPools;
      }
    }

    // STEP 3: Fetch from API (either no cache or non-default scope)
    logger.debug(`[useRoscaPools] 📡 Fetching pools from API`);
    const response = await apiClient.get(ROSCA_PATHS.POOLS, {
      params: { scope, months, sort },
    });
    const apiPools: RoscaPool[] = parseApiResponse(response.data, 'rosca-pools');

    // Save to cache only for joinable pools
    if (apiPools.length > 0 && useLocalCache) {
      await roscaRepository.savePools(apiPools);
    }

    return apiPools;
  };

  return useQuery({
    queryKey: queryKeys.roscaPools(scope, months, sort),
    queryFn: fetchPools,
    enabled: Boolean(enabled),
    staleTime: 1000 * 60 * 10, // 10 minutes - pools don't change often
    gcTime: 1000 * 60 * 60, // 1 hour
    networkMode: 'always',
  });
};

/**
 * useRoscaPoolDetails Hook
 *
 * Fetches detailed info for a specific pool.
 */
export const useRoscaPoolDetails = (poolId: string, options: UseRoscaPoolsOptions = {}) => {
  const { enabled = true } = options;

  const isValidId = poolId && poolId.trim().length > 0;
  const shouldExecute = enabled && isValidId;

  return useQuery({
    queryKey: queryKeys.roscaPoolDetails(poolId),
    queryFn: async (): Promise<RoscaPoolDetails> => {
      logger.debug(`[useRoscaPoolDetails] Fetching pool details: ${poolId}`);
      const response = await apiClient.get(ROSCA_PATHS.POOL_DETAILS(poolId));
      return response.data;
    },
    enabled: Boolean(shouldExecute),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
};

/**
 * useRoscaFriends Hook
 *
 * Fetches friends (contacts) who are in the same pool.
 */
export const useRoscaFriends = (enrollmentId: string, entityId: string, options: UseRoscaPoolsOptions = {}) => {
  const { enabled = true } = options;

  const isValidEnrollmentId = enrollmentId && enrollmentId.trim().length > 0;
  const isValidEntityId = entityId && entityId.trim().length > 0;
  const shouldExecute = enabled && isValidEnrollmentId && isValidEntityId;

  return useQuery({
    queryKey: queryKeys.roscaFriends(enrollmentId),
    queryFn: async () => {
      logger.debug(`[useRoscaFriends] Fetching friends for enrollment: ${enrollmentId}`);
      const response = await apiClient.get(ROSCA_PATHS.ENROLLMENT_FRIENDS(enrollmentId), {
        params: { entityId },
      });
      return response.data;
    },
    enabled: Boolean(shouldExecute),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
};
