/**
 * Entity Isolation Development Guards
 *
 * SECURITY: Runtime checks to prevent entity context bleeding
 *
 * These guards run in development mode only and warn developers when:
 * 1. Entity-sensitive queries are missing entity context
 * 2. Query keys don't follow the entity-aware pattern
 * 3. Potential data leakage between entities
 *
 * Created: 2025-01-18 - Profile context bleeding security fix
 * Updated: 2025-12-28 - Migrated from profileId to entityId (entity-first architecture)
 */

import logger from '../utils/logger';

/**
 * List of features that MUST have entity context in their query keys
 */
const ENTITY_SENSITIVE_FEATURES = [
  'balances',
  'wallets',
  'transactions',
  'interactions',
  'messages',
  'kyc',
  'verification',
  'contacts',
  'conversations',
  'live', // Real-time data
  'timeline',
  'user',
] as const;

/**
 * Check if a query key is entity-aware
 *
 * Entity-aware keys follow the pattern:
 * [feature, 'entity', entityId, ...rest]
 */
export const isEntityAwareQueryKey = (queryKey: unknown[]): boolean => {
  if (!Array.isArray(queryKey) || queryKey.length < 3) {
    return false;
  }

  // Check if second element is 'entity' and third is a string (entityId)
  return queryKey[1] === 'entity' && typeof queryKey[2] === 'string';
};

/**
 * Check if a feature requires entity context
 */
export const isEntitySensitiveFeature = (feature: string): boolean => {
  return ENTITY_SENSITIVE_FEATURES.includes(feature as any);
};

/**
 * Extract entity ID from an entity-aware query key
 */
export const extractEntityId = (queryKey: unknown[]): string | null => {
  if (isEntityAwareQueryKey(queryKey)) {
    return queryKey[2] as string;
  }
  return null;
};

/**
 * Validate query key for entity isolation
 *
 * Throws warning in development if entity-sensitive query is missing entity context
 */
export const validateQueryKeyForEntityIsolation = (queryKey: unknown[]): void => {
  // Only run in development
  if (!__DEV__) {
    return;
  }

  if (!Array.isArray(queryKey) || queryKey.length === 0) {
    logger.warn('[Entity Isolation] Invalid query key', 'data', { queryKey });
    return;
  }

  const feature = String(queryKey[0]);

  // Check if feature is entity-sensitive
  if (isEntitySensitiveFeature(feature)) {
    // Verify it has entity context
    if (!isEntityAwareQueryKey(queryKey)) {
      logger.error(`
╔════════════════════════════════════════════════════════════╗
║ ⚠️  ENTITY ISOLATION WARNING                               ║
╠════════════════════════════════════════════════════════════╣
║ Feature: ${feature.padEnd(50)}║
║ Query Key: ${JSON.stringify(queryKey).slice(0, 45).padEnd(50)}║
║                                                            ║
║ ❌ This query is MISSING entity context!                  ║
║                                                            ║
║ SECURITY RISK: Data could bleed between entities          ║
║                                                            ║
║ FIX:                                                       ║
║ 1. Import useCurrentEntityId hook                         ║
║ 2. Get entityId: const entityId = useCurrentEntityId()    ║
║ 3. Include in query key:                                  ║
║    ['${feature}', 'entity', entityId, ...]                ║
║                                                            ║
║ OR use useEntityAwareQueryKey():                          ║
║    const key = useEntityAwareQueryKey('${feature}', ...)  ║
╚════════════════════════════════════════════════════════════╝
      `);
    } else {
      const entityId = extractEntityId(queryKey);
      logger.debug(`[Entity Isolation] ✅ Entity-aware query: ${feature} (entityId: ${entityId})`);
    }
  }
};

/**
 * Check if two query keys belong to the same entity
 */
export const isSameEntity = (queryKey1: unknown[], queryKey2: unknown[]): boolean => {
  const entityId1 = extractEntityId(queryKey1);
  const entityId2 = extractEntityId(queryKey2);

  if (!entityId1 || !entityId2) {
    return false;
  }

  return entityId1 === entityId2;
};

/**
 * Get all entity-aware queries from cache
 */
export const filterEntityQueries = (
  queries: any[],
  entityId: string
): any[] => {
  return queries.filter((query) => {
    const queryEntityId = extractEntityId(query.queryKey);
    return queryEntityId === entityId;
  });
};

/**
 * Development utility: Log all active entity-sensitive queries
 */
export const debugEntityQueries = (queries: any[]): void => {
  if (!__DEV__) {
    return;
  }

  const entityQueries = queries.filter((query) => {
    const feature = String(query.queryKey[0]);
    return isEntitySensitiveFeature(feature);
  });

  logger.debug('Entity-Sensitive Queries', 'data', {
    totalQueries: queries.length,
    entitySensitive: entityQueries.length
  });

  const grouped = entityQueries.reduce((acc, query) => {
    const entityId = extractEntityId(query.queryKey) || 'MISSING_ENTITY';
    if (!acc[entityId]) {
      acc[entityId] = [];
    }
    acc[entityId].push(query.queryKey);
    return acc;
  }, {} as Record<string, any[]>);

  Object.entries(grouped).forEach(([entityId, keys]) => {
    logger.debug(`Entity: ${entityId}`, 'data', { keys });
  });
};

export default {
  isEntityAwareQueryKey,
  isEntitySensitiveFeature,
  extractEntityId,
  validateQueryKeyForEntityIsolation,
  isSameEntity,
  filterEntityQueries,
  debugEntityQueries,
};
