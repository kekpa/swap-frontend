/**
 * useKycWebSocketSync Hook
 *
 * Integrates WebSocket KYC events with TanStack Query cache invalidation.
 * Follows the same professional pattern as useWebSocketQuerySync.ts.
 *
 * Provides real-time KYC status updates across the app with instant UI feedback.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import logger from '../utils/logger';
import { queryKeys } from '../tanstack-query/queryKeys';
import { websocketService } from '../services/websocketService';

// WebSocket KYC update data structure
interface KycUpdateData {
  entity_id: string;
  step_type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  completed_at?: string;
  data?: any;
  timestamp: string;
}

/**
 * useKycWebSocketSync Hook
 *
 * Sets up WebSocket KYC event listeners and integrates them with TanStack Query
 * for automatic cache invalidation and real-time updates.
 *
 * Follows the exact same pattern as useWebSocketQuerySync for consistency.
 */
export const useKycWebSocketSync = (entityId: string) => {
  const queryClient = useQueryClient();
  const cleanupFunctionsRef = useRef<Array<() => void>>([]);
  const processedKycUpdates = useRef(new Set<string>());

  useEffect(() => {
    if (!entityId) {
      logger.warn('[useKycWebSocketSync] No entityId provided, skipping KYC WebSocket sync setup');
      return;
    }

    logger.info('[useKycWebSocketSync] 🔄 Setting up KYC WebSocket sync for entity:', entityId);

    // Set up KYC update handlers
    setupKycHandlers();

    // Cleanup on unmount
    return () => {
      logger.info('[useKycWebSocketSync] 🧹 Cleaning up KYC WebSocket sync');
      cleanupFunctionsRef.current.forEach(cleanup => cleanup());
      cleanupFunctionsRef.current = [];
    };
  }, [entityId, queryClient]);

  /**
   * Set up KYC-related WebSocket handlers
   */
  const setupKycHandlers = () => {
    logger.debug('[useKycWebSocketSync] 📋 Setting up KYC handlers');

    const kycCleanup = websocketService.onKycUpdate((data: KycUpdateData) => {
      try {
        logger.debug('[useKycWebSocketSync] 📋 Received KYC update via WebSocket:', `entityId: ${data.entity_id}, stepType: ${data.step_type}, status: ${data.status}, timestamp: ${data.timestamp}`);

        // Only process updates for the current user
        if (data.entity_id !== entityId) {
          logger.debug('[useKycWebSocketSync] Skipping KYC update for different entity:', data.entity_id);
          return;
        }

        // Prevent duplicate processing
        const updateId = `${data.entity_id}_${data.step_type}_${data.timestamp}`;
        if (processedKycUpdates.current.has(updateId)) {
          logger.debug('[useKycWebSocketSync] Skipping already processed KYC update:', updateId);
          return;
        }
        processedKycUpdates.current.add(updateId);

        // Update KYC cache optimistically
        handleKycUpdateOptimistically(data);

        // Invalidate related queries for fresh data
        invalidateKycQueries(data);

      } catch (error) {
        logger.error('[useKycWebSocketSync] Error handling WebSocket KYC update:', error);
      }
    });

    if (kycCleanup) {
      cleanupFunctionsRef.current.push(kycCleanup);
    }
  };

  /**
   * Handle KYC update optimistically in cache
   */
  const handleKycUpdateOptimistically = (data: KycUpdateData) => {
    // Update KYC status cache
    const kycQueryKey = queryKeys.kycByEntity(data.entity_id);

    queryClient.setQueryData(kycQueryKey, (oldKycData: any) => {
      if (!oldKycData) {
        // Create new KYC data if none exists
        return {
          id: data.entity_id,
          [`${data.step_type}_completed`]: data.status === 'completed',
          [`${data.step_type}_status`]: data.status,
          [`${data.step_type}_data`]: data.data,
          [`${data.step_type}_completed_at`]: data.completed_at,
          last_updated: data.timestamp,
          is_synced: true
        };
      }

      // Update existing KYC data
      return {
        ...oldKycData,
        [`${data.step_type}_completed`]: data.status === 'completed',
        [`${data.step_type}_status`]: data.status,
        [`${data.step_type}_data`]: data.data,
        [`${data.step_type}_completed_at`]: data.completed_at,
        last_updated: data.timestamp,
        is_synced: true
      };
    });

    // Update KYC progress cache
    const progressQueryKey = queryKeys.kycProgress(data.entity_id);
    queryClient.setQueryData(progressQueryKey, (oldProgress: any) => {
      if (!oldProgress) return oldProgress;

      // Update the progress with new step status
      const updatedSteps = { ...oldProgress.steps };
      updatedSteps[data.step_type] = {
        ...updatedSteps[data.step_type],
        status: data.status,
        completed: data.status === 'completed',
        completed_at: data.completed_at,
        updated_at: data.timestamp
      };

      return {
        ...oldProgress,
        steps: updatedSteps,
        last_updated: data.timestamp
      };
    });

    // Update specific step cache if it exists
    const stepQueryKey = queryKeys.kycStep(data.entity_id, data.step_type);
    queryClient.setQueryData(stepQueryKey, {
      step_type: data.step_type,
      status: data.status,
      completed: data.status === 'completed',
      data: data.data,
      completed_at: data.completed_at,
      updated_at: data.timestamp
    });

    logger.debug('[useKycWebSocketSync] ✅ KYC update added to cache optimistically');
  };

  /**
   * Invalidate KYC-related queries
   */
  const invalidateKycQueries = (data: KycUpdateData) => {
    // Invalidate main KYC queries
    queryClient.invalidateQueries({
      queryKey: queryKeys.kycByEntity(data.entity_id),
      refetchType: 'none', // Don't refetch immediately since we have optimistic data
    });

    queryClient.invalidateQueries({
      queryKey: queryKeys.kycProgress(data.entity_id),
      refetchType: 'none',
    });

    // Invalidate the specific step query
    queryClient.invalidateQueries({
      queryKey: queryKeys.kycStep(data.entity_id, data.step_type),
      refetchType: 'none',
    });

    // Invalidate legacy KYC status queries for backward compatibility
    queryClient.invalidateQueries({
      queryKey: queryKeys.kycStatus(data.entity_id),
      refetchType: 'none',
    });

    // Invalidate profile queries as KYC affects profile completion status
    queryClient.invalidateQueries({
      queryKey: queryKeys.currentProfile(data.entity_id),
      refetchType: 'none',
    });

    // Invalidate general KYC queries
    queryClient.invalidateQueries({
      queryKey: queryKeys.kyc,
      refetchType: 'none',
    });

    logger.debug('[useKycWebSocketSync] ✅ KYC queries invalidated');
  };

  // Cleanup old processed KYC update IDs periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const currentTime = Date.now();
      const oldIds = Array.from(processedKycUpdates.current).filter(id => {
        // Remove IDs older than 10 minutes (adjust as needed)
        const [, , timestampStr] = id.split('_');
        const timestamp = new Date(timestampStr).getTime();
        return currentTime - timestamp > 10 * 60 * 1000;
      });

      oldIds.forEach(id => processedKycUpdates.current.delete(id));

      if (oldIds.length > 0) {
        logger.debug('[useKycWebSocketSync] Cleaned up old processed KYC update IDs');
      }
    }, 60000); // Run every minute

    return () => clearInterval(cleanupInterval);
  }, []);
};

/**
 * Utility hook for manual KYC query invalidation
 * Useful for components that need to trigger KYC cache updates
 */
export const useKycQueryInvalidation = () => {
  const queryClient = useQueryClient();

  const invalidateKycStatus = (entityId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.kycByEntity(entityId),
    });
  };

  const invalidateKycProgress = (entityId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.kycProgress(entityId),
    });
  };

  const invalidateKycStep = (entityId: string, stepType: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.kycStep(entityId, stepType),
    });
  };

  const invalidateAllKyc = (entityId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.kyc,
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.kycByEntity(entityId),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.kycProgress(entityId),
    });
  };

  return {
    invalidateKycStatus,
    invalidateKycProgress,
    invalidateKycStep,
    invalidateAllKyc,
  };
};

export default useKycWebSocketSync;