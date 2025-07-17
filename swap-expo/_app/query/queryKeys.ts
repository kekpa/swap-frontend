/**
 * Query Keys Factory
 * 
 * Centralized query key management for TanStack Query.
 * Provides type-safe, consistent query keys across the application.
 */

export const queryKeys = {
  // Wallet/Balance related queries
  balances: ['balances'] as const,
  balancesByEntity: (entityId: string) => ['balances', 'entity', entityId] as const,
  walletsByEntity: (entityId: string) => ['wallets', 'entity', entityId] as const,
  
  // Interaction related queries
  interactions: ['interactions'] as const,
  interactionsByEntity: (entityId: string) => ['interactions', 'entity', entityId] as const,
  interactionDetails: (interactionId: string) => ['interactions', 'details', interactionId] as const,
  
  // Timeline related queries
  timeline: (interactionId: string) => ['timeline', interactionId] as const,
  timelineWithLimit: (interactionId: string, limit: number) => ['timeline', interactionId, 'limit', limit] as const,
  
  // Message related queries
  messages: ['messages'] as const,
  messagesByInteraction: (interactionId: string) => ['messages', 'interaction', interactionId] as const,
  recentMessages: (entityId: string, limit: number) => ['messages', 'recent', entityId, 'limit', limit] as const,
  
  // Transaction related queries
  transactions: ['transactions'] as const,
  transactionsByEntity: (entityId: string) => ['transactions', 'entity', entityId] as const,
  transactionsByWallet: (walletId: string) => ['transactions', 'wallet', walletId] as const,
  transactionsByAccount: (accountId: string, limit: number) => ['transactions', 'account', accountId, 'limit', limit] as const, // NEW: Account-specific filtering
  recentTransactions: (entityId: string, limit: number) => ['transactions', 'recent', entityId, 'limit', limit] as const,
  transactionDetails: (transactionId: string) => ['transactions', 'details', transactionId] as const,
  
  // Search related queries
  search: ['search'] as const,
  searchEntities: (query: string) => ['search', 'entities', query] as const,
  searchContacts: (query: string) => ['search', 'contacts', query] as const,
  
  // User/Profile related queries
  profile: ['profile'] as const,
  userProfile: (entityId: string) => ['profile', 'user', entityId] as const,
  currentProfile: (entityId: string) => ['profile', 'current', entityId] as const,
  profileDetails: (entityId: string) => ['profile', 'details', entityId] as const,
  kycStatus: (entityId: string) => ['kyc', 'status', entityId] as const,
  verificationStatus: (entityId: string) => ['verification', 'status', entityId] as const,
  
  // Contact related queries
  contacts: ['contacts'] as const,
  contactsByEntity: (entityId: string) => ['contacts', 'entity', entityId] as const,
  contactDetails: (contactId: string) => ['contacts', 'details', contactId] as const,
  
  // Conversation related queries
  conversations: ['conversations'] as const,
  recentConversations: (entityId: string, options?: any) => ['conversations', 'recent', entityId, options] as const,
  conversationDetails: (conversationId: string) => ['conversations', 'details', conversationId] as const,
  
  // System/Reference data queries
  currencies: ['currencies'] as const,
  countries: ['countries'] as const,
  exchangeRates: ['exchange-rates'] as const,
  
  // Real-time/Live data queries
  liveBalances: (entityId: string) => ['live', 'balances', entityId] as const,
  liveTransactions: (entityId: string) => ['live', 'transactions', entityId] as const,
  liveMessages: (interactionId: string) => ['live', 'messages', interactionId] as const,
} as const;

/**
 * Query key utilities for common operations
 */
export const queryKeyUtils = {
  /**
   * Get all query keys that should be invalidated when user data changes
   */
  getUserDataKeys: (entityId: string) => [
    queryKeys.balancesByEntity(entityId),
    queryKeys.walletsByEntity(entityId),
    queryKeys.interactionsByEntity(entityId),
    queryKeys.transactionsByEntity(entityId),
    queryKeys.contactsByEntity(entityId),
    queryKeys.currentProfile(entityId),
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
   */
  getWalletKeys: (walletId: string, entityId: string) => [
    queryKeys.transactionsByWallet(walletId),
    queryKeys.balancesByEntity(entityId),
    queryKeys.walletsByEntity(entityId),
  ],

  /**
   * Get all query keys for a specific account
   */
  getAccountKeys: (accountId: string, entityId: string) => [
    queryKeys.transactionsByAccount(accountId, 20), // Default limit
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

export default queryKeys; 