/**
 * Data Hooks - Fetching & Caching
 *
 * These hooks provide cached data, real-time sync, and queries.
 * Use these when you need to GET something (queries, real-time updates).
 *
 * For action hooks (mutations, side effects), see /hooks-actions/index.ts
 */

// Balance hooks
export * from './useBalances';

// Transaction hooks
export * from './useRecentTransactions';
export * from './useTransactionLimits';

// Interaction and messaging hooks
export * from './useInteractions';
export * from './useLocalTimeline'; // LOCAL-FIRST: Replaces useTimeline
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
export * from './useUnifiedSearch';
export * from './useFullTextSearch';

// Profile hooks
export * from './useAvailableProfiles';

// Device capability hooks
export * from './useBiometricAvailability';

// Loading state utilities
export * from './useLoadingState';

// Background sync hooks (from tanstack-query/sync)
export * from '../tanstack-query/sync/useBackgroundSync';

// WebSocket integration hooks
export * from './useWebSocketQuerySync';
export * from './useKycWebSocketSync';

// Adaptive configuration hooks
export * from './useAdaptiveStaleTime';

// Rosca (Sol) hooks - Pool-based savings system
export * from './useRoscaEnrollments';
export * from './useRoscaPools';

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
 * - `useLocalTimeline(interactionId)` - Get message timeline (local-first, instant)
 * - `useRecentConversations(entityId)` - Get recent conversations
 * 
 * **Search:**
 * - `useSearchEntities(query)` - Search for entities/contacts
 * 
 * **Real-time:**
 * - `useWebSocketQuerySync(entityId)` - Enable real-time updates
 * - `useKycWebSocketSync(entityId)` - Enable KYC real-time updates (Phase 3)
 * - `useBackgroundSync(entityId)` - Background data sync
 *
 * **Rosca (Sol) - Pool-based Savings:**
 * - `useRoscaEnrollments(entityId)` - Get user's pool enrollments (local-first)
 * - `useRoscaPools()` - Get available pools to join
 * - `useRoscaPoolDetails(poolId)` - Get detailed pool info
 * - `useJoinPool()` - Join a pool (mutation)
 * - `useMakePayment()` - Make a contribution payment (mutation)
 */