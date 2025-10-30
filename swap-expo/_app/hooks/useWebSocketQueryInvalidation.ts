/**
 * useWebSocketQueryInvalidation Hook
 *
 * Layer 3 of the Hybrid Professional Messaging Approach.
 *
 * This hook listens to WebSocket events and invalidates React Query cache
 * to ensure real-time message updates across all clients.
 *
 * Architecture:
 * WebSocket Handler → eventEmitter.emit('message:new') → This Hook → queryClient.invalidateQueries()
 *
 * Industry Pattern: Stripe, Square, Revolut real-time messaging
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { eventEmitter } from '../utils/eventEmitter';
import { queryKeys } from '../tanstack-query/queryKeys';
import { logger } from '../utils/logger';

/**
 * Listen to WebSocket message events and invalidate React Query cache
 *
 * @param interactionId - Optional interaction ID to scope invalidation
 *                        If provided, only invalidates queries for this specific interaction
 *                        If not provided, invalidates for all matching events
 */
export const useWebSocketQueryInvalidation = (interactionId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    /**
     * Handle new message events from WebSocket
     * This is fired by WebSocketHandler when a message:new event is received
     */
    const handleMessageNew = (data: any) => {
      console.log('🔥🔥🔥 [useWebSocketQueryInvalidation] HANDLER CALLED - message:new:', {
        eventInteractionId: data.interaction_id,
        scopedInteractionId: interactionId,
        shouldInvalidate: !interactionId || data.interaction_id === interactionId,
        timestamp: new Date().toISOString()
      });

      logger.debug('[useWebSocketQueryInvalidation] 🔔 Received message:new event:', {
        eventInteractionId: data.interaction_id,
        scopedInteractionId: interactionId,
        shouldInvalidate: !interactionId || data.interaction_id === interactionId,
      });

      // If we're scoped to a specific interaction, only invalidate that one
      if (interactionId && data.interaction_id !== interactionId) {
        logger.debug('[useWebSocketQueryInvalidation] ⏭️ Skipping - event for different interaction');
        return;
      }

      const targetInteractionId = data.interaction_id || interactionId;

      if (!targetInteractionId) {
        logger.warn('[useWebSocketQueryInvalidation] ⚠️ No interaction ID available for invalidation');
        return;
      }

      // Invalidate timeline query to trigger refetch
      logger.debug('[useWebSocketQueryInvalidation] 🔄 Invalidating timeline query:', targetInteractionId);
      queryClient.invalidateQueries({
        queryKey: queryKeys.timeline(targetInteractionId),
        refetchType: 'active', // Only refetch if query is currently active/mounted
      });

      // Also invalidate infinite timeline queries (for chat pagination)
      logger.debug('[useWebSocketQueryInvalidation] 🔄 Invalidating infinite timeline queries:', targetInteractionId);
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          // Match: ['timeline', interactionId, 'infinite', pageSize]
          return (
            Array.isArray(key) &&
            key[0] === 'timeline' &&
            key[1] === targetInteractionId &&
            key[2] === 'infinite'
          );
        },
        refetchType: 'active', // Only refetch if query is currently active/mounted
      });

      // Also invalidate interactions list to update last message preview
      logger.debug('[useWebSocketQueryInvalidation] 🔄 Invalidating interactions list');
      queryClient.invalidateQueries({
        queryKey: queryKeys.interactions,
        refetchType: 'active', // Refetch if component is mounted (Slack/WhatsApp pattern)
      });
    };

    /**
     * Handle transaction update events from WebSocket
     * This ensures transaction messages appear in timeline
     */
    const handleTransactionUpdate = (data: any) => {
      logger.debug('[useWebSocketQueryInvalidation] 💰 Received transaction:update event:', {
        transactionId: data.id,
        status: data.status,
      });

      // Transaction updates might affect timeline, invalidate all timelines
      // (We don't know which interaction the transaction belongs to from the event)
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'timeline',
        refetchType: 'active',
      });

      // Also invalidate transactions queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.transactions,
        refetchType: 'none',
      });
    };

    // Subscribe to WebSocket events
    logger.debug('[useWebSocketQueryInvalidation] 🎧 Subscribing to WebSocket events', {
      interactionId: interactionId || 'all',
    });

    console.log('🔥🔥🔥 [useWebSocketQueryInvalidation] SETTING UP LISTENERS:', {
      interactionId: interactionId || 'all',
      willListenTo: ['message:new', 'transaction:update'],
      timestamp: new Date().toISOString()
    });

    eventEmitter.on('message:new', handleMessageNew);
    eventEmitter.on('transaction:update', handleTransactionUpdate);

    console.log('🔥🔥🔥 [useWebSocketQueryInvalidation] LISTENERS REGISTERED:', {
      interactionId: interactionId || 'all',
      registeredEvents: ['message:new', 'transaction:update'],
      timestamp: new Date().toISOString()
    });

    // Cleanup on unmount
    return () => {
      logger.debug('[useWebSocketQueryInvalidation] 🧹 Cleaning up WebSocket event listeners', {
        interactionId: interactionId || 'all',
      });
      eventEmitter.off('message:new', handleMessageNew);
      eventEmitter.off('transaction:update', handleTransactionUpdate);
    };
  }, [interactionId, queryClient]);
};

export default useWebSocketQueryInvalidation;
