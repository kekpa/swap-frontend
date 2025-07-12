/**
 * useUserProfile Hook
 * 
 * TanStack Query hook for user profile data management.
 * Provides type-safe profile fetching with local-first caching.
 */

import { useQuery } from '@tanstack/react-query';
import logger from '../../utils/logger';
import { queryKeys } from '../queryKeys';
import apiClient from '../../_api/apiClient';
import { getStaleTimeForQuery } from '../config/staleTimeConfig';

// User profile interface matching PersonalUserProfileDto from backend
export interface UserProfile {
  type: 'personal';
  id: string;
  user_id: string;
  entity_id: string;
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  national_id?: string;
  avatar_url?: string;
  kyc_status: 'not_started' | 'pending' | 'approved' | 'rejected';
  status: 'active' | 'inactive' | 'suspended';
  country_code?: string;
  p2p_display_preferences?: Record<string, any>;
  discovery_settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch user profile from API
 */
const fetchUserProfile = async (entityId: string): Promise<UserProfile> => {
  logger.debug('[useUserProfile] Fetching profile for entity:', entityId);
  
  try {
    // Use the correct backend endpoint
    const response = await apiClient.get('/auth/me');
    
    if (response.data) {
      logger.debug('[useUserProfile] ✅ Profile fetched successfully');
      return response.data;
    } else {
      throw new Error('No profile data received');
    }
  } catch (error) {
    logger.error('[useUserProfile] ❌ Failed to fetch profile:', error);
    throw error;
  }
};

/**
 * useUserProfile Hook
 */
export const useUserProfile = (entityId?: string) => {
  return useQuery({
    queryKey: queryKeys.userProfile(entityId || ''),
    queryFn: () => fetchUserProfile(entityId!),
    enabled: !!entityId,
    staleTime: getStaleTimeForQuery('userProfile'),
    networkMode: 'offlineFirst',
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (profile not found) or 403 (access denied)
      if (error?.status === 404 || error?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
    meta: {
      errorMessage: 'Failed to load user profile',
    },
  });
};

/**
 * Hook for getting profile display name
 */
export const useProfileDisplayName = (entityId?: string) => {
  const { data: profile } = useUserProfile(entityId);
  
  if (!profile) return null;
  
  if (profile.first_name && profile.last_name) {
    return `${profile.first_name} ${profile.last_name}`;
  }
  
  if (profile.first_name) {
    return profile.first_name;
  }
  
  if (profile.email) {
    return profile.email.split('@')[0];
  }
  
  if (profile.phone) {
    return profile.phone;
  }
  
  return 'Unknown User';
};

/**
 * Hook for getting profile completion status
 */
export const useProfileCompletion = (entityId?: string) => {
  const { data: profile } = useUserProfile(entityId);
  
  if (!profile) return { percentage: 0, missingFields: [] };
  
  const requiredFields = [
    'first_name',
    'last_name', 
    'email',
    'phone',
    'country_code',
  ];
  
  const completedFields = requiredFields.filter(field => {
    return profile[field as keyof UserProfile];
  });
  
  const missingFields = requiredFields.filter(field => {
    return !profile[field as keyof UserProfile];
  });
  
  return {
    percentage: Math.round((completedFields.length / requiredFields.length) * 100),
    missingFields,
    completedFields,
  };
};

/**
 * Hook for checking verification status
 */
export const useVerificationStatus = (entityId?: string) => {
  const { data: profile } = useUserProfile(entityId);
  
  if (!profile) return { isEmailVerified: false, isPhoneVerified: false };
  
  // For now, assume verified if email/phone exist (backend doesn't provide verification flags)
  return {
    isEmailVerified: !!profile.email,
    isPhoneVerified: !!profile.phone,
    isFullyVerified: !!profile.email && !!profile.phone,
  };
};

export default useUserProfile;