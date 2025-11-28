/**
 * useCurrentProfileId Hook
 *
 * PROFESSIONAL PATTERN: Single source of truth for current profile ID
 *
 * This hook provides access to the currently active profile ID across the app.
 * It's the foundation for profile-aware caching and data isolation.
 *
 * Used across 7 files to maintain consistent profile context access:
 * - useKycQuery
 * - useBalances
 * - useRecentTransactions
 * - useInteractions
 * - useRecentConversations
 * - useUserProfile
 * - useProfileAwareQueryKey
 *
 * @returns {string | null} Current profile ID or null if not authenticated
 *
 * @example
 * ```typescript
 * const profileId = useCurrentProfileId();
 *
 * if (!profileId) {
 *   throw new Error('Profile required');
 * }
 *
 * const queryKey = ['balances', 'profile', profileId, 'entity', entityId];
 * ```
 *
 * Created: 2025-01-18 - Profile context bleeding security fix
 * Fixed: 2025-01-18 - Use exported useAuthContext hook
 */

import { useAuthContext } from '../features/auth/context/AuthContext';

/**
 * Hook to get the current profile ID
 *
 * SECURITY: This is the SINGLE SOURCE OF TRUTH for profile context.
 * All profile-sensitive operations MUST use this hook to ensure
 * personal and business profiles remain isolated.
 */
export const useCurrentProfileId = (): string | null => {
  const { user } = useAuthContext();
  return user?.profileId || null;
};

export default useCurrentProfileId;
