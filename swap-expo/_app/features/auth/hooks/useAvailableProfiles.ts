/**
 * useAvailableProfiles Hook
 *
 * TanStack Query hook for fetching all profiles the user has access to.
 * Used for multi-profile switching UI (personal + business profiles).
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../tanstack-query/queryKeys';
import apiClient from '../../../_api/apiClient';
import { AUTH_PATHS } from '../../../_api/apiPaths';
import { logger } from '../../../utils/logger';
import { useAuthContext } from '../context/AuthContext';

// Profile type (matches backend DTO)
export interface AvailableProfile {
  profileId: string;
  entityId: string;
  type: 'personal' | 'business';
  displayName: string;
  avatarUrl?: string;
  status?: string; // 'active' | 'pending_deletion' | 'deleted'
  scheduledDeletionDate?: string; // ISO date string
}

// API response type
interface AvailableProfilesResponse {
  profiles: AvailableProfile[];
}

/**
 * Fetch available profiles from backend
 */
const fetchAvailableProfiles = async (): Promise<AvailableProfile[]> => {
  try {
    logger.debug('[useAvailableProfiles] 🔍 Fetching available profiles...');

    const { data } = await apiClient.get(AUTH_PATHS.AVAILABLE_PROFILES);

    logger.info('[useAvailableProfiles] ✅ Fetched available profiles:', 'auth', {
      count: data.profiles.length,
      types: data.profiles.map((p: AvailableProfile) => p.type),
    });

    return data.profiles;
  } catch (error: any) {
    logger.error('[useAvailableProfiles] ❌ Failed to fetch available profiles:', error);
    throw error;
  }
};

/**
 * useAvailableProfiles Hook
 *
 * Returns query for available profiles with 5-minute cache.
 * Automatically refetches on mount and window focus.
 *
 * SECURITY: Only fetches when user is authenticated to prevent 401 errors.
 */
export const useAvailableProfiles = () => {
  const { isAuthenticated, user } = useAuthContext();

  // SECURITY FIX: Include user ID in cache key to prevent cross-user cache pollution
  // Without this, User A's profiles could be shown to User B after account switch
  const userId = user?.id || user?.profileId || 'anonymous';

  return useQuery({
    queryKey: [...queryKeys.availableProfiles, userId],
    queryFn: fetchAvailableProfiles,

    // Cache for 5 minutes (balances fresh data vs performance)
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes

    // Refetch strategies
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus (mobile doesn't need this)
    refetchOnReconnect: true, // Refetch when internet reconnects

    // Retry configuration
    retry: (failureCount, error: any) => {
      // Don't retry on 401/403 (auth errors)
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }

      // Retry once for network/server errors
      return failureCount < 1;
    },

    // SECURITY FIX: Only run query if user is authenticated (prevents 401 errors after logout)
    enabled: isAuthenticated,
  });
};

export default useAvailableProfiles;
