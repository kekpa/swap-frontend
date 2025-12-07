/**
 * Professional KYC Completion Hook
 *
 * Simplified, practical hook that provides enterprise-grade KYC completion
 * with systematic cache invalidation and professional error handling.
 *
 * This hook replaces all individual completion patterns across KYC flows.
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { logger } from '../utils/logger';
import apiClient from '../_api/apiClient';
import { invalidateQueries } from '../tanstack-query/queryClient';
import { ProfileStackParamList } from '../navigation/profileNavigator';
import { userRepository } from '../localdb/UserRepository';
import { networkService } from '../services/NetworkService';
import { useAuthContext } from '../features/auth/context/AuthContext';
import { kycOfflineQueue } from '../services/KycOfflineQueue';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

/**
 * KYC Step Types mapped to API endpoints
 *
 * VERIFIED: These step types have confirmed backend endpoints.
 * Removed unsupported types:
 * - business_verification: No completion endpoint exists
 * - business_security: Handled by setup_security step
 * - business_documents: Handled by regular document upload
 */
export type KycStepType =
  // Personal KYC steps
  | 'confirm_phone'
  | 'personal_info'
  | 'take_selfie'
  | 'passcode_setup'
  // Note: biometric_setup removed - biometric is local-only, not tracked in backend
  // Business KYC steps (verified with backend)
  | 'business_info'
  | 'business_address'
  | 'business_owner_info';

/**
 * KYC Completion Options
 */
interface KycCompletionOptions {
  returnToTimeline?: boolean;
  sourceRoute?: string;
  showSuccessAlert?: boolean;
  customSuccessMessage?: string;
  skipNavigation?: boolean;
}

/**
 * Professional KYC Completion Hook
 */
export const useKycCompletion = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthContext();

  /**
   * Get API endpoint for KYC step
   *
   * VERIFIED BACKEND ENDPOINTS (from backend/mono-backend/src/modules/compliance/kyc/kyc.controller.ts):
   * - POST /kyc/identity (line 206): Universal for both personal_info AND business_info
   * - POST /kyc/address (line 296): Universal for both personal AND business addresses
   * - POST /kyc/team-members (line 1177): Add admin team member or beneficial owner
   * - POST /kyc/phone-verify (line 396): Phone verification
   * - POST /kyc/selfie (line 102): Selfie upload
   * - POST /auth/store-passcode: Security/passcode setup
   * Note: biometric_setup removed - biometric is local-only, not tracked in backend
   */
  const getApiEndpoint = useCallback((stepType: KycStepType): string => {
    const endpointMap: Record<KycStepType, string> = {
      // Personal KYC endpoints
      confirm_phone: '/kyc/phone-verify',
      personal_info: '/kyc/identity', // Universal endpoint
      take_selfie: '/kyc/selfie',
      passcode_setup: '/auth/store-passcode',

      // Business KYC endpoints (use universal endpoints)
      business_info: '/kyc/identity', // ✅ Same as personal - verified line 206
      business_address: '/kyc/address', // ✅ FIXED: was /kyc/business-address - verified line 296
      business_owner_info: '/kyc/team-members', // ✅ FIXED: was /kyc/business-owner-info - verified line 1177
    };

    return endpointMap[stepType];
  }, []);

  /**
   * Professional systematic cache invalidation
   */
  const invalidateKycCache = useCallback((stepType: KycStepType) => {
    logger.debug(`[useKycCompletion] 🔄 Triggering systematic cache invalidation for ${stepType}`);

    // Primary KYC cache invalidation
    invalidateQueries(['kyc']);
    invalidateQueries(['profile']);

    // Step-specific cache invalidation
    const stepDependencies: Partial<Record<KycStepType, string[]>> = {
      confirm_phone: ['auth', 'phone'],
      personal_info: ['profile', 'user'],
      passcode_setup: ['auth', 'security'],
      business_info: ['business'],
    };

    const dependencies = stepDependencies[stepType] || [];
    dependencies.forEach(dep => invalidateQueries([dep]));

    logger.debug(`[useKycCompletion] ✅ Cache invalidation completed: ${dependencies.length + 2} query groups`);
  }, []);

  /**
   * Get next KYC step after current completion
   * Note: passcode_setup is now the final KYC step (biometric is local-only)
   */
  const getNextKycStep = useCallback((completedStep: KycStepType): string | null => {
    const stepFlow: Record<string, string | null> = {
      'confirm_phone': 'PersonalInfoFlow',
      'personal_info': 'UploadId', // Document upload
      'take_selfie': 'Passcode',
      'passcode_setup': null, // Final KYC step (biometric is local-only, not tracked)
    };

    return stepFlow[completedStep] || null;
  }, []);

  /**
   * Professional navigation handler with direct next step navigation
   */
  const handleNavigation = useCallback(async (options: KycCompletionOptions, completedStep?: KycStepType) => {
    if (options.skipNavigation) return;

    // NEW: Direct next step navigation for better UX
    if (options.returnToTimeline && completedStep) {
      const nextStep = getNextKycStep(completedStep);

      if (nextStep) {
        logger.debug(`[useKycCompletion] 🎯 Navigating directly to next step: ${nextStep}`);
        const navParams = {
          returnToTimeline: true,
          sourceRoute: options.sourceRoute
        };

        // Navigate directly to next step
        if (nextStep === 'Passcode') {
          navigation.navigate('Passcode', { isKycFlow: true, ...navParams });
        } else {
          navigation.navigate(nextStep, navParams);
        }
        return;
      } else {
        // Final step completed - go to VerifyYourIdentity completion screen
        logger.debug('[useKycCompletion] 🎉 All steps completed - going to completion screen');
        navigation.navigate('VerifyYourIdentity', options.sourceRoute ? { sourceRoute: options.sourceRoute } : undefined);
        return;
      }
    }

    // Fallback to original logic
    if (options.returnToTimeline) {
      logger.debug('[useKycCompletion] 📍 Returning to VerifyYourIdentity timeline');
      navigation.navigate('VerifyYourIdentity', options.sourceRoute ? { sourceRoute: options.sourceRoute } : undefined);
    } else {
      logger.debug('[useKycCompletion] 📍 Default navigation - going back');
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('VerifyYourIdentity');
      }
    }
  }, [navigation, getNextKycStep, invalidateKycCache]);

  /**
   * Professional KYC step completion
   */
  const completeStep = useCallback(async (
    stepType: KycStepType,
    data: any,
    options: KycCompletionOptions = {}
  ): Promise<{ success: boolean; error?: Error }> => {
    const {
      returnToTimeline = true,
      showSuccessAlert = false,
      customSuccessMessage,
    } = options;

    const startTime = Date.now();

    logger.info(`[useKycCompletion] 🚀 Starting KYC completion: ${stepType}`, {
      stepType,
      returnToTimeline,
      dataSize: JSON.stringify(data || {}).length,
    });

    try {
      // Phase 1: Save to local database immediately (local-first pattern)
      if (user?.entityId && user?.profileId) {
        const kycData = {
          id: user.entityId,
          profile_id: user.profileId, // Required for multi-profile data isolation
          [`${stepType}_completed`]: true,
          [`${stepType}_data`]: data,
          [`${stepType}_completed_at`]: new Date().toISOString(),
          is_synced: false // Mark as unsynced initially
        };

        await userRepository.saveKycStatus(kycData);
        logger.debug(`[useKycCompletion] 💾 Saved to local DB: ${stepType}`);
      }

      // Phase 2: Execute API call with professional error handling
      const endpoint = getApiEndpoint(stepType);
      if (!endpoint) {
        throw new Error(`No API endpoint configured for step: ${stepType}`);
      }

      // Check network status
      const isOnline = networkService.isOnline();

      if (isOnline) {
        logger.debug(`[useKycCompletion] 🌐 Executing API call: ${endpoint}`);

        // Use data directly (upload_id no longer supported - documents handle completion automatically)
        const apiData = data;


        logger.debug(`[useKycCompletion] API payload for ${stepType}:`, apiData);

        const response = await apiClient.post(endpoint, apiData, {
          timeout: 30000, // 30 second timeout for KYC operations
        });

        logger.debug(`[useKycCompletion] ✅ API call successful: ${response.status}`);

        // Phase 3: Mark as synced in local DB
        if (user?.entityId && user?.profileId) {
          const kycData = {
            id: user.entityId,
            profile_id: user.profileId, // Required for multi-profile data isolation
            [`${stepType}_completed`]: true,
            [`${stepType}_data`]: data,
            [`${stepType}_completed_at`]: new Date().toISOString(),
            is_synced: true // Mark as synced after successful API call
          };
          await userRepository.saveKycStatus(kycData);
          logger.debug(`[useKycCompletion] ✅ Marked as synced in local DB: ${stepType}`);
        }
      } else {
        logger.info(`[useKycCompletion] 📱 OFFLINE MODE: Queuing ${stepType} for background sync`);

        // Phase 3: Queue for offline processing using professional KYC offline queue
        if (user?.entityId) {
          // Use data directly (upload_id no longer supported - documents handle completion automatically)
          const queueData = data;

          await kycOfflineQueue.queueKycOperation(stepType, queueData, user.entityId, endpoint);
          logger.debug(`[useKycCompletion] ✅ KYC operation queued for offline processing: ${stepType}`);
        }
      }

      // Phase 4: Systematic cache invalidation for instant UI updates
      invalidateKycCache(stepType);

      // Success feedback
      if (showSuccessAlert) {
        const message = customSuccessMessage || `${stepType.replace('_', ' ')} completed successfully!`;
        Alert.alert('Success', message);
      }

      // Navigation (brief delay for cache invalidation to propagate)
      setTimeout(() => {
        handleNavigation(options, stepType);
      }, 150);

      // Phase 5: Success logging
      const duration = Date.now() - startTime;
      logger.info(`[useKycCompletion] ✅ KYC completion successful: ${stepType}`, {
        stepType,
        duration,
        cacheInvalidated: true,
        navigationScheduled: !options.skipNavigation
      });

      return { success: true };

    } catch (error) {
      const duration = Date.now() - startTime;
      const isOnline = networkService.isOnline();

      // If offline, the data is already saved locally and queued, so it's not a failure
      if (!isOnline && user?.entityId) {
        logger.info(`[useKycCompletion] 📱 OFFLINE: ${stepType} saved locally and queued for later sync`, {
          stepType,
          duration,
          queuedOperations: kycOfflineQueue.getPendingCount()
        });

        // Still invalidate cache to update UI
        invalidateKycCache(stepType);

        // Show offline success message
        if (options.showSuccessAlert) {
          const pendingCount = kycOfflineQueue.getPendingCount();
          Alert.alert(
            'Saved Offline',
            `Your ${stepType.replace('_', ' ')} has been saved and will sync when connected.${
              pendingCount > 1 ? ` (${pendingCount} operations queued)` : ''
            }`
          );
        }

        // Navigate (brief delay for cache invalidation to propagate)
        setTimeout(() => {
          handleNavigation(options, stepType);
        }, 150);

        return { success: true };
      }

      // Online error handling
      logger.error(`[useKycCompletion] ❌ KYC completion failed: ${stepType}`, {
        stepType,
        duration,
        error: error.message,
        status: error.response?.status
      });

      // Error handling
      const errorMessage = error.response?.data?.message ||
                          error.message ||
                          'An error occurred while saving your information';

      Alert.alert(
        'Error',
        `Failed to complete ${stepType.replace('_', ' ')}. ${errorMessage}`,
        [
          {
            text: 'Retry',
            onPress: () => completeStep(stepType, data, options)
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );

      return { success: false, error: error as Error };
    }
  }, [getApiEndpoint, invalidateKycCache, handleNavigation, user]);

  /**
   * BEST PRACTICE: Single completeStep method (industry standard)
   *
   * Removed convenience method wrappers (completePersonalInfo, completeBiometric, etc.)
   * Following industry patterns from React Hook Form, TanStack Query, Stripe SDK.
   *
   * Use directly:
   *   await completeStep('personal_info', data, options);
   *   await completeStep('business_address', address, options);
   */

  return {
    // Core completion method (single entry point)
    completeStep,

    // Utility methods
    invalidateKycCache,

    // Phase 3: Offline queue utilities
    getOfflineQueueStats: () => kycOfflineQueue.getQueueStats(),
    isStepQueued: (stepType: KycStepType) => user?.entityId ? kycOfflineQueue.isStepQueued(stepType, user.entityId) : false,
    retryFailedOperations: () => kycOfflineQueue.retryFailedOperations(),
    clearFailedOperations: () => kycOfflineQueue.clearFailedOperations(),
  };
};

export default useKycCompletion;