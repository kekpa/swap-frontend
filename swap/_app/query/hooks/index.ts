/**
 * TanStack Query Hooks Exports
 * 
 * Centralized exports for all data fetching hooks.
 * Provides comprehensive data access layer for the Swap app.
 */

// Balance and wallet hooks
export * from './useBalances';
export * from './useWallets';

// Transaction hooks  
export * from './useRecentTransactions';
export * from './useTransactionHistory';

// Interaction and messaging hooks
export * from './useInteractions';
export * from './useTimeline';
export * from './useRecentConversations';

// User profile and identity hooks
export * from './useUserProfile';
export * from './useKycStatus';

// Search hooks
export * from './useSearchEntities';

// Background sync hooks
export * from './useBackgroundSync';

// WebSocket integration hooks
export * from './useWebSocketQuerySync';

// Adaptive configuration hooks
export * from './useAdaptiveStaleTime';

/**
 * Quick reference for common hooks:
 * 
 * **Financial Data:**
 * - `useBalances(entityId)` - Get wallet balances
 * - `useRecentTransactions(entityId, limit)` - Get transaction history
 * 
 * **Profile & Identity:**
 * - `useUserProfile(entityId)` - Get user profile data
 * - `useKycStatus(entityId)` - Get KYC verification status
 * - `useVerificationStatus(entityId)` - Get email/phone verification
 * 
 * **Messaging & Interactions:**
 * - `useInteractions(entityId)` - Get interaction list
 * - `useTimeline(interactionId)` - Get message timeline
 * - `useRecentConversations(entityId)` - Get recent conversations
 * 
 * **Search:**
 * - `useSearchEntities(query)` - Search for entities/contacts
 * 
 * **Real-time:**
 * - `useWebSocketQuerySync(entityId)` - Enable real-time updates
 * - `useBackgroundSync(entityId)` - Background data sync
 */