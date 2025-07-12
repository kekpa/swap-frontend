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

// User profile interface
export interface UserProfile {
  id: string;
  entityId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  nationality?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  profilePictureUrl?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
  preferences?: {
    language?: string;
    timezone?: string;
    currency?: string;
    notifications?: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
}

/**
 * Fetch user profile from API
 */
const fetchUserProfile = async (entityId: string): Promise<UserProfile> => {
  logger.debug('[useUserProfile] Fetching profile for entity:', entityId);
  
  try {
    const response = await apiClient.get(`/profile/${entityId}`);
    
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
  
  if (profile.firstName && profile.lastName) {
    return `${profile.firstName} ${profile.lastName}`;
  }
  
  if (profile.firstName) {
    return profile.firstName;
  }
  
  if (profile.email) {
    return profile.email.split('@')[0];
  }
  
  if (profile.phoneNumber) {
    return profile.phoneNumber;
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
    'firstName',
    'lastName', 
    'email',
    'phoneNumber',
    'dateOfBirth',
    'address.street',
    'address.city',
    'address.country',
  ];
  
  const completedFields = requiredFields.filter(field => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      return profile[parent as keyof UserProfile]?.[child as any];
    }
    return profile[field as keyof UserProfile];
  });
  
  const missingFields = requiredFields.filter(field => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      return !profile[parent as keyof UserProfile]?.[child as any];
    }
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
  
  return {
    isEmailVerified: profile.isEmailVerified,
    isPhoneVerified: profile.isPhoneVerified,
    isFullyVerified: profile.isEmailVerified && profile.isPhoneVerified,
  };
};

export default useUserProfile;