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
  
  // Contact related queries
  contacts: ['contacts'] as const,
  contactsByEntity: (entityId: string) => ['contacts', 'entity', entityId] as const,
  contactDetails: (contactId: string) => ['contacts', 'details', contactId] as const,
  
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
 * Type helpers for query keys
 */
export type QueryKey = typeof queryKeys[keyof typeof queryKeys];
export type BalanceQueryKey = ReturnType<typeof queryKeys.balancesByEntity>;
export type InteractionQueryKey = ReturnType<typeof queryKeys.interactionsByEntity>;
export type TimelineQueryKey = ReturnType<typeof queryKeys.timeline>;
export type TransactionQueryKey = ReturnType<typeof queryKeys.transactionsByEntity>;

export default queryKeys; 