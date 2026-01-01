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
}

/**
 * useRoscaPools Hook
 *
 * Fetches available public pools with local-first caching.
 * Pools don't change often, so we use longer cache times.
 */
export const useRoscaPools = (options: UseRoscaPoolsOptions = {}) => {
  const { enabled = true } = options;
  const queryClient = useQueryClient();

  const fetchPools = async (): Promise<RoscaPool[]> => {
    logger.debug(`[useRoscaPools] Fetching available pools`);

    // STEP 1: Load from local cache first
    const cachedPools = await roscaRepository.getPools();
    logger.debug(`[useRoscaPools] Loaded ${cachedPools.length} pools from SQLite cache`);

    // STEP 2: Return cached data if available
    if (cachedPools.length > 0) {
      // Background sync
      setTimeout(async () => {
        try {
          logger.debug(`[useRoscaPools] 🔄 BACKGROUND SYNC: Fetching fresh pools from API`);
          const response = await apiClient.get(ROSCA_PATHS.POOLS);
          const apiPools: RoscaPool[] = parseApiResponse(response.data, 'rosca-pools');

          if (apiPools.length > 0) {
            await roscaRepository.savePools(apiPools);
            queryClient.setQueryData(queryKeys.roscaPools(), apiPools);
            logger.debug(`[useRoscaPools] ✅ BACKGROUND SYNC: Updated ${apiPools.length} pools`);
          }
        } catch (error) {
          logger.debug(`[useRoscaPools] ⚠️ Background sync failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }, 3000);

      return cachedPools;
    }

    // STEP 3: No cache - fetch from API
    logger.debug(`[useRoscaPools] 📡 FIRST TIME: Fetching pools from API`);
    const response = await apiClient.get(ROSCA_PATHS.POOLS);
    const apiPools: RoscaPool[] = parseApiResponse(response.data, 'rosca-pools');

    // Save to cache
    if (apiPools.length > 0) {
      await roscaRepository.savePools(apiPools);
    }

    return apiPools;
  };

  return useQuery({
    queryKey: queryKeys.roscaPools(),
    queryFn: fetchPools,
    enabled: Boolean(enabled),
    staleTime: 1000 * 60 * 10, // 10 minutes - pools don't change often
    gcTime: 1000 * 60 * 60, // 1 hour
    networkMode: 'always',
    initialData: () => {
      const cached = queryClient.getQueryData<RoscaPool[]>(queryKeys.roscaPools());
      if (cached && cached.length > 0) {
        return cached;
      }
      return undefined;
    },
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
