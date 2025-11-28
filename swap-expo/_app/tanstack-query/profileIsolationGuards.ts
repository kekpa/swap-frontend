/**
 * Profile Isolation Development Guards
 *
 * SECURITY: Runtime checks to prevent profile context bleeding
 *
 * These guards run in development mode only and warn developers when:
 * 1. Profile-sensitive queries are missing profile context
 * 2. Query keys don't follow the profile-aware pattern
 * 3. Potential data leakage between profiles
 *
 * Created: 2025-01-18 - Profile context bleeding security fix
 */

import logger from '../utils/logger';

/**
 * List of features that MUST have profile context in their query keys
 */
const PROFILE_SENSITIVE_FEATURES = [
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
] as const;

/**
 * Check if a query key is profile-aware
 *
 * Profile-aware keys follow the pattern:
 * [feature, 'profile', profileId, ...rest]
 */
export const isProfileAwareQueryKey = (queryKey: unknown[]): boolean => {
  if (!Array.isArray(queryKey) || queryKey.length < 3) {
    return false;
  }

  // Check if second element is 'profile' and third is a string (profileId)
  return queryKey[1] === 'profile' && typeof queryKey[2] === 'string';
};

/**
 * Check if a feature requires profile context
 */
export const isProfileSensitiveFeature = (feature: string): boolean => {
  return PROFILE_SENSITIVE_FEATURES.includes(feature as any);
};

/**
 * Extract profile ID from a profile-aware query key
 */
export const extractProfileId = (queryKey: unknown[]): string | null => {
  if (isProfileAwareQueryKey(queryKey)) {
    return queryKey[2] as string;
  }
  return null;
};

/**
 * Validate query key for profile isolation
 *
 * Throws warning in development if profile-sensitive query is missing profile context
 */
export const validateQueryKeyForProfileIsolation = (queryKey: unknown[]): void => {
  // Only run in development
  if (!__DEV__) {
    return;
  }

  if (!Array.isArray(queryKey) || queryKey.length === 0) {
    logger.warn('[Profile Isolation] Invalid query key:', queryKey);
    return;
  }

  const feature = String(queryKey[0]);

  // Check if feature is profile-sensitive
  if (isProfileSensitiveFeature(feature)) {
    // Verify it has profile context
    if (!isProfileAwareQueryKey(queryKey)) {
      logger.error(`
╔════════════════════════════════════════════════════════════╗
║ ⚠️  PROFILE ISOLATION WARNING                              ║
╠════════════════════════════════════════════════════════════╣
║ Feature: ${feature.padEnd(50)}║
║ Query Key: ${JSON.stringify(queryKey).slice(0, 45).padEnd(50)}║
║                                                            ║
║ ❌ This query is MISSING profile context!                 ║
║                                                            ║
║ SECURITY RISK: Data could bleed between profiles          ║
║                                                            ║
║ FIX:                                                       ║
║ 1. Import useCurrentProfileId hook                        ║
║ 2. Get profileId: const profileId = useCurrentProfileId() ║
║ 3. Include in query key:                                  ║
║    ['${feature}', 'profile', profileId, ...]              ║
║                                                            ║
║ OR use useProfileAwareQueryKey():                         ║
║    const key = useProfileAwareQueryKey('${feature}', ...) ║
╚════════════════════════════════════════════════════════════╝
      `);
    } else {
      const profileId = extractProfileId(queryKey);
      logger.debug(`[Profile Isolation] ✅ Profile-aware query: ${feature} (profileId: ${profileId})`);
    }
  }
};

/**
 * Check if two query keys belong to the same profile
 */
export const isSameProfile = (queryKey1: unknown[], queryKey2: unknown[]): boolean => {
  const profileId1 = extractProfileId(queryKey1);
  const profileId2 = extractProfileId(queryKey2);

  if (!profileId1 || !profileId2) {
    return false;
  }

  return profileId1 === profileId2;
};

/**
 * Get all profile-aware queries from cache
 */
export const filterProfileQueries = (
  queries: any[],
  profileId: string
): any[] => {
  return queries.filter((query) => {
    const queryProfileId = extractProfileId(query.queryKey);
    return queryProfileId === profileId;
  });
};

/**
 * Development utility: Log all active profile-sensitive queries
 */
export const debugProfileQueries = (queries: any[]): void => {
  if (!__DEV__) {
    return;
  }

  const profileQueries = queries.filter((query) => {
    const feature = String(query.queryKey[0]);
    return isProfileSensitiveFeature(feature);
  });

  console.group('🔍 Profile-Sensitive Queries');
  console.log(`Total queries: ${queries.length}`);
  console.log(`Profile-sensitive: ${profileQueries.length}`);

  const grouped = profileQueries.reduce((acc, query) => {
    const profileId = extractProfileId(query.queryKey) || 'MISSING_PROFILE';
    if (!acc[profileId]) {
      acc[profileId] = [];
    }
    acc[profileId].push(query.queryKey);
    return acc;
  }, {} as Record<string, any[]>);

  Object.entries(grouped).forEach(([profileId, keys]) => {
    console.group(`Profile: ${profileId}`);
    keys.forEach((key) => console.log(key));
    console.groupEnd();
  });

  console.groupEnd();
};

export default {
  isProfileAwareQueryKey,
  isProfileSensitiveFeature,
  extractProfileId,
  validateQueryKeyForProfileIsolation,
  isSameProfile,
  filterProfileQueries,
  debugProfileQueries,
};
