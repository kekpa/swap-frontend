/**
 * Standardized Query Hook Factory
 * 
 * Provides consistent configuration for TanStack Query hooks
 * with standardized error handling, retry logic, and caching.
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { createRetryFunction, getUserErrorMessage } from '../utils/errorHandler';

// Standard query configuration templates
export const QUERY_DEFAULTS = {
  // Short-lived data (user actions, real-time data)
  realtime: {
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    networkMode: 'online' as const,
    retry: createRetryFunction(1),
  },
  
  // Medium-lived data (user profiles, settings)
  standard: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    networkMode: 'offlineFirst' as const,
    retry: createRetryFunction(2),
  },
  
  // Long-lived data (reference data, countries, currencies)
  reference: {
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    networkMode: 'offlineFirst' as const,
    retry: createRetryFunction(2),
  },
  
  // Critical data (balances, transactions)
  critical: {
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 15, // 15 minutes
    networkMode: 'offlineFirst' as const,
    retry: createRetryFunction(3),
  },
} as const;

/**
 * Create a standardized query hook with consistent error handling
 */
export function useStandardQuery<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>,
  preset: keyof typeof QUERY_DEFAULTS = 'standard',
  options?: Partial<UseQueryOptions<T>>
) {
  const defaults = QUERY_DEFAULTS[preset];
  
  return useQuery({
    queryKey,
    queryFn,
    ...defaults,
    ...options,
    // Ensure retry function is standardized
    retry: options?.retry || defaults.retry,
    // Add meta for error context if not provided
    meta: {
      errorMessage: `Failed to load ${queryKey[0]}`,
      ...options?.meta,
    },
  });
}

/**
 * Create a standardized error response format for hooks
 */
export function createQueryResponse<T>(
  queryResult: ReturnType<typeof useQuery<T>>,
  defaultValue?: T
) {
  return {
    data: queryResult.data ?? defaultValue,
    loading: queryResult.isLoading,
    error: queryResult.error ? getUserErrorMessage(queryResult.error) : null,
    isError: queryResult.isError,
    refetch: queryResult.refetch,
    // Additional useful states
    isFetching: queryResult.isFetching,
    isStale: queryResult.isStale,
    isSuccess: queryResult.isSuccess,
  };
}

export default useStandardQuery;