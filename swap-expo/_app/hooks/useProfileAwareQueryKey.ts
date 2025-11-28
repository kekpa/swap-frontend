/**
 * useProfileAwareQueryKey Hook
 *
 * PROFESSIONAL PATTERN: Automatic profile-aware cache key generation
 *
 * This hook automatically includes the current profile ID in TanStack Query cache keys,
 * ensuring complete isolation between personal and business profile data.
 *
 * @param feature - The feature/domain name (e.g., 'balances', 'transactions')
 * @param subKeys - Additional key segments
 * @returns Profile-aware query key array
 *
 * @example
 * ```typescript
 * // Instead of:
 * const queryKey = ['balances', 'entity', entityId];  // ❌ No profile context
 *
 * // Use:
 * const queryKey = useProfileAwareQueryKey('balances', 'entity', entityId);
 * // Result: ['balances', 'profile', '<profile-id>', 'entity', '<entity-id>']
 * ```
 *
 * Created: 2025-01-18 - Profile context bleeding security fix
 */

import { useMemo } from 'react';
import { useCurrentProfileId } from './useCurrentProfileId';
import logger from '../utils/logger';

/**
 * Hook to create profile-aware query keys
 *
 * SECURITY: This ensures ALL data queries include profile context,
 * preventing personal data from leaking into business views and vice versa.
 *
 * @param feature - The feature name (first segment of query key)
 * @param subKeys - Additional key segments (spread)
 * @returns Readonly array with profile context injected
 *
 * @throws {Error} If profile ID is not available (user not authenticated)
 */
export const useProfileAwareQueryKey = (
  feature: string,
  ...subKeys: any[]
): readonly unknown[] => {
  const profileId = useCurrentProfileId();

  return useMemo(() => {
    // SECURITY CHECK: Profile ID is REQUIRED for profile-sensitive queries
    if (!profileId) {
      const errorMsg = `[useProfileAwareQueryKey] ❌ SECURITY: Profile ID required for query: ${feature}`;
      logger.error(errorMsg);
      throw new Error(`Profile ID required for ${feature} query. User must be authenticated.`);
    }

    // PROFESSIONAL PATTERN: [feature, 'profile', profileId, ...subKeys]
    // This ensures profile isolation at the cache level
    const queryKey = [feature, 'profile', profileId, ...subKeys] as const;

    // Development logging for debugging profile context
    if (__DEV__) {
      logger.debug('[useProfileAwareQueryKey] ✅ Profile-aware key generated:', {
        feature,
        profileId,
        queryKey,
      });
    }

    return queryKey;
  }, [feature, profileId, ...subKeys]);
};

/**
 * Utility to check if a query key is profile-aware
 *
 * @param queryKey - The query key to check
 * @returns true if query key includes profile context
 */
export const isProfileAwareQueryKey = (queryKey: unknown[]): boolean => {
  return (
    Array.isArray(queryKey) &&
    queryKey.length >= 3 &&
    queryKey[1] === 'profile' &&
    typeof queryKey[2] === 'string'
  );
};

/**
 * Extract profile ID from a profile-aware query key
 *
 * @param queryKey - The query key
 * @returns Profile ID or null if not profile-aware
 */
export const extractProfileIdFromQueryKey = (queryKey: unknown[]): string | null => {
  if (isProfileAwareQueryKey(queryKey)) {
    return queryKey[2] as string;
  }
  return null;
};

export default useProfileAwareQueryKey;
