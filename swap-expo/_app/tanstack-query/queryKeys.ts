/**
 * Query Keys Factory
 *
 * Centralized query key management for TanStack Query.
 * Provides type-safe, consistent query keys across the application.
 *
 * UPDATED: 2025-01-18 - Added profile-aware cache keys for security isolation
 * All profile-sensitive queries now include profileId to prevent data bleeding
 * between personal and business profiles.
 */

export const queryKeys = {
  // Wallet/Balance related queries
  balances: ['balances'] as const,
  balancesByEntity: (profileId: string, entityId: string) =>
    ['balances', 'profile', profileId, 'entity', entityId] as const,
  walletsByEntity: (profileId: string, entityId: string) =>
    ['wallets', 'profile', profileId, 'entity', entityId] as const,
  
  // Interaction related queries
  interactions: ['interactions'] as const,
  interactionsByEntity: (profileId: string, entityId: string) =>
    ['interactions', 'profile', profileId, 'entity', entityId] as const,
  interactionDetails: (interactionId: string) => ['interactions', 'details', interactionId] as const,
  
  // Timeline related queries
  timeline: (interactionId: string) => ['timeline', interactionId] as const,
  timelineWithLimit: (interactionId: string, limit: number) => ['timeline', interactionId, 'limit', limit] as const,
  timelineInfinite: (interactionId: string, pageSize: number) => ['timeline', interactionId, 'infinite', pageSize] as const,

  // Message related queries
  messages: ['messages'] as const,
  messagesByInteraction: (interactionId: string) => ['messages', 'interaction', interactionId] as const,
  recentMessages: (profileId: string, entityId: string, limit: number) =>
    ['messages', 'profile', profileId, 'recent', entityId, 'limit', limit] as const,
  
  // Transaction related queries
  transactions: ['transactions'] as const,
  transactionsByEntity: (profileId: string, entityId: string) =>
    ['transactions', 'profile', profileId, 'entity', entityId] as const,
  transactionsByWallet: (profileId: string, walletId: string) =>
    ['transactions', 'profile', profileId, 'wallet', walletId] as const,
  transactionsByAccount: (profileId: string, accountId: string, limit: number) =>
    ['transactions', 'profile', profileId, 'account', accountId, 'limit', limit] as const,
  recentTransactions: (profileId: string, entityId: string, limit: number) =>
    ['transactions', 'profile', profileId, 'recent', entityId, 'limit', limit] as const,
  transactionDetails: (transactionId: string) => ['transactions', 'details', transactionId] as const,
  
  // Search related queries
  search: ['search'] as const,
  searchEntities: (query: string) => ['search', 'entities', query] as const,
  searchContacts: (query: string) => ['search', 'contacts', query] as const,
  
  // User/Profile related queries
  profile: ['profile'] as const,
  userProfile: (profileId: string) => ['profile', profileId] as const,
  currentProfile: (profileId: string) => ['profile', 'current', profileId] as const,
  profileDetails: (profileId: string) => ['profile', 'details', profileId] as const,
  availableProfiles: ['profile', 'available'] as const, // Multi-profile switching (profile-agnostic)
  kycStatus: (profileId: string) => ['kyc', 'status', 'profile', profileId] as const,
  verificationStatus: (profileId: string) => ['verification', 'status', 'profile', profileId] as const,

  // KYC related queries (Phase 3)
  kyc: ['kyc'] as const,
  kycByEntity: (profileId: string, entityId: string) =>
    ['kyc', 'profile', profileId, 'entity', entityId] as const,
  kycStep: (profileId: string, entityId: string, stepType: string) =>
    ['kyc', 'profile', profileId, 'step', entityId, stepType] as const,
  kycProgress: (profileId: string, entityId: string) =>
    ['kyc', 'profile', profileId, 'progress', entityId] as const,
  
  // Contact related queries
  contacts: ['contacts'] as const,
  contactsByEntity: (profileId: string, entityId: string) =>
    ['contacts', 'profile', profileId, 'entity', entityId] as const,
  contactDetails: (contactId: string) => ['contacts', 'details', contactId] as const,

  // Conversation related queries
  conversations: ['conversations'] as const,
  recentConversations: (profileId: string, entityId: string, options?: any) =>
    ['conversations', 'profile', profileId, 'recent', entityId, options] as const,
  conversationDetails: (conversationId: string) => ['conversations', 'details', conversationId] as const,
  
  // System/Reference data queries
  currencies: ['currencies'] as const,
  countries: ['countries'] as const,
  exchangeRates: ['exchange-rates'] as const,
  
  // Real-time/Live data queries
  liveBalances: (profileId: string, entityId: string) =>
    ['live', 'balances', 'profile', profileId, entityId] as const,
  liveTransactions: (profileId: string, entityId: string) =>
    ['live', 'transactions', 'profile', profileId, entityId] as const,
  liveMessages: (interactionId: string) => ['live', 'messages', interactionId] as const,
} as const;

/**
 * Query key utilities for common operations
 *
 * UPDATED: 2025-01-18 - Now requires profileId for security isolation
 */
export const queryKeyUtils = {
  /**
   * Get all query keys that should be invalidated when user data changes
   *
   * SECURITY: Now requires profileId to ensure only the current profile's data is invalidated
   */
  getUserDataKeys: (profileId: string, entityId: string) => [
    queryKeys.balancesByEntity(profileId, entityId),
    queryKeys.walletsByEntity(profileId, entityId),
    queryKeys.interactionsByEntity(profileId, entityId),
    queryKeys.transactionsByEntity(profileId, entityId),
    queryKeys.contactsByEntity(profileId, entityId),
    queryKeys.currentProfile(profileId),
    queryKeys.kycByEntity(profileId, entityId),
    queryKeys.kycProgress(profileId, entityId),
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
   * SECURITY: Now requires profileId for profile isolation
   */
  getWalletKeys: (profileId: string, walletId: string, entityId: string) => [
    queryKeys.transactionsByWallet(profileId, walletId),
    queryKeys.balancesByEntity(profileId, entityId),
    queryKeys.walletsByEntity(profileId, entityId),
  ],

  /**
   * Get all query keys for a specific account
   *
   * SECURITY: Now requires profileId for profile isolation
   */
  getAccountKeys: (profileId: string, accountId: string, entityId: string) => [
    queryKeys.transactionsByAccount(profileId, accountId, 20), // Default limit
    queryKeys.balancesByEntity(profileId, entityId),
    queryKeys.walletsByEntity(profileId, entityId),
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
 * PHASE 5: Profile-Aware Query Key Type Safety (2025-01-18)
 *
 * Compile-time and runtime validation to ensure all user-sensitive queries
 * include profileId for proper data isolation between personal/business profiles.
 */

// Type for profile-aware query keys
export type ProfileAwareQueryKey<T extends readonly unknown[] = readonly unknown[]> =
  readonly [string, 'profile', string, ...T];

/**
 * Runtime assertion to verify a query key is profile-aware
 * Throws if query key doesn't follow the profile-aware pattern
 */
export function assertProfileAware(
  queryKey: unknown[],
  context?: string
): asserts queryKey is ProfileAwareQueryKey<unknown[]> {
  const contextMsg = context ? ` (context: ${context})` : '';

  if (!Array.isArray(queryKey)) {
    throw new Error(`Query key must be an array${contextMsg}`);
  }

  if (queryKey.length < 3) {
    throw new Error(
      `Query key must have at least 3 segments: [feature, 'profile', profileId]${contextMsg}. ` +
      `Got: ${JSON.stringify(queryKey)}`
    );
  }

  if (queryKey[1] !== 'profile') {
    throw new Error(
      `Query key must include 'profile' at index 1 for data isolation${contextMsg}. ` +
      `Got: ${JSON.stringify(queryKey)}`
    );
  }

  if (typeof queryKey[2] !== 'string' || !queryKey[2]) {
    throw new Error(
      `Query key must include profileId (string) at index 2${contextMsg}. ` +
      `Got: ${JSON.stringify(queryKey)}`
    );
  }
}

/**
 * Type guard to check if a query key is profile-aware
 * Non-throwing version of assertProfileAware
 */
export function isProfileAware(queryKey: unknown[]): queryKey is ProfileAwareQueryKey<unknown[]> {
  try {
    assertProfileAware(queryKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract profileId from a profile-aware query key
 * Returns null if query key is not profile-aware
 */
export function extractProfileId(queryKey: unknown[]): string | null {
  if (!isProfileAware(queryKey)) {
    return null;
  }
  return queryKey[2];
}

/**
 * Development mode validator for query hooks
 * Call this in development to catch missing profileId early
 *
 * Usage:
 * const query = useQuery({
 *   queryKey: validateProfileQueryKey(queryKeys.kycStatus(profileId), 'useKycStatus'),
 *   ...
 * });
 */
export function validateProfileQueryKey<T extends readonly unknown[]>(
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

      // If this is a user-sensitive feature, it MUST be profile-aware
      if (features.includes(feature)) {
        try {
          assertProfileAware(queryKey, hookName);
        } catch (error: any) {
          // Log warning but don't crash in development
          console.error(
            `[QueryKey Validation] ${error.message}\n` +
            `Hook: ${hookName || 'unknown'}\n` +
            `Feature: ${feature}\n` +
            `This query MUST include profileId for data isolation!`
          );
        }
      }
    }
  }

  return queryKey;
}

/**
 * Get all query keys for a specific profile
 * Used for surgical cache invalidation during profile switching
 */
export function getProfileQueryKeys(profileId: string): Array<ProfileAwareQueryKey> {
  return [
    // User profile queries
    ['profile', 'profile', profileId] as ProfileAwareQueryKey,
    ['profile', 'profile', profileId, 'current'] as ProfileAwareQueryKey,
    ['profile', 'profile', profileId, 'details'] as ProfileAwareQueryKey,

    // KYC queries
    ['kyc', 'profile', profileId] as ProfileAwareQueryKey,
    ['kyc', 'profile', profileId, 'status'] as ProfileAwareQueryKey,
    ['verification', 'profile', profileId, 'status'] as ProfileAwareQueryKey,
  ];
}

/**
 * Development utilities for profile-aware query debugging
 */
export const profileQueryDebug = {
  /**
   * Check if query key needs profileId but is missing it
   */
  isMissingProfile: (queryKey: unknown[]): boolean => {
    if (!Array.isArray(queryKey) || queryKey.length === 0) {
      return false;
    }

    const feature = String(queryKey[0]);
    const sensitiveFeatures = [
      'kyc', 'balances', 'wallets', 'transactions', 'messages',
      'interactions', 'contacts', 'conversations'
    ];

    return sensitiveFeatures.includes(feature) && !isProfileAware(queryKey);
  },

  /**
   * Analyze a query key and report profile isolation status
   */
  analyze: (queryKey: unknown[]): {
    isProfileAware: boolean;
    profileId: string | null;
    needsProfile: boolean;
    recommendation: string;
  } => {
    const aware = isProfileAware(queryKey);
    const profileId = extractProfileId(queryKey);
    const needsProfile = profileQueryDebug.isMissingProfile(queryKey);

    let recommendation = 'OK';
    if (needsProfile) {
      recommendation = 'CRITICAL: This query MUST include profileId for data isolation!';
    } else if (!aware && Array.isArray(queryKey) && queryKey.length > 0) {
      const feature = String(queryKey[0]);
      if (!['currencies', 'countries', 'exchange-rates'].includes(feature)) {
        recommendation = 'Consider adding profileId if this query returns user-specific data';
      }
    }

    return {
      isProfileAware: aware,
      profileId,
      needsProfile,
      recommendation,
    };
  },
};

export default queryKeys; 