/**
 * useRoscaEnrollments Hook
 *
 * TanStack Query hook for Rosca (Sol) enrollments with WhatsApp-style local-first architecture.
 * Shows cached data instantly, syncs in background.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../tanstack-query/queryKeys';
import apiClient from '../_api/apiClient';
import { ROSCA_PATHS } from '../_api/apiPaths';
import logger from '../utils/logger';
import { roscaRepository } from '../localdb/RoscaRepository';
import { parseApiResponse } from '../utils/apiResponseParser';
import { useCurrentEntityId } from '../hooks/useCurrentEntityId';
import { useAuthContext } from '../features/auth/context/AuthContext';
import { profileContextManager } from '../services/ProfileContextManager';
import type {
  RoscaEnrollment,
  RoscaEnrollmentDetails,
  JoinPoolDto,
  MakePaymentDto,
  MakePaymentResponse,
} from '../types/rosca.types';

interface UseRoscaEnrollmentsOptions {
  enabled?: boolean;
}

/**
 * useRoscaEnrollments Hook - WhatsApp-Style Local-First
 *
 * Provides rosca enrollments with instant cached data display.
 */
export const useRoscaEnrollments = (entityId: string, options: UseRoscaEnrollmentsOptions = {}) => {
  const { enabled = true } = options;
  const queryClient = useQueryClient();
  const currentEntityId = useCurrentEntityId();
  const { isProfileSwitching } = useAuthContext();

  // Validate entityId AND currentEntityId AND check if enabled
  const isValidEntityId = entityId && entityId.trim().length > 0 && entityId !== 'undefined' && entityId !== 'null';
  const shouldExecute = enabled && isValidEntityId && !!currentEntityId && !isProfileSwitching;

  if (!isValidEntityId) {
    logger.debug(`[useRoscaEnrollments] ⏸️ SKIPPING: Invalid entityId "${entityId}"`);
  }

  if (isProfileSwitching) {
    logger.debug(`[useRoscaEnrollments] ⏸️ SKIPPING: Profile switch in progress`);
  }

  const fetchEnrollments = async (): Promise<RoscaEnrollment[]> => {
    logger.debug(`[useRoscaEnrollments] Fetching enrollments for entity: ${entityId}`);

    if (!isValidEntityId || !currentEntityId) {
      return [];
    }

    // STEP 1: Load from local cache first (INSTANT display)
    const cachedEnrollments = await roscaRepository.getEnrollments(currentEntityId);
    logger.debug(`[useRoscaEnrollments] ✅ INSTANT: Loaded ${cachedEnrollments.length} enrollments from SQLite cache`);

    // STEP 2: Return cached data IMMEDIATELY if we have it
    if (cachedEnrollments.length > 0) {
      // STEP 3: Background sync (non-blocking)
      const capturedEntityId = currentEntityId;
      setTimeout(async () => {
        try {
          // Profile switch guard
          if (profileContextManager.isProfileStale(capturedEntityId) || profileContextManager.isSwitchingProfile()) {
            logger.debug(`[useRoscaEnrollments] ⏸️ BACKGROUND SYNC SKIPPED: Entity changed`);
            return;
          }

          logger.debug(`[useRoscaEnrollments] 🔄 BACKGROUND SYNC: Fetching fresh data from API`);
          const response = await apiClient.get(ROSCA_PATHS.ENROLLMENTS, {
            params: { entityId: capturedEntityId },
          });

          const apiEnrollments: RoscaEnrollment[] = parseApiResponse(response.data, 'rosca-enrollments');

          // Check again after API call
          if (profileContextManager.isProfileStale(capturedEntityId) || profileContextManager.isSwitchingProfile()) {
            return;
          }

          if (apiEnrollments.length > 0) {
            logger.debug(`[useRoscaEnrollments] ✅ BACKGROUND SYNC: Loaded ${apiEnrollments.length} enrollments from server`);

            // Save to local SQLite
            await roscaRepository.saveEnrollments(apiEnrollments, capturedEntityId);

            // Update TanStack Query cache
            queryClient.setQueryData(queryKeys.roscaEnrollmentsByEntity(capturedEntityId), apiEnrollments);
          }
        } catch (error) {
          logger.debug(`[useRoscaEnrollments] ⚠️ Background sync failed: ${error instanceof Error ? error.message : String(error)}`);
          // Fail silently
        }
      }, 2000);

      return cachedEnrollments;
    }

    // STEP 4: No cache - fetch from API (first time only)
    logger.debug(`[useRoscaEnrollments] 📡 FIRST TIME: No cache found, fetching from API`);
    const response = await apiClient.get(ROSCA_PATHS.ENROLLMENTS, {
      params: { entityId },
    });

    const apiEnrollments: RoscaEnrollment[] = parseApiResponse(response.data, 'rosca-enrollments');
    logger.debug(`[useRoscaEnrollments] ✅ FIRST TIME: Loaded ${apiEnrollments.length} enrollments from server`);

    // Save to cache for next time
    if (apiEnrollments.length > 0) {
      await roscaRepository.saveEnrollments(apiEnrollments, currentEntityId);
    }

    return apiEnrollments;
  };

  return useQuery({
    queryKey: queryKeys.roscaEnrollmentsByEntity(entityId),
    queryFn: fetchEnrollments,
    enabled: Boolean(shouldExecute),
    staleTime: Infinity, // Never show loading for cached data
    gcTime: 1000 * 60 * 30, // 30 minutes
    networkMode: 'always',
    initialData: () => {
      if (!shouldExecute || !currentEntityId) {
        return [];
      }

      const cached = queryClient.getQueryData<RoscaEnrollment[]>(queryKeys.roscaEnrollmentsByEntity(entityId));
      if (cached && cached.length > 0) {
        logger.debug(`[useRoscaEnrollments] ⚡ INITIAL: Using ${cached.length} cached enrollments`);
        return cached;
      }
      return undefined;
    },
  });
};

/**
 * useRoscaEnrollmentDetails Hook
 *
 * Fetches detailed enrollment info including payment history.
 */
export const useRoscaEnrollmentDetails = (enrollmentId: string, options: UseRoscaEnrollmentsOptions = {}) => {
  const { enabled = true } = options;
  const { isProfileSwitching } = useAuthContext();

  const isValidId = enrollmentId && enrollmentId.trim().length > 0;
  const shouldExecute = enabled && isValidId && !isProfileSwitching;

  return useQuery({
    queryKey: queryKeys.roscaEnrollmentDetails(enrollmentId),
    queryFn: async (): Promise<RoscaEnrollmentDetails> => {
      logger.debug(`[useRoscaEnrollmentDetails] Fetching details for: ${enrollmentId}`);
      const response = await apiClient.get(ROSCA_PATHS.ENROLLMENT_DETAILS(enrollmentId));
      return response.data;
    },
    enabled: Boolean(shouldExecute),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
};

/**
 * useJoinPool Mutation
 *
 * Joins a pool and creates a new enrollment.
 */
export const useJoinPool = () => {
  const queryClient = useQueryClient();
  const currentEntityId = useCurrentEntityId();

  return useMutation({
    mutationKey: ['join_rosca_pool'],
    mutationFn: async (dto: JoinPoolDto): Promise<RoscaEnrollment> => {
      if (!currentEntityId) {
        throw new Error('No entity ID available');
      }

      logger.debug(`[useJoinPool] Joining pool: ${dto.poolId}`);
      const response = await apiClient.post(ROSCA_PATHS.ENROLLMENTS, dto, {
        params: { entityId: currentEntityId },
      });
      logger.debug(`[useJoinPool] ✅ Successfully joined pool`);
      return response.data;
    },
    onSuccess: (newEnrollment) => {
      if (!currentEntityId) return;

      // Add new enrollment to cache
      const currentEnrollments = queryClient.getQueryData<RoscaEnrollment[]>(
        queryKeys.roscaEnrollmentsByEntity(currentEntityId)
      );

      if (currentEnrollments) {
        queryClient.setQueryData(
          queryKeys.roscaEnrollmentsByEntity(currentEntityId),
          [...currentEnrollments, newEnrollment]
        );
      } else {
        queryClient.setQueryData(
          queryKeys.roscaEnrollmentsByEntity(currentEntityId),
          [newEnrollment]
        );
      }

      // Save to local SQLite
      roscaRepository.saveEnrollments([newEnrollment], currentEntityId).catch((error) => {
        logger.warn(`[useJoinPool] Failed to save to local cache:`, error);
      });

      // Invalidate pools cache to refresh member counts/available slots
      queryClient.invalidateQueries({
        queryKey: queryKeys.roscaPools(),
      });

      // Clear pools cache timestamp to force fresh fetch next time
      roscaRepository.clearPoolsCacheTimestamp().catch((error) => {
        logger.warn(`[useJoinPool] Failed to clear pools cache timestamp:`, error);
      });

      logger.debug(`[useJoinPool] ✅ Updated enrollments + invalidated pools cache`);
    },
    onError: (error) => {
      logger.error(`[useJoinPool] ❌ Failed to join pool:`, error);
    },
  });
};

/**
 * useMakePayment Mutation
 *
 * Makes a contribution payment for an enrollment.
 * Includes optimistic updates for instant UI feedback.
 */
export const useMakePayment = () => {
  const queryClient = useQueryClient();
  const currentEntityId = useCurrentEntityId();

  return useMutation({
    mutationKey: ['make_rosca_payment'],
    mutationFn: async (dto: MakePaymentDto): Promise<MakePaymentResponse> => {
      if (!currentEntityId) {
        throw new Error('No entity ID available');
      }

      logger.debug(`[useMakePayment] Making payment for enrollment: ${dto.enrollmentId}`);
      const response = await apiClient.post(ROSCA_PATHS.PAYMENTS, dto, {
        params: { entityId: currentEntityId },
      });
      logger.debug(`[useMakePayment] ✅ Payment successful`);
      return response.data;
    },
    onMutate: async (dto) => {
      if (!currentEntityId) return { previousEnrollments: null };

      // Cancel any outgoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: queryKeys.roscaEnrollmentsByEntity(currentEntityId),
      });

      // Snapshot the previous enrollments
      const previousEnrollments = queryClient.getQueryData<RoscaEnrollment[]>(
        queryKeys.roscaEnrollmentsByEntity(currentEntityId)
      );

      // Optimistically update the enrollment
      if (previousEnrollments) {
        const updatedEnrollments = previousEnrollments.map((enrollment) => {
          if (enrollment.id === dto.enrollmentId) {
            // Estimate periods covered (server will return actual)
            const periodsCovered = Math.floor(dto.amount / enrollment.contributionAmount);
            return {
              ...enrollment,
              totalContributed: enrollment.totalContributed + dto.amount,
              contributionsCount: enrollment.contributionsCount + periodsCovered,
              // Don't update nextPaymentDue optimistically - let server calculate
            };
          }
          return enrollment;
        });

        queryClient.setQueryData(
          queryKeys.roscaEnrollmentsByEntity(currentEntityId),
          updatedEnrollments
        );

        logger.debug(`[useMakePayment] ⚡ OPTIMISTIC: Updated enrollment ${dto.enrollmentId} (+G${dto.amount})`);
      }

      return { previousEnrollments };
    },
    onError: (error, dto, context) => {
      logger.error(`[useMakePayment] ❌ Payment failed:`, error);

      // Rollback to the previous state on error
      if (context?.previousEnrollments && currentEntityId) {
        queryClient.setQueryData(
          queryKeys.roscaEnrollmentsByEntity(currentEntityId),
          context.previousEnrollments
        );
        logger.debug(`[useMakePayment] ↩️ ROLLBACK: Restored previous enrollment state`);
      }
    },
    onSettled: (_data, _error, dto) => {
      if (!currentEntityId) return;

      // Refetch to get actual server data (reconciliation)
      queryClient.invalidateQueries({
        queryKey: queryKeys.roscaEnrollmentsByEntity(currentEntityId),
      });

      // Invalidate enrollment details if cached
      queryClient.invalidateQueries({
        queryKey: queryKeys.roscaEnrollmentDetails(dto.enrollmentId),
      });

      // Invalidate payment history
      queryClient.invalidateQueries({
        queryKey: queryKeys.roscaPayments(dto.enrollmentId),
      });

      // Also invalidate balances since wallet was debited
      queryClient.invalidateQueries({
        queryKey: queryKeys.balancesByEntity(currentEntityId),
      });

      logger.debug(`[useMakePayment] ✅ Invalidated related caches for reconciliation`);
    },
  });
};

/**
 * useRoscaPaymentHistory Hook
 *
 * Fetches payment history for an enrollment.
 */
export const useRoscaPaymentHistory = (enrollmentId: string, options: UseRoscaEnrollmentsOptions = {}) => {
  const { enabled = true } = options;
  const { isProfileSwitching } = useAuthContext();

  const isValidId = enrollmentId && enrollmentId.trim().length > 0;
  const shouldExecute = enabled && isValidId && !isProfileSwitching;

  return useQuery({
    queryKey: queryKeys.roscaPayments(enrollmentId),
    queryFn: async () => {
      logger.debug(`[useRoscaPaymentHistory] Fetching payments for: ${enrollmentId}`);
      const response = await apiClient.get(ROSCA_PATHS.ENROLLMENT_PAYMENTS(enrollmentId));
      return parseApiResponse(response.data, 'rosca-payments');
    },
    enabled: Boolean(shouldExecute),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    placeholderData: [], // Ensure data is never undefined while loading
  });
};

