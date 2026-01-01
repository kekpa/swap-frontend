/**
 * Query Keys Factory
 *
 * Centralized query key management for TanStack Query.
 * Provides type-safe, consistent query keys across the application.
 *
 * UPDATED: 2025-01-28 - Migrated to entity-only cache keys
 * All user-sensitive queries now use entityId only (entity-first architecture).
 * Entity ID is the backend's universal identifier (entities.id).
 */
import logger from '../utils/logger';

export const queryKeys = {
  // Wallet/Balance related queries
  balances: ['balances'] as const,
  balancesByEntity: (entityId: string) =>
    ['balances', 'entity', entityId] as const,
  walletsByEntity: (entityId: string) =>
    ['wallets', 'entity', entityId] as const,

  // Interaction related queries
  interactions: ['interactions'] as const,
  interactionsByEntity: (entityId: string) =>
    ['interactions', 'entity', entityId] as const,
  interactionDetails: (interactionId: string) => ['interactions', 'details', interactionId] as const,

  // Timeline related queries
  timeline: (interactionId: string) => ['timeline', interactionId] as const,
  timelineWithLimit: (interactionId: string, limit: number) => ['timeline', interactionId, 'limit', limit] as const,
  timelineInfinite: (interactionId: string, pageSize: number) => ['timeline', interactionId, 'infinite', pageSize] as const,

  // Message related queries
  messages: ['messages'] as const,
  messagesByInteraction: (interactionId: string) => ['messages', 'interaction', interactionId] as const,
  recentMessages: (entityId: string, limit: number) =>
    ['messages', 'entity', entityId, 'recent', 'limit', limit] as const,

  // Transaction related queries
  transactions: ['transactions'] as const,
  transactionsByEntity: (entityId: string) =>
    ['transactions', 'entity', entityId] as const,
  transactionsByWallet: (entityId: string, walletId: string) =>
    ['transactions', 'entity', entityId, 'wallet', walletId] as const,
  transactionsByAccount: (entityId: string, accountId: string, limit: number) =>
    ['transactions', 'entity', entityId, 'account', accountId, 'limit', limit] as const,
  recentTransactions: (entityId: string, limit: number) =>
    ['transactions', 'entity', entityId, 'recent', 'limit', limit] as const,
  transactionDetails: (transactionId: string) => ['transactions', 'details', transactionId] as const,

  // Search related queries
  search: ['search'] as const,
  searchEntities: (query: string) => ['search', 'entities', query] as const,
  searchContacts: (query: string) => ['search', 'contacts', query] as const,

  // User/Profile related queries
  profile: ['profile'] as const,
  userProfile: (entityId: string) => ['profile', 'entity', entityId] as const,
  currentProfile: (entityId: string) => ['profile', 'current', 'entity', entityId] as const,
  profileDetails: (entityId: string) => ['profile', 'details', 'entity', entityId] as const,
  availableProfiles: ['profile', 'available'] as const, // Multi-profile switching (entity-agnostic)
  kycStatus: (entityId: string) => ['kyc', 'status', 'entity', entityId] as const,
  verificationStatus: (entityId: string) => ['verification', 'status', 'entity', entityId] as const,

  // KYC related queries
  kyc: ['kyc'] as const,
  kycByEntity: (entityId: string) =>
    ['kyc', 'entity', entityId] as const,
  kycStep: (entityId: string, stepType: string) =>
    ['kyc', 'entity', entityId, 'step', stepType] as const,
  kycProgress: (entityId: string) =>
    ['kyc', 'entity', entityId, 'progress'] as const,

  // Contact related queries
  contacts: ['contacts'] as const,
  contactsByEntity: (entityId: string) =>
    ['contacts', 'entity', entityId] as const,
  contactDetails: (contactId: string) => ['contacts', 'details', contactId] as const,

  // Conversation related queries
  conversations: ['conversations'] as const,
  recentConversations: (entityId: string, options?: any) =>
    ['conversations', 'entity', entityId, 'recent', options] as const,
  conversationDetails: (conversationId: string) => ['conversations', 'details', conversationId] as const,

  // Rosca (Sol) related queries - Pool-based savings system
  rosca: ['rosca'] as const,
  roscaPools: () => ['rosca', 'pools'] as const,
  roscaPoolDetails: (poolId: string) => ['rosca', 'pools', poolId] as const,
  roscaEnrollmentsByEntity: (entityId: string) =>
    ['rosca', 'enrollments', 'entity', entityId] as const,
  roscaEnrollmentDetails: (enrollmentId: string) =>
    ['rosca', 'enrollments', 'details', enrollmentId] as const,
  roscaPayments: (enrollmentId: string) =>
    ['rosca', 'payments', enrollmentId] as const,
  roscaFriends: (enrollmentId: string) =>
    ['rosca', 'friends', enrollmentId] as const,

  // System/Reference data queries
  currencies: ['currencies'] as const,
  countries: ['countries'] as const,
  exchangeRates: ['exchange-rates'] as const,

  // Real-time/Live data queries
  liveBalances: (entityId: string) =>
    ['live', 'balances', 'entity', entityId] as const,
  liveTransactions: (entityId: string) =>
    ['live', 'transactions', 'entity', entityId] as const,
  liveMessages: (interactionId: string) => ['live', 'messages', interactionId] as const,
} as const;

/**
 * Query key utilities for common operations
 *
 * UPDATED: 2025-01-28 - Migrated to entity-only (entity-first architecture)
 */
export const queryKeyUtils = {
  /**
   * Get all query keys that should be invalidated when user data changes
   *
   * Entity-first: Uses entityId only for cache isolation
   */
  getUserDataKeys: (entityId: string) => [
    queryKeys.balancesByEntity(entityId),
    queryKeys.walletsByEntity(entityId),
    queryKeys.interactionsByEntity(entityId),
    queryKeys.transactionsByEntity(entityId),
    queryKeys.contactsByEntity(entityId),
    queryKeys.currentProfile(entityId),
    queryKeys.kycByEntity(entityId),
    queryKeys.kycProgress(entityId),
    queryKeys.roscaEnrollmentsByEntity(entityId),
  ],

  /**
   * Get all query keys that should be invalidated when network reconnects
   */
  getNetworkDependentKeys: () => [
    queryKeys.balances,
    queryKeys.interactions,
    queryKeys.transactions,
    queryKeys.currencies,
    queryKeys.exchangeRates,
  ],

  /**
   * Get all query keys for a specific interaction
   */
  getInteractionKeys: (interactionId: string) => [
    queryKeys.interactionDetails(interactionId),
    queryKeys.timeline(interactionId),
    queryKeys.messagesByInteraction(interactionId),
    queryKeys.liveMessages(interactionId),
  ],

  /**
   * Get all query keys for a specific wallet
   *
   * Entity-first: Uses entityId only for cache isolation
   */
  getWalletKeys: (entityId: string, walletId: string) => [
    queryKeys.transactionsByWallet(entityId, walletId),
    queryKeys.balancesByEntity(entityId),
    queryKeys.walletsByEntity(entityId),
  ],

  /**
   * Get all query keys for a specific account
   *
   * Entity-first: Uses entityId only for cache isolation
   */
  getAccountKeys: (entityId: string, accountId: string) => [
    queryKeys.transactionsByAccount(entityId, accountId, 20), // Default limit
    queryKeys.balancesByEntity(entityId),
    queryKeys.walletsByEntity(entityId),
  ],
};

/**
 * Type helpers for query keys with strict TypeScript validation
 */

// Base query key types
export type BaseQueryKey = readonly unknown[];
export type QueryKeyWithParams<T extends readonly unknown[]> = T;

// Specific query key types with validation
export type BalanceQueryKey = ReturnType<typeof queryKeys.balancesByEntity>;
export type InteractionQueryKey = ReturnType<typeof queryKeys.interactionsByEntity>;
export type TimelineQueryKey = ReturnType<typeof queryKeys.timeline>;
export type TransactionQueryKey = ReturnType<typeof queryKeys.transactionsByEntity>;
export type UserProfileQueryKey = ReturnType<typeof queryKeys.userProfile>;

// Union type of all possible query keys
export type AllQueryKeys = 
  | BalanceQueryKey
  | InteractionQueryKey
  | TimelineQueryKey
  | TransactionQueryKey
  | UserProfileQueryKey
  | ReturnType<typeof queryKeys.walletsByEntity>
  | ReturnType<typeof queryKeys.interactionDetails>
  | ReturnType<typeof queryKeys.messagesByInteraction>
  | ReturnType<typeof queryKeys.recentMessages>
  | ReturnType<typeof queryKeys.recentTransactions>
  | ReturnType<typeof queryKeys.transactionDetails>
  | ReturnType<typeof queryKeys.searchEntities>
  | ReturnType<typeof queryKeys.searchContacts>
  | ReturnType<typeof queryKeys.contactsByEntity>
  | ReturnType<typeof queryKeys.contactDetails>
  | typeof queryKeys.balances
  | typeof queryKeys.interactions
  | typeof queryKeys.timeline
  | typeof queryKeys.messages
  | typeof queryKeys.transactions
  | typeof queryKeys.search
  | typeof queryKeys.profile
  | typeof queryKeys.contacts
  | typeof queryKeys.currencies
  | typeof queryKeys.countries
  | typeof queryKeys.exchangeRates;

/**
 * TypeScript utilities for query key validation and manipulation
 */

// Query key validation utility
export const validateQueryKey = <T extends AllQueryKeys>(key: T): T => {
  if (!Array.isArray(key)) {
    throw new Error('Query key must be an array');
  }
  if (key.length === 0) {
    throw new Error('Query key cannot be empty');
  }
  return key;
};

// Type-safe query key matcher
export const matchesQueryKey = <T extends AllQueryKeys>(
  queryKey: unknown[],
  pattern: T
): queryKey is T => {
  if (queryKey.length !== pattern.length) {
    return false;
  }
  
  return queryKey.every((segment, index) => {
    const patternSegment = pattern[index];
    return segment === patternSegment || patternSegment === '*'; // '*' as wildcard
  });
};

// Extract entity ID from query keys that contain it
export const extractEntityId = (queryKey: AllQueryKeys): string | null => {
  // Handle entity-specific query keys
  if (Array.isArray(queryKey) && queryKey.length >= 3) {
    const [, type, entityId] = queryKey;
    if (type === 'entity' && typeof entityId === 'string') {
      return entityId;
    }
  }
  
  // Handle profile query keys
  if (Array.isArray(queryKey) && queryKey[0] === 'profile' && queryKey.length >= 3) {
    const entityId = queryKey[2];
    if (typeof entityId === 'string') {
      return entityId;
    }
  }
  
  return null;
};

// Check if query key belongs to a specific entity
export const isEntityQuery = (queryKey: AllQueryKeys, entityId: string): boolean => {
  const extractedId = extractEntityId(queryKey);
  return extractedId === entityId;
};

// Group query keys by type
export const groupQueryKeysByType = (queryKeys: AllQueryKeys[]): Record<string, AllQueryKeys[]> => {
  return queryKeys.reduce((groups, key) => {
    if (Array.isArray(key) && key.length > 0) {
      const type = String(key[0]);
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(key);
    }
    return groups;
  }, {} as Record<string, AllQueryKeys[]>);
};

// Create a query key predicate function for filtering
export const createQueryKeyPredicate = <T extends AllQueryKeys>(
  pattern: Partial<T> | ((key: AllQueryKeys) => boolean)
) => {
  if (typeof pattern === 'function') {
    return pattern;
  }
  
  return (queryKey: AllQueryKeys): boolean => {
    if (!Array.isArray(queryKey) || !Array.isArray(pattern)) {
      return false;
    }
    
    return pattern.every((segment, index) => {
      if (segment === undefined) return true; // Skip undefined segments in pattern
      return queryKey[index] === segment;
    });
  };
};

/**
 * Strongly typed query key builders with validation
 */
export const typedQueryKeys = {
  // Entity-specific builders with validation
  balances: {
    byEntity: (entityId: string): BalanceQueryKey => {
      if (!entityId || typeof entityId !== 'string') {
        throw new Error('Entity ID must be a non-empty string');
      }
      return validateQueryKey(queryKeys.balancesByEntity(entityId));
    },
    all: () => validateQueryKey(queryKeys.balances),
  },
  
  interactions: {
    byEntity: (entityId: string): InteractionQueryKey => {
      if (!entityId || typeof entityId !== 'string') {
        throw new Error('Entity ID must be a non-empty string');
      }
      return validateQueryKey(queryKeys.interactionsByEntity(entityId));
    },
    all: () => validateQueryKey(queryKeys.interactions),
  },
  
  timeline: {
    byInteraction: (interactionId: string): TimelineQueryKey => {
      if (!interactionId || typeof interactionId !== 'string') {
        throw new Error('Interaction ID must be a non-empty string');
      }
      return validateQueryKey(queryKeys.timeline(interactionId));
    },
  },
  
  transactions: {
    byEntity: (entityId: string): TransactionQueryKey => {
      if (!entityId || typeof entityId !== 'string') {
        throw new Error('Entity ID must be a non-empty string');
      }
      return validateQueryKey(queryKeys.transactionsByEntity(entityId));
    },
    recent: (entityId: string, limit: number = 20) => {
      if (!entityId || typeof entityId !== 'string') {
        throw new Error('Entity ID must be a non-empty string');
      }
      if (limit <= 0 || limit > 100) {
        throw new Error('Limit must be between 1 and 100');
      }
      return validateQueryKey(queryKeys.recentTransactions(entityId, limit));
    },
    all: () => validateQueryKey(queryKeys.transactions),
  },
  
  profile: {
    byEntity: (entityId: string): UserProfileQueryKey => {
      if (!entityId || typeof entityId !== 'string') {
        throw new Error('Entity ID must be a non-empty string');
      }
      return validateQueryKey(queryKeys.userProfile(entityId));
    },
  },
} as const;

/**
 * Development utilities for debugging query keys
 */
export const debugQueryKeys = {
  // Pretty print query key for logging
  format: (queryKey: AllQueryKeys): string => {
    if (Array.isArray(queryKey)) {
      return `[${queryKey.map(segment => JSON.stringify(segment)).join(', ')}]`;
    }
    return String(queryKey);
  },
  
  // Get query key info for debugging
  analyze: (queryKey: AllQueryKeys) => {
    const entityId = extractEntityId(queryKey);
    const type = Array.isArray(queryKey) ? String(queryKey[0]) : 'unknown';
    
    return {
      type,
      entityId,
      segments: Array.isArray(queryKey) ? queryKey.length : 0,
      formatted: debugQueryKeys.format(queryKey),
    };
  },
};

/**
 * Entity-Aware Query Key Type Safety (2025-01-28)
 *
 * Compile-time and runtime validation to ensure all user-sensitive queries
 * include entityId for proper data isolation (entity-first architecture).
 */

// Type for entity-aware query keys
export type EntityAwareQueryKey<T extends readonly unknown[] = readonly unknown[]> =
  readonly [string, 'entity', string, ...T];

/**
 * Runtime assertion to verify a query key is entity-aware
 * Throws if query key doesn't follow the entity-aware pattern
 */
export function assertEntityAware(
  queryKey: unknown[],
  context?: string
): asserts queryKey is EntityAwareQueryKey<unknown[]> {
  const contextMsg = context ? ` (context: ${context})` : '';

  if (!Array.isArray(queryKey)) {
    throw new Error(`Query key must be an array${contextMsg}`);
  }

  if (queryKey.length < 3) {
    throw new Error(
      `Query key must have at least 3 segments: [feature, 'entity', entityId]${contextMsg}. ` +
      `Got: ${JSON.stringify(queryKey)}`
    );
  }

  if (queryKey[1] !== 'entity') {
    throw new Error(
      `Query key must include 'entity' at index 1 for data isolation${contextMsg}. ` +
      `Got: ${JSON.stringify(queryKey)}`
    );
  }

  if (typeof queryKey[2] !== 'string' || !queryKey[2]) {
    throw new Error(
      `Query key must include entityId (string) at index 2${contextMsg}. ` +
      `Got: ${JSON.stringify(queryKey)}`
    );
  }
}

/**
 * Type guard to check if a query key is entity-aware
 * Non-throwing version of assertEntityAware
 */
export function isEntityAware(queryKey: unknown[]): queryKey is EntityAwareQueryKey<unknown[]> {
  try {
    assertEntityAware(queryKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract entityId from an entity-aware query key
 * Returns null if query key is not entity-aware
 */
export function extractEntityIdFromKey(queryKey: unknown[]): string | null {
  if (!isEntityAware(queryKey)) {
    return null;
  }
  return queryKey[2];
}

/**
 * Development mode validator for query hooks
 * Call this in development to catch missing entityId early
 *
 * Usage:
 * const query = useQuery({
 *   queryKey: validateEntityQueryKey(queryKeys.kycStatus(entityId), 'useKycStatus'),
 *   ...
 * });
 */
export function validateEntityQueryKey<T extends readonly unknown[]>(
  queryKey: T,
  hookName?: string
): T {
  // Only validate in development
  if (__DEV__) {
    const features = [
      'kyc', 'balances', 'wallets', 'transactions', 'messages',
      'interactions', 'contacts', 'conversations'
    ];

    if (Array.isArray(queryKey) && queryKey.length > 0) {
      const feature = String(queryKey[0]);

      // If this is a user-sensitive feature, it MUST be entity-aware
      if (features.includes(feature)) {
        try {
          assertEntityAware(queryKey, hookName);
        } catch (error: any) {
          // Log warning but don't crash in development
          logger.error(
            `QueryKey Validation: ${error.message}`,
            error,
            "data",
            {
              hookName: hookName || 'unknown',
              feature,
              message: 'This query MUST include entityId for data isolation!'
            }
          );
        }
      }
    }
  }

  return queryKey;
}

/**
 * Get all query keys for a specific entity
 * Used for surgical cache invalidation during profile switching
 */
export function getEntityQueryKeys(entityId: string): Array<EntityAwareQueryKey> {
  return [
    // User profile queries
    ['profile', 'entity', entityId] as EntityAwareQueryKey,
    ['profile', 'entity', entityId, 'current'] as EntityAwareQueryKey,
    ['profile', 'entity', entityId, 'details'] as EntityAwareQueryKey,

    // KYC queries
    ['kyc', 'entity', entityId] as EntityAwareQueryKey,
    ['kyc', 'entity', entityId, 'status'] as EntityAwareQueryKey,
    ['verification', 'entity', entityId, 'status'] as EntityAwareQueryKey,
  ];
}

/**
 * Development utilities for entity-aware query debugging
 */
export const entityQueryDebug = {
  /**
   * Check if query key needs entityId but is missing it
   */
  isMissingEntity: (queryKey: unknown[]): boolean => {
    if (!Array.isArray(queryKey) || queryKey.length === 0) {
      return false;
    }

    const feature = String(queryKey[0]);
    const sensitiveFeatures = [
      'kyc', 'balances', 'wallets', 'transactions', 'messages',
      'interactions', 'contacts', 'conversations'
    ];

    return sensitiveFeatures.includes(feature) && !isEntityAware(queryKey);
  },

  /**
   * Analyze a query key and report entity isolation status
   */
  analyze: (queryKey: unknown[]): {
    isEntityAware: boolean;
    entityId: string | null;
    needsEntity: boolean;
    recommendation: string;
  } => {
    const aware = isEntityAware(queryKey);
    const entityId = extractEntityIdFromKey(queryKey);
    const needsEntity = entityQueryDebug.isMissingEntity(queryKey);

    let recommendation = 'OK';
    if (needsEntity) {
      recommendation = 'CRITICAL: This query MUST include entityId for data isolation!';
    } else if (!aware && Array.isArray(queryKey) && queryKey.length > 0) {
      const feature = String(queryKey[0]);
      if (!['currencies', 'countries', 'exchange-rates'].includes(feature)) {
        recommendation = 'Consider adding entityId if this query returns user-specific data';
      }
    }

    return {
      isEntityAware: aware,
      entityId,
      needsEntity,
      recommendation,
    };
  },
};

export default queryKeys; 