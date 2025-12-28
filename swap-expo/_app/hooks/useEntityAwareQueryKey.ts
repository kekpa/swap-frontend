/**
 * useEntityAwareQueryKey Hook
 *
 * PROFESSIONAL PATTERN: Automatic entity-aware cache key generation
 *
 * This hook automatically includes the current entity ID in TanStack Query cache keys,
 * ensuring complete isolation between different entity data.
 *
 * @param feature - The feature/domain name (e.g., 'balances', 'transactions')
 * @param subKeys - Additional key segments
 * @returns Entity-aware query key array
 *
 * @example
 * ```typescript
 * // Instead of:
 * const queryKey = ['balances', entityId];  // ❌ No entity context structure
 *
 * // Use:
 * const queryKey = useEntityAwareQueryKey('balances', 'wallet', walletId);
 * // Result: ['balances', 'entity', '<entity-id>', 'wallet', '<wallet-id>']
 * ```
 *
 * Created: 2025-01-18 - Profile context bleeding security fix
 * Updated: 2025-12-28 - Migrated from profileId to entityId (entity-first architecture)
 */

import { useMemo } from 'react';
import { useCurrentEntityId } from './useCurrentEntityId';
import logger from '../utils/logger';

/**
 * Hook to create entity-aware query keys
 *
 * SECURITY: This ensures ALL data queries include entity context,
 * preventing data from leaking between different entities.
 *
 * @param feature - The feature name (first segment of query key)
 * @param subKeys - Additional key segments (spread)
 * @returns Readonly array with entity context injected
 *
 * @throws {Error} If entity ID is not available (user not authenticated)
 */
export const useEntityAwareQueryKey = (
  feature: string,
  ...subKeys: any[]
): readonly unknown[] => {
  const entityId = useCurrentEntityId();

  return useMemo(() => {
    // SECURITY CHECK: Entity ID is REQUIRED for entity-sensitive queries
    if (!entityId) {
      const errorMsg = `[useEntityAwareQueryKey] ❌ SECURITY: Entity ID required for query: ${feature}`;
      logger.error(errorMsg);
      throw new Error(`Entity ID required for ${feature} query. User must be authenticated.`);
    }

    // PROFESSIONAL PATTERN: [feature, 'entity', entityId, ...subKeys]
    // This ensures entity isolation at the cache level
    const queryKey = [feature, 'entity', entityId, ...subKeys] as const;

    // Development logging for debugging entity context
    if (__DEV__) {
      logger.debug('[useEntityAwareQueryKey] ✅ Entity-aware key generated:', {
        feature,
        entityId,
        queryKey,
      });
    }

    return queryKey;
  }, [feature, entityId, ...subKeys]);
};

/**
 * Utility to check if a query key is entity-aware
 *
 * @param queryKey - The query key to check
 * @returns true if query key includes entity context
 */
export const isEntityAwareQueryKey = (queryKey: unknown[]): boolean => {
  return (
    Array.isArray(queryKey) &&
    queryKey.length >= 3 &&
    queryKey[1] === 'entity' &&
    typeof queryKey[2] === 'string'
  );
};

/**
 * Extract entity ID from an entity-aware query key
 *
 * @param queryKey - The query key
 * @returns Entity ID or null if not entity-aware
 */
export const extractEntityIdFromQueryKey = (queryKey: unknown[]): string | null => {
  if (isEntityAwareQueryKey(queryKey)) {
    return queryKey[2] as string;
  }
  return null;
};

export default useEntityAwareQueryKey;
