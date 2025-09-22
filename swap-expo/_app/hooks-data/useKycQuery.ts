/**
 * Professional KYC Query Hook
 *
 * Enterprise-grade KYC state management leveraging existing TanStack Query infrastructure.
 * Implements advanced patterns for real-time updates, optimistic UI, and intelligent caching.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import logger from '../utils/logger';
import { queryKeys } from '../tanstack-query/queryKeys';
import apiClient from '../_api/apiClient';
import { getStaleTimeForQuery, staleTimeManager } from '../tanstack-query/config/staleTimeConfig';
import { useOptimisticUpdates } from '../tanstack-query/optimistic/useOptimisticUpdates';
import { userRepository } from '../localdb/UserRepository';

// KYC status types based on actual backend response
export type KycLevel = 'not_started' | 'pending' | 'approved' | 'rejected' | 'in_review';
export type KycDocumentType = 'passport' | 'drivers_license' | 'national_id' | 'utility_bill' | 'bank_statement';
export type KycDocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface KycDocument {
  id: string;
  document_type: KycDocumentType;
  verification_status: KycDocumentStatus;
  created_at: string;
  updated_at: string;
  document_number?: string;
  review_notes?: string;
  verified_at?: string;
}

export interface KycStepStatus {
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  completed_at?: string;
  data?: any;
}

export interface KycStatus {
  // Entity info
  entity_type: 'profile' | 'business';
  kyc_status: KycLevel;

  // Documents
  documents: KycDocument[];

  // Verification flags
  email_verified: boolean;
  phone_verified: boolean;
  setup_account_completed: boolean;
  personal_info_completed: boolean;
  email_verification_completed: boolean;
  phone_verification_completed: boolean;
  document_verification_completed: boolean;
  selfie_completed: boolean;
  security_setup_completed: boolean;
  biometric_setup_completed: boolean;
  passcode_setup: boolean;

  // Contact info
  email?: string;
  phone?: string;

  // Completion timestamps
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  setup_account_completed_at?: string;
  personal_info_completed_at?: string;
  email_verification_completed_at?: string;
  phone_verification_completed_at?: string;
  document_verification_completed_at?: string;
  selfie_completed_at?: string;
  security_setup_completed_at?: string;
  biometric_setup_completed_at?: string;

  // Step details
  steps: {
    setup_account: KycStepStatus;
    personal_info: KycStepStatus;
    email_verification: KycStepStatus;
    phone_verification: KycStepStatus;
    document_verification: KycStepStatus;
    selfie: KycStepStatus;
    security_setup: KycStepStatus;
    biometric_setup: KycStepStatus;
    business_info?: KycStepStatus;
    business_verification?: KycStepStatus;
    business_security?: KycStepStatus;
  };

  // Process info
  process: any;

  // Compatibility properties for existing code
  currentLevel?: KycLevel;
  isVerificationInProgress?: boolean;
  completedAt?: string;
}

/**
 * KYC Query Configuration
 * Leverages existing enterprise infrastructure for optimal performance
 */
interface KycQueryConfig {
  entityId: string;
  enableRealTimeUpdates?: boolean;
  enableOptimisticUpdates?: boolean;
  enableFocusRefresh?: boolean;
  criticalFlow?: boolean; // Use CRITICAL_FLOW stale time preset
}

/**
 * Professional KYC Query Hook
 *
 * Features:
 * - Smart cache invalidation on navigation focus
 * - Critical flow optimization using existing stale time manager
 * - Optimistic updates for instant feedback
 * - Dependency-based query key strategies
 * - Enterprise-grade error handling
 */
export const useKycQuery = (config: KycQueryConfig) => {
  const queryClient = useQueryClient();
  const { addOptimisticUpdate, removeOptimisticUpdate } = useOptimisticUpdates();

  // Generate smart query key with dependency mapping
  const queryKey = React.useMemo(() =>
    queryKeys.kycStatus(config.entityId),
    [config.entityId]
  );

  // Calculate stale time based on context
  const staleTime = React.useMemo(() => {
    if (config.criticalFlow) {
      // Use existing CRITICAL_FLOW preset for real-time KYC completion
      return staleTimeManager.getStaleTime('profile'); // Will use CRITICAL_FLOW behavior
    }
    return getStaleTimeForQuery('profile');
  }, [config.criticalFlow]);

  // Main KYC status query with enterprise configuration
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      logger.debug('[useKycQuery] Fetching KYC status for entity:', config.entityId);

      try {
        // STEP 1: Check local database first (local-first pattern)
        const localKycStatus = await userRepository.getKycStatus();
        if (localKycStatus) {
          logger.debug('[useKycQuery] 💾 Returning cached KYC status from local DB');

          // PROFESSIONAL FIX: Parse local database format to match API response format
          let parsedLocalData;
          if (localKycStatus.data && typeof localKycStatus.data === 'string') {
            try {
              // Parse JSON string from local database
              parsedLocalData = JSON.parse(localKycStatus.data);
              logger.debug('[useKycQuery] 🔧 Parsed local KYC data from JSON string');
            } catch (parseError) {
              logger.warn('[useKycQuery] ⚠️ Failed to parse local KYC data JSON, using raw data');
              parsedLocalData = localKycStatus;
            }
          } else {
            // Data is already an object or doesn't exist
            parsedLocalData = localKycStatus.data || localKycStatus;
          }

          // STEP 2: Background sync if data might be stale (non-blocking)
          setTimeout(async () => {
            try {
              logger.debug('[useKycQuery] 🔄 Background sync: Fetching fresh KYC status');
              const response = await apiClient.get('/kyc/verification-status');

              if (response.data) {
                // Update local DB with fresh data
                await userRepository.saveKycStatus({
                  ...response.data,
                  id: config.entityId,
                  is_synced: true
                });

                // Only update cache if data has actually changed (prevents unnecessary re-renders)
                const currentData = queryClient.getQueryData(queryKey);
                if (JSON.stringify(currentData) !== JSON.stringify(response.data)) {
                  queryClient.setQueryData(queryKey, response.data);
                  logger.debug('[useKycQuery] ✅ Background sync: Updated with fresh data');
                } else {
                  logger.debug('[useKycQuery] ✅ Background sync: Data unchanged, skipping cache update');
                }
              }
            } catch (error) {
              logger.debug('[useKycQuery] ⚠️ Background sync failed (non-critical):', error.message);
            }
          }, 1000); // 1 second delay for background sync

          // Return parsed data in the expected format
          return parsedLocalData;
        }

        // STEP 3: No local cache - fetch from API (first time only)
        logger.debug('[useKycQuery] 🌐 No local cache, fetching from API');
        const response = await apiClient.get('/kyc/verification-status');

        if (response.data) {
          // Save to local DB for next time
          await userRepository.saveKycStatus({
            ...response.data,
            id: config.entityId,
            is_synced: true
          });
          logger.debug('[useKycQuery] ✅ KYC status fetched and saved to local DB');
          return response.data;
        } else {
          throw new Error('No KYC status data received');
        }
      } catch (error) {
        // Check if we have local data as fallback
        const localKycStatus = await userRepository.getKycStatus();
        if (localKycStatus) {
          logger.debug('[useKycQuery] 📱 Using local cache as fallback due to error');

          // PROFESSIONAL FIX: Apply same parsing logic for fallback data
          let parsedLocalData;
          if (localKycStatus.data && typeof localKycStatus.data === 'string') {
            try {
              parsedLocalData = JSON.parse(localKycStatus.data);
              logger.debug('[useKycQuery] 🔧 Parsed fallback KYC data from JSON string');
            } catch (parseError) {
              logger.warn('[useKycQuery] ⚠️ Failed to parse fallback KYC data JSON, using raw data');
              parsedLocalData = localKycStatus;
            }
          } else {
            parsedLocalData = localKycStatus.data || localKycStatus;
          }

          return parsedLocalData;
        }

        logger.error('[useKycQuery] ❌ Failed to fetch KYC status:', error);
        throw error;
      }
    },
    enabled: !!config.entityId,
    staleTime,
    gcTime: 30 * 60 * 1000, // 30 minutes cache time

    // Enterprise-grade network behavior
    networkMode: 'offlineFirst',
    refetchOnWindowFocus: false, // We handle focus manually
    refetchOnReconnect: true,
    refetchOnMount: false,

    // Professional retry strategy
    retry: (failureCount, error: any) => {
      if (error?.status === 404 || error?.status === 403) return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Performance optimization
    structuralSharing: true,
    placeholderData: (previousData: any) => previousData,

    meta: {
      errorMessage: 'Failed to load KYC verification status',
    },
  });

  // Focus-based refresh using navigation awareness
  useFocusEffect(
    React.useCallback(() => {
      if (config.enableFocusRefresh !== false) {
        logger.debug('[useKycQuery] Screen focused, checking for stale data');

        // Only refetch if data is stale or we're in critical flow
        const shouldRefetch = config.criticalFlow ||
          (query.dataUpdatedAt && Date.now() - query.dataUpdatedAt > staleTime);

        if (shouldRefetch && !query.isFetching) {
          logger.debug('[useKycQuery] Triggering focus-based refresh');
          query.refetch();
        }
      }
    }, [config.enableFocusRefresh, config.criticalFlow, staleTime, query.dataUpdatedAt, query.isFetching])
  );

  /**
   * Professional KYC step completion mutation
   * Features optimistic updates and systematic cache invalidation
   */
  const completeStepMutation = useMutation({
    mutationFn: async ({
      stepType,
      stepData
    }: {
      stepType: string;
      stepData: any
    }) => {
      logger.debug(`[useKycQuery] Completing KYC step: ${stepType}`);

      // Add optimistic update for instant UI feedback
      if (config.enableOptimisticUpdates !== false) {
        const optimisticUpdate = {
          queryKey,
          updater: (old: any) => {
            if (!old) return old;
            return {
              ...old,
              steps: {
                ...old.steps,
                [stepType]: {
                  ...old.steps?.[stepType],
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                  data: stepData
                }
              },
              [`${stepType}_completed`]: true,
              [`${stepType}_completed_at`]: new Date().toISOString()
            };
          }
        };

        addOptimisticUpdate('kyc-step-completion', optimisticUpdate);
      }

      // Execute the actual API call
      const response = await apiClient.post(`/kyc/${stepType.replace('_', '-')}`, stepData);
      return response.data;
    },

    onSuccess: (data, variables) => {
      logger.debug(`[useKycQuery] ✅ Step completion successful: ${variables.stepType}`);

      // Remove optimistic update and invalidate for fresh data
      if (config.enableOptimisticUpdates !== false) {
        removeOptimisticUpdate('kyc-step-completion');
      }

      // Systematic cache invalidation for dependent queries
      queryClient.invalidateQueries({ queryKey });

      // Invalidate related queries that might depend on KYC status
      queryClient.invalidateQueries({
        queryKey: ['user', 'profile'],
        exact: false
      });

      // Update stale time manager for critical flow context
      if (config.criticalFlow) {
        staleTimeManager.updateBehavior({ isInCriticalFlow: true });
      }
    },

    onError: (error, variables) => {
      logger.error(`[useKycQuery] ❌ Step completion failed: ${variables.stepType}`, error);

      // Remove failed optimistic update
      if (config.enableOptimisticUpdates !== false) {
        removeOptimisticUpdate('kyc-step-completion');
      }
    },

    // Retry configuration for critical mutations
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  /**
   * Intelligent refresh function that respects context
   */
  const refresh = React.useCallback(async () => {
    logger.debug('[useKycQuery] Manual refresh triggered');

    // Update behavior context for active refresh
    staleTimeManager.updateBehavior({
      isActiveUser: true,
      isInCriticalFlow: config.criticalFlow || false
    });

    return query.refetch();
  }, [config.criticalFlow, query.refetch]);

  /**
   * Smart invalidation that handles dependency chains
   */
  const invalidate = React.useCallback(() => {
    logger.debug('[useKycQuery] Invalidating KYC queries');

    queryClient.invalidateQueries({ queryKey });

    // Invalidate dependent queries
    queryClient.invalidateQueries({
      predicate: (query) => {
        return query.queryKey.includes('kyc') ||
               query.queryKey.includes('profile') ||
               query.queryKey.includes('verification');
      }
    });
  }, [queryClient, queryKey]);

  return {
    // Core query data
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,

    // Professional methods
    refresh,
    invalidate,
    completeStep: completeStepMutation.mutateAsync,

    // Status information
    isCompletingStep: completeStepMutation.isPending,
    stepCompletionError: completeStepMutation.error,

    // Enterprise features
    lastUpdated: query.dataUpdatedAt,
    isStale: query.isStale,

    // Legacy compatibility
    refetch: refresh, // For backward compatibility
  };
};

/**
 * Convenience hook for KYC status with sensible defaults
 */
export const useKycStatus = (entityId?: string, options: Partial<KycQueryConfig> = {}) => {
  const config: KycQueryConfig = {
    entityId: entityId || '',
    enableRealTimeUpdates: true,
    enableOptimisticUpdates: true,
    enableFocusRefresh: true,
    criticalFlow: false,
    ...options
  };

  return useKycQuery(config);
};

/**
 * Hook for critical KYC flows (payments, transfers, etc.)
 */
export const useKycStatusCritical = (entityId?: string) => {
  return useKycQuery({
    entityId: entityId || '',
    enableRealTimeUpdates: true,
    enableOptimisticUpdates: true,
    enableFocusRefresh: true,
    criticalFlow: true,
  });
};

/**
 * PROFESSIONAL UTILITY HOOKS
 * Enterprise-grade KYC utility functions that leverage the professional query system
 */

/**
 * Hook for checking if KYC is required for specific actions
 */
export const useKycRequirement = (entityId?: string, requiredLevel: KycLevel = 'approved') => {
  const { data: kycStatus, isLoading } = useKycStatus(entityId);

  if (isLoading || !kycStatus) {
    return { isRequired: false, isBlocked: false, isLoading: true };
  }

  const levelHierarchy = { not_started: 0, pending: 1, approved: 2, rejected: 0 };
  const currentLevelValue = levelHierarchy[kycStatus.kyc_status];
  const requiredLevelValue = levelHierarchy[requiredLevel];

  return {
    isRequired: currentLevelValue < requiredLevelValue,
    isBlocked: currentLevelValue < requiredLevelValue,
    isLoading: false,
    currentLevel: kycStatus.kyc_status,
    requiredLevel,
    canUpgrade: kycStatus.kyc_status !== 'pending',
  };
};

/**
 * Hook for getting KYC completion progress
 */
export const useKycProgress = (entityId?: string) => {
  const { data: kycStatus } = useKycStatus(entityId);

  if (!kycStatus) return { percentage: 0, completedSteps: 0, totalSteps: 0 };

  const steps = kycStatus.steps;
  const stepKeys = Object.keys(steps) as (keyof typeof steps)[];
  const completedSteps = stepKeys.filter(key => steps[key].status === 'completed').length;
  const totalSteps = stepKeys.length;

  return {
    percentage: Math.round((completedSteps / totalSteps) * 100),
    completedSteps,
    totalSteps,
    nextStep: stepKeys.find(key => steps[key].status !== 'completed'),
    steps: steps,
  };
};

/**
 * Hook for getting pending KYC documents
 */
export const usePendingKycDocuments = (entityId?: string) => {
  const { data: kycStatus } = useKycStatus(entityId);

  if (!kycStatus) return [];

  return kycStatus.documents.filter(doc => doc.verification_status === 'pending');
};

/**
 * Hook for getting KYC transaction limits
 */
export const useKycLimits = (entityId?: string) => {
  const { data: kycStatus } = useKycStatus(entityId);

  // Return default limits since the backend doesn't provide limits in the response
  const defaultLimits = {
    dailyTransactionLimit: 1000,
    monthlyTransactionLimit: 10000,
    maxSingleTransaction: 500,
    currency: 'USD',
  };

  if (!kycStatus) {
    return defaultLimits;
  }

  // Adjust limits based on KYC status
  switch (kycStatus.kyc_status) {
    case 'approved':
    case 'in_review':
      return {
        dailyTransactionLimit: 10000,
        monthlyTransactionLimit: 100000,
        maxSingleTransaction: 5000,
        currency: 'USD',
      };
    case 'pending':
      return {
        dailyTransactionLimit: 500,
        monthlyTransactionLimit: 5000,
        maxSingleTransaction: 200,
        currency: 'USD',
      };
    default:
      return defaultLimits;
  }
};

/**
 * Hook for checking transaction limits
 */
export const useTransactionLimitCheck = (entityId?: string, amount: number = 0) => {
  const { data: kycStatus } = useKycStatus(entityId);
  const limits = useKycLimits(entityId);

  if (!kycStatus || !limits) {
    return {
      canTransact: false,
      exceedsLimit: false,
      limitType: null as string | null,
      isLoading: true
    };
  }

  // Check against single transaction limit
  if (amount > limits.maxSingleTransaction) {
    return {
      canTransact: false,
      exceedsLimit: true,
      limitType: 'single_transaction',
      isLoading: false,
    };
  }

  // For approved and in_review users, allow transaction
  if (['approved', 'in_review'].includes(kycStatus.kyc_status)) {
    return {
      canTransact: true,
      exceedsLimit: false,
      limitType: null,
      isLoading: false,
    };
  }

  // For pending/not_started users, check daily limit
  if (amount > limits.dailyTransactionLimit) {
    return {
      canTransact: false,
      exceedsLimit: true,
      limitType: 'daily_limit',
      isLoading: false,
    };
  }

  return {
    canTransact: true,
    exceedsLimit: false,
    limitType: null,
    isLoading: false,
  };
};

export default useKycQuery;