/**
 * useWebSocketQuerySync Hook
 * 
 * Integrates WebSocket events with TanStack Query cache invalidation.
 * Replaces manual state updates with proper query invalidation patterns.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import logger from '../utils/logger';
import { queryKeys } from '../tanstack-query/queryKeys';
import { websocketService } from '../services/websocketService';
import { Message } from '../types/message.types';

// WebSocket message types
interface WebSocketMessage {
  type: 'new_message' | 'transaction_update' | 'balance_update' | 'notification';
  data: any;
}

interface MessageData {
  id: string;
  interaction_id: string;
  from_entity_id: string;
  content?: string;
  timestamp: string;
  // Additional WebSocket specific fields if needed
}

interface TransactionUpdateData {
  transaction_id: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount?: number;
  currency_code?: string;
  timestamp: string;
}

interface BalanceUpdateData {
  wallet_id: string;
  entity_id: string;
  currency_code: string;
  new_balance: number;
  available_balance: number;
  reserved_balance: number;
  timestamp: string;
}

interface NotificationData {
  id: string;
  recipient_entity_id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
}

/**
 * useWebSocketQuerySync Hook
 * 
 * Sets up WebSocket event listeners and integrates them with TanStack Query
 * for automatic cache invalidation and updates.
 */
export const useWebSocketQuerySync = (entityId: string) => {
  const queryClient = useQueryClient();
  const cleanupFunctionsRef = useRef<Array<() => void>>([]);
  const processedMessageIds = useRef(new Set<string>());

  useEffect(() => {
    if (!entityId) {
      logger.warn('[useWebSocketQuerySync] No entityId provided, skipping WebSocket sync setup');
      return;
    }

    logger.info('[useWebSocketQuerySync] 🔄 Setting up WebSocket query sync for entity:', entityId);

    // Set up message handlers
    setupMessageHandlers();
    setupTransactionHandlers();
    setupBalanceHandlers();
    setupNotificationHandlers();

    // Cleanup on unmount
    return () => {
      logger.info('[useWebSocketQuerySync] 🧹 Cleaning up WebSocket query sync');
      cleanupFunctionsRef.current.forEach(cleanup => cleanup());
      cleanupFunctionsRef.current = [];
    };
  }, [entityId, queryClient]);

  /**
   * Set up message-related WebSocket handlers
   */
  const setupMessageHandlers = () => {
    logger.debug('[useWebSocketQuerySync] 📨 Setting up message handlers');

    const messageCleanup = websocketService.onMessage((data: MessageData) => {
      try {
        logger.debug('[useWebSocketQuerySync] 📨 Received new message via WebSocket:', `messageId: ${data.id}, interactionId: ${data.interaction_id}, fromEntityId: ${data.from_entity_id}`);

        // Prevent duplicate processing
        if (processedMessageIds.current.has(data.id)) {
          logger.debug('[useWebSocketQuerySync] Skipping already processed message:', data.id);
          return;
        }
        processedMessageIds.current.add(data.id);

        // Update message timeline cache optimistically
        handleNewMessageOptimistically(data);

        // Invalidate related queries for fresh data
        invalidateMessageQueries(data);

      } catch (error) {
        logger.error('[useWebSocketQuerySync] Error handling WebSocket message:', error);
      }
    });

    if (messageCleanup) {
      cleanupFunctionsRef.current.push(messageCleanup);
    }
  };

  /**
   * Set up transaction-related WebSocket handlers
   */
  const setupTransactionHandlers = () => {
    logger.debug('[useWebSocketQuerySync] 💰 Setting up transaction handlers');

    const transactionCleanup = websocketService.onTransactionUpdate((data: TransactionUpdateData) => {
      try {
        logger.debug('[useWebSocketQuerySync] 💰 Received transaction update via WebSocket:', `transactionId: ${data.transaction_id}, status: ${data.status}, timestamp: ${data.timestamp}`);

        // Update transaction cache optimistically
        handleTransactionUpdateOptimistically(data);

        // Invalidate related queries
        invalidateTransactionQueries(data);

      } catch (error) {
        logger.error('[useWebSocketQuerySync] Error handling WebSocket transaction update:', error);
      }
    });

    if (transactionCleanup) {
      cleanupFunctionsRef.current.push(transactionCleanup);
    }
  };

  /**
   * Set up balance-related WebSocket handlers
   */
  const setupBalanceHandlers = () => {
    logger.debug('[useWebSocketQuerySync] 💵 Setting up balance handlers');

    // For now, listen to transaction updates as they affect balances
    // In a real implementation, you'd have a dedicated balance update WebSocket event
    const balanceCleanup = websocketService.onTransactionUpdate((data: TransactionUpdateData) => {
      if (data.status === 'completed') {
        logger.debug('[useWebSocketQuerySync] 💵 Transaction completed, invalidating balance queries');
        
        // Invalidate balance queries when transactions complete
        queryClient.invalidateQueries({
          queryKey: queryKeys.balancesByEntity(entityId),
          refetchType: 'active',
        });
      }
    });

    if (balanceCleanup) {
      cleanupFunctionsRef.current.push(balanceCleanup);
    }
  };

  /**
   * Set up notification-related WebSocket handlers
   */
  const setupNotificationHandlers = () => {
    logger.debug('[useWebSocketQuerySync] 🔔 Setting up notification handlers');

    // This would be implemented when notification WebSocket events exist
    // For now, just set up the structure
  };

  /**
   * Handle new message optimistically in cache
   */
  const handleNewMessageOptimistically = (data: MessageData) => {
    const timelineQueryKey = queryKeys.timeline(data.interaction_id);
    
    // Add message to timeline cache
    queryClient.setQueryData(timelineQueryKey, (oldTimeline: Message[] | undefined) => {
      if (!oldTimeline) return [data];
      
      // Check if message already exists (prevent duplicates)
      const messageExists = oldTimeline.some(msg => msg.id === data.id);
      if (messageExists) return oldTimeline;
      
      // Add new message to timeline
      return [...oldTimeline, data].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });

    // Update interactions list to show latest activity
    const interactionsQueryKey = queryKeys.interactionsByEntity(entityId);
    queryClient.setQueryData(interactionsQueryKey, (oldInteractions: any[] | undefined) => {
      if (!oldInteractions) return oldInteractions;

      return oldInteractions.map(interaction => {
        if (interaction.id === data.interaction_id) {
          return {
            ...interaction,
            last_activity_snippet: data.content || '',
            last_activity_at: data.timestamp,
            last_activity_from_entity_id: data.from_entity_id,
            unread_count: data.from_entity_id !== entityId
              ? (interaction.unread_count || 0) + 1
              : interaction.unread_count,
          };
        }
        return interaction;
      });
    });

    logger.debug('[useWebSocketQuerySync] ✅ Message added to cache optimistically');
  };

  /**
   * Handle transaction update optimistically in cache
   */
  const handleTransactionUpdateOptimistically = (data: TransactionUpdateData) => {
    // Update transaction in recent transactions cache
    const recentTransactionsKey = queryKeys.recentTransactions(entityId, 20);
    
    queryClient.setQueryData(recentTransactionsKey, (oldTransactions: any[] | undefined) => {
      if (!oldTransactions) return oldTransactions;

      return oldTransactions.map(transaction => {
        if (transaction.id === data.transaction_id) {
          return {
            ...transaction,
            status: data.status,
            updated_at: data.timestamp,
          };
        }
        return transaction;
      });
    });

    logger.debug('[useWebSocketQuerySync] ✅ Transaction updated in cache optimistically');
  };

  /**
   * Invalidate message-related queries
   */
  const invalidateMessageQueries = (data: MessageData) => {
    // Invalidate timeline for this specific interaction
    queryClient.invalidateQueries({
      queryKey: queryKeys.timeline(data.interaction_id),
      refetchType: 'none', // Don't refetch immediately since we have optimistic data
    });

    // Invalidate interactions list to update last message info
    queryClient.invalidateQueries({
      queryKey: queryKeys.interactionsByEntity(entityId),
      refetchType: 'none',
    });

    // Invalidate search results if this might affect them
    queryClient.invalidateQueries({
      queryKey: ['search'],
      refetchType: 'none',
    });

    logger.debug('[useWebSocketQuerySync] ✅ Message queries invalidated');
  };

  /**
   * Invalidate transaction-related queries
   */
  const invalidateTransactionQueries = (data: TransactionUpdateData) => {
    // Invalidate recent transactions
    queryClient.invalidateQueries({
      queryKey: queryKeys.recentTransactions(entityId, 20),
      refetchType: 'active',
    });

    // Invalidate balance queries as transactions affect balances
    queryClient.invalidateQueries({
      queryKey: queryKeys.balancesByEntity(entityId),
      refetchType: 'active',
    });

    // Invalidate transactions
    queryClient.invalidateQueries({
      queryKey: queryKeys.recentTransactions(entityId, 50),
      refetchType: 'active',
    });

    // PROFESSIONAL FIX: Also invalidate interactions list so chat preview updates
    // When transaction status changes (PROCESSING_QUEUED -> COMPLETED), the interactions
    // list snippet should update from "Pending: 44 HTG" to "Sent 44 HTG"
    queryClient.invalidateQueries({
      queryKey: queryKeys.interactionsByEntity(entityId),
      refetchType: 'active',
    });

    logger.debug('[useWebSocketQuerySync] ✅ Transaction queries invalidated');
  };

  // Cleanup old processed message IDs periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const currentTime = Date.now();
      const oldIds = Array.from(processedMessageIds.current).filter(id => {
        // Remove IDs older than 5 minutes (adjust as needed)
        return currentTime - parseInt(id.slice(-10), 36) > 5 * 60 * 1000;
      });
      
      oldIds.forEach(id => processedMessageIds.current.delete(id));
      
      if (oldIds.length > 0) {
        logger.debug('[useWebSocketQuerySync] Cleaned up old processed message IDs');
      }
    }, 60000); // Run every minute

    return () => clearInterval(cleanupInterval);
  }, []);
};

/**
 * Utility hook for manual query invalidation
 * Useful for components that need to trigger cache updates
 */
export const useWebSocketQueryInvalidation = () => {
  const queryClient = useQueryClient();

  const invalidateBalances = (entityId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.balancesByEntity(entityId),
    });
  };

  const invalidateTransactions = (entityId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.recentTransactions(entityId, 20),
    });
  };

  const invalidateInteractions = (entityId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.interactionsByEntity(entityId),
    });
  };

  const invalidateTimeline = (interactionId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.timeline(interactionId),
    });
  };

  return {
    invalidateBalances,
    invalidateTransactions,
    invalidateInteractions,
    invalidateTimeline,
  };
};

export default useWebSocketQuerySync;