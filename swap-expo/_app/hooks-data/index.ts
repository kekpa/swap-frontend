/**
 * Data Hooks - Fetching & Caching
 *
 * These hooks provide cached data, real-time sync, and queries.
 * Use these when you need to GET something (queries, real-time updates).
 *
 * For action hooks (mutations, side effects), see /hooks-actions/index.ts
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
export * from './useKycQuery'; // Renamed from useKycStatus

// Reference data hooks
export * from './useCountries';
export * from './useCurrencies';

// Standardized query utilities
export * from './useStandardQuery';

// Search hooks
export * from './useSearchEntities';

// Background sync hooks
export * from './useBackgroundSync';

// WebSocket integration hooks
export * from './useWebSocketQuerySync';
export * from './useKycWebSocketSync';

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
 * - `useKycWebSocketSync(entityId)` - Enable KYC real-time updates (Phase 3)
 * - `useBackgroundSync(entityId)` - Background data sync
 */