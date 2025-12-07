/**
 * useProfileSwitch Hook
 *
 * TanStack Query mutation hook for profile switching with biometric authentication.
 * Implements enterprise security pattern with Face ID/Touch ID gate.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { queryKeys } from '../../../tanstack-query/queryKeys';
import apiClient from '../../../_api/apiClient';
import { AUTH_PATHS } from '../../../_api/apiPaths';
import { logger } from '../../../utils/logger';
import { tokenManager } from '../../../services/token';
import { eventEmitter } from '../../../utils/eventEmitter';
import { clearProfileLocalDB } from '../../../localdb';

// Profile switch request
export interface ProfileSwitchRequest {
  targetProfileId: string;
}

// Profile switch response
export interface ProfileSwitchResponse {
  access_token: string;
  refresh_token: string;
  profile: {
    hasAccess: boolean;
    entityId: string;
    profileType: 'personal' | 'business';
    displayName: string;
  };
}

// Biometric authentication result
export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometricType?: 'fingerprint' | 'facial' | 'iris' | 'none';
}

/**
 * Perform biometric authentication
 * Pattern from wallet2.tsx with circuit breaker
 */
const authenticateWithBiometric = async (): Promise<BiometricAuthResult> => {
  try {
    logger.debug('[useProfileSwitch] 🔐 Starting biometric authentication...');

    // Check if device supports biometric auth
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      logger.warn('[useProfileSwitch] ⚠️ Device does not support biometric authentication');
      return {
        success: false,
        error: 'Biometric authentication not supported on this device',
        biometricType: 'none',
      };
    }

    // Check if biometric is enrolled
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      logger.warn('[useProfileSwitch] ⚠️ No biometric credentials enrolled');
      return {
        success: false,
        error: 'No Face ID or Touch ID set up on this device',
        biometricType: 'none',
      };
    }

    // Get biometric type
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const biometricType =
      supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
        ? 'facial'
        : supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
          ? 'fingerprint'
          : supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)
            ? 'iris'
            : 'none';

    // Perform authentication
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to switch profile',
      fallbackLabel: 'Use Passcode',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false, // Allow passcode as fallback
    });

    if (result.success) {
      logger.info('[useProfileSwitch] ✅ Biometric authentication successful');
      return { success: true, biometricType };
    } else {
      logger.warn('[useProfileSwitch] ❌ Biometric authentication failed');
      return {
        success: false,
        error: 'Authentication failed',
        biometricType,
      };
    }
  } catch (error: any) {
    logger.error('[useProfileSwitch] ❌ Biometric authentication error:', error.message);
    return {
      success: false,
      error: error.message || 'Authentication error',
      biometricType: 'none',
    };
  }
};

/**
 * Call backend to switch profile
 */
const switchProfileAPI = async (request: ProfileSwitchRequest): Promise<ProfileSwitchResponse> => {
  try {
    logger.debug('[useProfileSwitch] 🔄 Calling backend to switch profile:', {
      targetProfileId: request.targetProfileId,
    });

    const { data } = await apiClient.post<ProfileSwitchResponse>(
      AUTH_PATHS.SWITCH_PROFILE,
      request
    );

    logger.info('[useProfileSwitch] ✅ Profile switch successful:', {
      newEntityId: data.profile.entityId,
      profileType: data.profile.profileType,
      displayName: data.profile.displayName,
    });

    return data;
  } catch (error: any) {
    logger.error('[useProfileSwitch] ❌ Profile switch failed:', error.message);
    throw error;
  }
};

/**
 * useProfileSwitch Hook
 *
 * Provides profile switching with biometric authentication.
 * Flow:
 * 1. User triggers switch
 * 2. Biometric prompt appears
 * 3. If successful, call backend
 * 4. Backend validates access, blacklists old JWT, generates new JWT
 * 5. Frontend stores new JWT, invalidates caches, app refreshes
 */
export const useProfileSwitch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: ProfileSwitchRequest) => {
      // Step 1: Biometric authentication
      const authResult = await authenticateWithBiometric();
      if (!authResult.success) {
        throw new Error(authResult.error || 'Authentication failed');
      }

      // Step 2: Call backend API
      const response = await switchProfileAPI(request);
      return response;
    },

    // Handle successful profile switch with SURGICAL cache invalidation
    onSuccess: async (data, variables) => {
      console.log('🔄 [useProfileSwitch] STEP 1: onSuccess started, new profile:', data.profile?.entityId);

      // Step 1: Capture OLD profileId BEFORE switch (for surgical invalidation)
      const oldProfileId = apiClient.getProfileId();
      const newProfileId = data.profile.entityId;

      console.log('🔄 [useProfileSwitch] STEP 2: Captured profileIds:', {
        oldProfileId: oldProfileId || 'none',
        newProfileId,
        profileType: data.profile.profileType,
        displayName: data.profile.displayName
      });

      // Step 2: Store new JWT tokens
      console.log('🔄 [useProfileSwitch] STEP 3: About to update tokens...');
      tokenManager.setAccessToken(data.access_token);
      tokenManager.setRefreshToken(data.refresh_token);
      console.log('🔄 [useProfileSwitch] STEP 4: Tokens updated');

      // Step 3: Update API client with new profile ID
      console.log('🔄 [useProfileSwitch] STEP 5: About to update API headers...');
      apiClient.setProfileId(newProfileId);
      console.log('🔄 [useProfileSwitch] STEP 6: API headers updated, profileId:', newProfileId);

      // Step 4: SURGICAL invalidation - only invalidate old profile's queries
      // This prevents flashing and maintains smooth UX by not touching unrelated queries
      console.log('🔄 [useProfileSwitch] STEP 7: About to invalidate queries...');
      if (oldProfileId) {
        console.log('🔄 [useProfileSwitch] STEP 7a: Performing SURGICAL cache invalidation for old profile:', oldProfileId);

        await queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            // Invalidate only queries that include the OLD profileId
            const shouldInvalidate = Array.isArray(key) &&
                   key.includes('profile') &&
                   key.includes(oldProfileId);

            if (shouldInvalidate) {
              console.log('🔄 [useProfileSwitch] 🗑️ Invalidating query:', key);
            }

            return shouldInvalidate;
          }
        });

        console.log('🔄 [useProfileSwitch] STEP 7b: Surgical invalidation complete');
      } else {
        // Fallback: If we don't have old profileId, do full invalidation
        console.log('🔄 [useProfileSwitch] STEP 7c: No old profileId, performing FULL invalidation');
        await queryClient.invalidateQueries();
      }

      // Step 5: Clear local database for old profile (privacy & data isolation)
      console.log('🔄 [useProfileSwitch] STEP 8: Clearing local DB for old profile...');
      if (oldProfileId) {
        await clearProfileLocalDB(oldProfileId);
        console.log('🔄 [useProfileSwitch] STEP 8a: Local DB cleared for old profile');
      }

      // Step 6: Refetch critical data for NEW profile
      console.log('🔄 [useProfileSwitch] STEP 9: Refetching data for new profile...');
      await queryClient.refetchQueries({
        queryKey: ['profile', newProfileId]
      });
      await queryClient.refetchQueries({
        queryKey: queryKeys.availableProfiles
      });
      console.log('🔄 [useProfileSwitch] STEP 9a: Refetch complete');

      // Step 7: Emit profile switch event for any listeners
      console.log('🔄 [useProfileSwitch] STEP 10: Emitting profile_switched event');
      eventEmitter.emit('profile_switched', {
        from: oldProfileId || 'unknown',
        to: newProfileId,
        profileType: data.profile.profileType,
        displayName: data.profile.displayName,
        timestamp: new Date().toISOString()
      });

      console.log('🔄 [useProfileSwitch] STEP 11: ✅ Profile switch complete! App refreshed with new context');
    },

    // Handle profile switch failure
    onError: (error: any, variables) => {
      logger.error('[useProfileSwitch] ❌ Profile switch failed:', {
        error: error.message,
        targetProfileId: variables.targetProfileId,
      });

      // Error handling is done in the UI layer
      // (ProfileSwitcherModal will show error message)
    },

    // Network mode - profile switching requires network connection
    networkMode: 'online',

    // Don't retry profile switches (they're critical operations)
    retry: false,
  });
};

export default useProfileSwitch;
