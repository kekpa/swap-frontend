/**
 * useUpdateProfile Hook
 * 
 * TanStack Query mutation hook for updating user profile information.
 * Implements optimistic updates for immediate UI feedback.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '../../utils/logger';
import { queryKeys } from '../queryKeys';
import { networkService } from '../../services/NetworkService';

// Profile update request interfaces
export interface BasicProfileUpdate {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  phone?: string;
  email?: string;
}

export interface AddressUpdate {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface PreferencesUpdate {
  language?: string;
  currency?: string;
  timezone?: string;
  notifications?: {
    push?: boolean;
    email?: boolean;
    sms?: boolean;
    marketing?: boolean;
  };
  privacy?: {
    profileVisibility?: 'public' | 'friends' | 'private';
    showOnlineStatus?: boolean;
    allowDirectMessages?: boolean;
  };
}

export interface SecurityUpdate {
  currentPassword: string;
  newPassword?: string;
  twoFactorEnabled?: boolean;
  biometricEnabled?: boolean;
}

// Combined profile update request
export interface ProfileUpdateRequest {
  basic?: BasicProfileUpdate;
  address?: AddressUpdate;
  preferences?: PreferencesUpdate;
  security?: SecurityUpdate;
}

// Profile update response
export interface ProfileUpdateResponse {
  success: boolean;
  updatedFields: string[];
  timestamp: string;
  profile?: any; // Updated profile data
}

/**
 * Mock profile update function - replace with actual API call
 */
const updateProfileAPI = async (request: ProfileUpdateRequest): Promise<ProfileUpdateResponse> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Simulate occasional failures for testing
  if (Math.random() < 0.05) {
    throw new Error('Profile update failed - server error');
  }
  
  // Mock validation errors
  if (request.basic?.email && !request.basic.email.includes('@')) {
    throw new Error('Invalid email address');
  }
  
  const updatedFields: string[] = [];
  if (request.basic) updatedFields.push(...Object.keys(request.basic));
  if (request.address) updatedFields.push(...Object.keys(request.address));
  if (request.preferences) updatedFields.push(...Object.keys(request.preferences));
  if (request.security) updatedFields.push('security');
  
  return {
    success: true,
    updatedFields,
    timestamp: new Date().toISOString(),
    profile: {
      // Mock updated profile data
      ...request.basic,
      ...request.address,
      ...request.preferences,
      lastUpdated: new Date().toISOString(),
    },
  };
};

/**
 * useUpdateProfile Hook
 * 
 * Provides profile update functionality with optimistic updates.
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfileAPI,
    
    // Optimistic update - apply changes immediately
    onMutate: async (request: ProfileUpdateRequest) => {
      logger.debug('[useUpdateProfile] 🔄 Starting optimistic profile update:', {
        updateTypes: Object.keys(request),
        timestamp: new Date().toISOString(),
      });

      const entityId = 'current_user_entity_id'; // Replace with actual current user ID

      // Cancel outgoing refetches to avoid conflicts
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.userProfile(entityId) 
      });

      // Snapshot previous profile data
      const previousProfile = queryClient.getQueryData(queryKeys.userProfile(entityId));

      // Apply optimistic updates
      if (previousProfile) {
        const optimisticProfile = {
          ...previousProfile,
          ...request.basic,
          address: {
            ...(previousProfile as any).address,
            ...request.address,
          },
          preferences: {
            ...(previousProfile as any).preferences,
            ...request.preferences,
          },
          lastUpdated: new Date().toISOString(),
          isUpdating: true, // Flag to show loading state in UI
        };

        queryClient.setQueryData(queryKeys.userProfile(entityId), optimisticProfile);
        logger.debug('[useUpdateProfile] ✅ Optimistic profile update applied');
      }

      return { previousProfile, entityId, request };
    },

    // Handle successful profile update
    onSuccess: (data, variables, context) => {
      logger.info('[useUpdateProfile] ✅ Profile update successful:', {
        updatedFields: data.updatedFields,
        timestamp: data.timestamp,
      });

      // Update profile cache with server response
      if (context?.entityId && data.profile) {
        const currentProfile = queryClient.getQueryData(queryKeys.userProfile(context.entityId));
        
        const updatedProfile = {
          ...currentProfile,
          ...data.profile,
          isUpdating: false, // Remove loading flag
          lastSyncedAt: data.timestamp,
        };

        queryClient.setQueryData(queryKeys.userProfile(context.entityId), updatedProfile);
        logger.debug('[useUpdateProfile] ✅ Profile cache updated with server data');
      }

      // Invalidate related queries that might be affected
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.userProfile(),
        refetchType: 'none', // Don't refetch since we just updated
      });

      // If display name or avatar changed, invalidate interactions to update sender info
      if (variables.basic?.displayName || variables.basic?.avatarUrl) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.interactions(),
          refetchType: 'none',
        });
      }

      // Show success notification
      // showSuccessNotification('Profile updated successfully');
    },

    // Handle profile update failure - rollback optimistic update
    onError: (error, variables, context) => {
      logger.error('[useUpdateProfile] ❌ Profile update failed:', {
        error: error.message,
        updateTypes: Object.keys(variables),
      });

      // Rollback to previous profile data
      if (context?.previousProfile && context?.entityId) {
        queryClient.setQueryData(
          queryKeys.userProfile(context.entityId),
          context.previousProfile
        );
        logger.debug('[useUpdateProfile] 🔄 Profile optimistic update rolled back');
      }

      // Show specific error messages based on error type
      let errorMessage = 'Failed to update profile';
      if (error.message.includes('email')) {
        errorMessage = 'Invalid email address';
      } else if (error.message.includes('password')) {
        errorMessage = 'Current password is incorrect';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error - please try again';
      }

      // showErrorNotification(errorMessage);
    },

    // Always run after success or error
    onSettled: (data, error, variables, context) => {
      logger.debug('[useUpdateProfile] 🏁 Profile update operation settled:', {
        success: !error,
        updatedFields: data?.updatedFields,
        error: error?.message,
      });

      // Remove loading flag regardless of outcome
      if (context?.entityId) {
        const currentProfile = queryClient.getQueryData(queryKeys.userProfile(context.entityId));
        if (currentProfile && (currentProfile as any).isUpdating) {
          queryClient.setQueryData(
            queryKeys.userProfile(context.entityId),
            {
              ...currentProfile,
              isUpdating: false,
            }
          );
        }
      }
    },

    // Network mode - profile updates require network connection
    networkMode: 'online',
    
    // Retry configuration
    retry: (failureCount, error: any) => {
      // Don't retry on validation errors (4xx)
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      
      // Don't retry if offline
      if (!networkService.isOnline) {
        return false;
      }
      
      // Retry once for network/server errors
      return failureCount < 1;
    },
  });
};

/**
 * Hook for avatar upload with image optimization
 */
export const useUploadAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageFile: { uri: string; type: string; name: string }) => {
      // Mock avatar upload API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate upload failure occasionally
      if (Math.random() < 0.1) {
        throw new Error('Avatar upload failed');
      }
      
      return {
        avatarUrl: `https://cdn.swap.com/avatars/${Date.now()}.jpg`,
        uploadedAt: new Date().toISOString(),
      };
    },
    
    onSuccess: (data) => {
      logger.info('[useUploadAvatar] ✅ Avatar uploaded successfully:', data.avatarUrl);
      
      // Update profile with new avatar URL
      const entityId = 'current_user_entity_id';
      const currentProfile = queryClient.getQueryData(queryKeys.userProfile(entityId));
      
      if (currentProfile) {
        queryClient.setQueryData(queryKeys.userProfile(entityId), {
          ...currentProfile,
          avatarUrl: data.avatarUrl,
          lastUpdated: data.uploadedAt,
        });
      }
      
      // Invalidate interactions to update avatar in message history
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.interactions(),
        refetchType: 'none',
      });
    },
    
    onError: (error) => {
      logger.error('[useUploadAvatar] ❌ Avatar upload failed:', error.message);
      // showErrorNotification('Failed to upload avatar. Please try again.');
    },
  });
};

/**
 * Hook for deleting user account
 */
export const useDeleteAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (confirmation: { password: string; confirmationText: string }) => {
      // Mock account deletion API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (confirmation.confirmationText !== 'DELETE MY ACCOUNT') {
        throw new Error('Confirmation text does not match');
      }
      
      return { success: true, deletedAt: new Date().toISOString() };
    },
    
    onSuccess: () => {
      logger.info('[useDeleteAccount] ✅ Account deleted successfully');
      
      // Clear all cached data
      queryClient.clear();
      
      // Redirect to login/signup screen would happen here
      // navigateToAuth();
    },
    
    onError: (error) => {
      logger.error('[useDeleteAccount] ❌ Account deletion failed:', error.message);
      // showErrorNotification(`Failed to delete account: ${error.message}`);
    },
  });
};

export default useUpdateProfile;