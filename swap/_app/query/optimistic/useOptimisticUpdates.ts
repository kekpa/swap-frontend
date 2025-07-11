/**
 * useOptimisticUpdates Hook
 * 
 * Centralized optimistic update patterns for common operations.
 * Provides consistent optimistic update strategies across the app.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { logger } from '../../utils/logger';
import { queryKeys } from '../queryKeys';
import { WalletBalance } from '../../types/wallet.types';
import { Message } from '../../types/message.types';

interface OptimisticContext {
  queryKey: unknown[];
  previousData: unknown;
  optimisticData: unknown;
  timestamp: number;
}

export const useOptimisticUpdates = () => {
  const queryClient = useQueryClient();

  // Store optimistic contexts for rollback
  const optimisticContexts = new Map<string, OptimisticContext>();

  // Generate unique context ID
  const generateContextId = () => `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Generic optimistic update function
  const applyOptimisticUpdate = useCallback(<T>(
    queryKey: unknown[],
    updater: (oldData: T | undefined) => T,
    contextId?: string
  ): string => {
    const id = contextId || generateContextId();
    
    logger.debug('[useOptimisticUpdates] Applying optimistic update:', {
      queryKey,
      contextId: id,
    });

    // Store previous data for potential rollback
    const previousData = queryClient.getQueryData(queryKey);
    
    // Apply optimistic update
    queryClient.setQueryData(queryKey, updater);
    
    // Store context for rollback
    optimisticContexts.set(id, {
      queryKey,
      previousData,
      optimisticData: queryClient.getQueryData(queryKey),
      timestamp: Date.now(),
    });

    return id;
  }, [queryClient]);

  // Rollback optimistic update
  const rollbackOptimisticUpdate = useCallback((contextId: string) => {
    const context = optimisticContexts.get(contextId);
    if (!context) {
      logger.warn('[useOptimisticUpdates] Context not found for rollback:', contextId);
      return;
    }

    logger.debug('[useOptimisticUpdates] Rolling back optimistic update:', {
      queryKey: context.queryKey,
      contextId,
    });

    // Restore previous data
    queryClient.setQueryData(context.queryKey, context.previousData);
    
    // Clean up context
    optimisticContexts.delete(contextId);
  }, [queryClient]);

  // Confirm optimistic update (clean up context)
  const confirmOptimisticUpdate = useCallback((contextId: string) => {
    const context = optimisticContexts.get(contextId);
    if (context) {
      logger.debug('[useOptimisticUpdates] Confirming optimistic update:', {
        queryKey: context.queryKey,
        contextId,
      });
      optimisticContexts.delete(contextId);
    }
  }, []);

  // Balance-specific optimistic updates
  const optimisticBalanceUpdate = useCallback((
    entityId: string,
    walletId: string,
    amountChange: number,
    transactionType: 'debit' | 'credit' = 'debit'
  ): string => {
    return applyOptimisticUpdate<WalletBalance[]>(
      queryKeys.balancesByEntity(entityId),
      (oldBalances) => {
        if (!oldBalances) return oldBalances;

        return oldBalances.map(balance => {
          if (balance.wallet_id === walletId) {
            const newAvailableBalance = transactionType === 'debit' 
              ? balance.available_balance - amountChange
              : balance.available_balance + amountChange;
            
            return {
              ...balance,
              available_balance: Math.max(0, newAvailableBalance), // Prevent negative balance
              balance_last_updated: new Date().toISOString(),
            };
          }
          return balance;
        });
      }
    );
  }, [applyOptimisticUpdate]);

  // Message-specific optimistic updates
  const optimisticMessageUpdate = useCallback((
    interactionId: string,
    newMessage: Omit<Message, 'id'> & { tempId: string }
  ): string => {
    return applyOptimisticUpdate<Message[]>(
      queryKeys.timeline(interactionId),
      (oldMessages) => {
        if (!oldMessages) return [{ ...newMessage, id: newMessage.tempId }];

        // Add new message with temporary ID
        const optimisticMessage: Message = {
          ...newMessage,
          id: newMessage.tempId,
          status: 'sending',
        };

        return [...oldMessages, optimisticMessage].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      }
    );
  }, [applyOptimisticUpdate]);

  // Transaction-specific optimistic updates
  const optimisticTransactionUpdate = useCallback((
    entityId: string,
    newTransaction: any
  ): string => {
    return applyOptimisticUpdate(
      queryKeys.recentTransactions(entityId, 20),
      (oldTransactions: any[] | undefined) => {
        if (!oldTransactions) return [newTransaction];

        const optimisticTransaction = {
          ...newTransaction,
          id: `temp_${Date.now()}`,
          status: 'pending',
          created_at: new Date().toISOString(),
        };

        return [optimisticTransaction, ...oldTransactions].slice(0, 20);
      }
    );
  }, [applyOptimisticUpdate]);

  // Interaction list optimistic updates
  const optimisticInteractionUpdate = useCallback((
    entityId: string,
    interactionId: string,
    lastMessage: string,
    incrementUnread: boolean = false
  ): string => {
    return applyOptimisticUpdate(
      queryKeys.interactionsByEntity(entityId),
      (oldInteractions: any[] | undefined) => {
        if (!oldInteractions) return oldInteractions;

        return oldInteractions.map(interaction => {
          if (interaction.id === interactionId) {
            return {
              ...interaction,
              last_message: lastMessage,
              last_message_timestamp: new Date().toISOString(),
              unread_count: incrementUnread 
                ? (interaction.unread_count || 0) + 1 
                : interaction.unread_count,
            };
          }
          return interaction;
        });
      }
    );
  }, [applyOptimisticUpdate]);

  // Profile update optimistic updates
  const optimisticProfileUpdate = useCallback((
    entityId: string,
    updates: Partial<any>
  ): string => {
    return applyOptimisticUpdate(
      queryKeys.userProfile(entityId),
      (oldProfile: any | undefined) => {
        if (!oldProfile) return oldProfile;

        return {
          ...oldProfile,
          ...updates,
          lastUpdated: new Date().toISOString(),
          isUpdating: true, // Flag to show loading state
        };
      }
    );
  }, [applyOptimisticUpdate]);

  // Batch optimistic updates for complex operations
  const batchOptimisticUpdates = useCallback((
    updates: Array<{
      queryKey: unknown[];
      updater: (oldData: any) => any;
    }>
  ): string[] => {
    const contextIds: string[] = [];

    updates.forEach(({ queryKey, updater }) => {
      const contextId = applyOptimisticUpdate(queryKey, updater);
      contextIds.push(contextId);
    });

    logger.debug('[useOptimisticUpdates] Applied batch optimistic updates:', {
      count: updates.length,
      contextIds,
    });

    return contextIds;
  }, [applyOptimisticUpdate]);

  // Rollback batch updates
  const rollbackBatchUpdates = useCallback((contextIds: string[]) => {
    contextIds.forEach(contextId => rollbackOptimisticUpdate(contextId));
    
    logger.debug('[useOptimisticUpdates] Rolled back batch optimistic updates:', {
      count: contextIds.length,
      contextIds,
    });
  }, [rollbackOptimisticUpdate]);

  // Replace optimistic data with real data
  const replaceOptimisticData = useCallback(<T>(
    queryKey: unknown[],
    realData: T,
    contextId?: string
  ) => {
    logger.debug('[useOptimisticUpdates] Replacing optimistic data with real data:', {
      queryKey,
      contextId,
    });

    queryClient.setQueryData(queryKey, realData);
    
    if (contextId) {
      confirmOptimisticUpdate(contextId);
    }
  }, [queryClient, confirmOptimisticUpdate]);

  // Clean up old optimistic contexts (prevent memory leaks)
  const cleanupOldContexts = useCallback((maxAge: number = 5 * 60 * 1000) => {
    const now = Date.now();
    const expiredContexts: string[] = [];

    for (const [contextId, context] of optimisticContexts.entries()) {
      if (now - context.timestamp > maxAge) {
        expiredContexts.push(contextId);
      }
    }

    expiredContexts.forEach(contextId => {
      logger.debug('[useOptimisticUpdates] Cleaning up expired optimistic context:', contextId);
      optimisticContexts.delete(contextId);
    });

    if (expiredContexts.length > 0) {
      logger.debug('[useOptimisticUpdates] Cleaned up expired optimistic contexts:', {
        count: expiredContexts.length,
      });
    }
  }, []);

  // Get optimistic update status
  const getOptimisticStatus = useCallback(() => {
    return {
      activeContexts: optimisticContexts.size,
      contexts: Array.from(optimisticContexts.entries()).map(([id, context]) => ({
        id,
        queryKey: context.queryKey,
        age: Date.now() - context.timestamp,
      })),
    };
  }, []);

  return {
    // Generic functions
    applyOptimisticUpdate,
    rollbackOptimisticUpdate,
    confirmOptimisticUpdate,
    replaceOptimisticData,
    
    // Specific update patterns
    optimisticBalanceUpdate,
    optimisticMessageUpdate,
    optimisticTransactionUpdate,
    optimisticInteractionUpdate,
    optimisticProfileUpdate,
    
    // Batch operations
    batchOptimisticUpdates,
    rollbackBatchUpdates,
    
    // Utility functions
    cleanupOldContexts,
    getOptimisticStatus,
  };
};

/**
 * Higher-order component for optimistic mutations
 */
export const withOptimisticUpdate = <TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  optimisticUpdateFn: (variables: TVariables) => {
    queryKey: unknown[];
    updater: (oldData: any) => any;
  }
) => {
  return async (variables: TVariables): Promise<TData> => {
    // This would be used with useMutation
    // The optimistic update logic would be handled in the mutation options
    return mutationFn(variables);
  };
};

export default useOptimisticUpdates;