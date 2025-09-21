// Optimistic send money hook with Revolut-style instant UI updates - 2025-01-25
// Provides instant feedback with rollback on failure for professional user experience

import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../tanstack-query/queryKeys';
import { transactionManager } from '../services/TransactionManager';
import { transactionRepository } from '../localdb/TransactionRepository';
import { offlineTransactionQueue } from '../services/OfflineTransactionQueue';
import { CreateDirectTransactionDto, Transaction } from '../types/transaction.types';
import { WalletBalance } from '../types/wallet.types';
import logger from '../utils/logger';
import { networkService } from '../services/NetworkService';

interface SendMoneyContext {
  previousTransactions: Transaction[] | undefined;
  previousBalances: WalletBalance[] | undefined;
  optimisticTransaction: Transaction;
  senderAccountId: string;
  recipientEntityId: string;
}

interface SendMoneyVariables extends CreateDirectTransactionDto {
  senderAccountId: string;
  senderEntityId: string;
  recipientName: string;
  recipientInitials: string;
}

/**
 * Revolut-style send money mutation with instant optimistic updates
 * 
 * Features:
 * - Instant UI feedback (transaction appears immediately)
 * - Balance updates instantly
 * - Rollback on failure
 * - Offline queue support
 * - Professional error handling
 */
export const useSendMoney = () => {
  const queryClient = useQueryClient();
  const isOffline = !networkService.isOnline();

  return useMutation<Transaction, Error, SendMoneyVariables, SendMoneyContext>({
    mutationFn: async (variables: SendMoneyVariables): Promise<Transaction> => {
      logger.debug('[useSendMoney] 🚀 OPTIMISTIC: Starting send money transaction', {
        amount: variables.amount,
        recipient: variables.recipient_id,
        offline: isOffline
      });

      if (isOffline) {
        // In offline mode, queue the transaction
        logger.info('[useSendMoney] 📱 OFFLINE: Queueing transaction for later sync');
        const queueId = await offlineTransactionQueue.queueTransaction(variables);
        throw new Error(`Transaction queued for offline sync (ID: ${queueId})`);
      }

      // Execute the actual API call
      const result = await transactionManager.createDirectTransaction(variables);
      logger.debug('[useSendMoney] ✅ OPTIMISTIC: Transaction API call succeeded');
      
      return result;
    },

    onMutate: async (variables: SendMoneyVariables): Promise<SendMoneyContext> => {
      logger.debug('[useSendMoney] ⚡ OPTIMISTIC: Applying instant UI updates');

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.transactionsByAccount(variables.senderAccountId, 4) });
      await queryClient.cancelQueries({ queryKey: queryKeys.balances(variables.senderEntityId) });

      // Get previous data for rollback
      const previousTransactions = queryClient.getQueryData<Transaction[]>(
        queryKeys.transactionsByAccount(variables.senderAccountId, 4)
      );
      const previousBalances = queryClient.getQueryData<WalletBalance[]>(
        queryKeys.balances(variables.senderEntityId)
      );

      // Create optimistic transaction
      const optimisticTransaction: Transaction = {
        id: `optimistic-${Date.now()}`,
        amount: variables.amount.toString(),
        currency_id: variables.currency_id,
        currency_symbol: '$', // TODO: Get from sender account
        description: variables.description || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        from_entity_id: variables.senderEntityId,
        to_entity_id: variables.recipient_id,
        status: 'pending',
        type: 'transfer',
        transaction_hash: null,
        metadata: {
          ...variables.metadata,
          optimistic: true,
          recipientName: variables.recipientName,
          recipientInitials: variables.recipientInitials,
        },
      };

      // 1. INSTANT: Add optimistic transaction to the list
      if (previousTransactions) {
        const optimisticTransactions = [optimisticTransaction, ...previousTransactions];
        queryClient.setQueryData(
          queryKeys.transactionsByAccount(variables.senderAccountId, 4),
          optimisticTransactions
        );
        logger.debug('[useSendMoney] ✅ OPTIMISTIC: Added transaction to UI list');
      }

      // 2. INSTANT: Update sender balance optimistically
      if (previousBalances) {
        const optimisticBalances = previousBalances.map(wallet => {
          if (wallet.wallet_id === variables.senderAccountId) {
            const newBalance = wallet.balance - variables.amount;
            const newAvailableBalance = wallet.available_balance - variables.amount;
            return {
              ...wallet,
              balance: Math.max(0, newBalance),
              available_balance: Math.max(0, newAvailableBalance),
              reserved_balance: wallet.reserved_balance + variables.amount, // Show as reserved until confirmed
            };
          }
          return wallet;
        });

        queryClient.setQueryData(
          queryKeys.balances(variables.senderEntityId),
          optimisticBalances
        );
        logger.debug('[useSendMoney] ✅ OPTIMISTIC: Updated sender balance');
      }

      // 3. INSTANT: Save optimistic transaction to local cache
      try {
        await transactionRepository.saveTransaction(optimisticTransaction);
        logger.debug('[useSendMoney] ✅ OPTIMISTIC: Saved to local SQLite cache');
      } catch (error) {
        logger.warn('[useSendMoney] ⚠️ OPTIMISTIC: Failed to save to local cache:', error);
      }

      return {
        previousTransactions,
        previousBalances,
        optimisticTransaction,
        senderAccountId: variables.senderAccountId,
        recipientEntityId: variables.recipient_id,
      };
    },

    onSuccess: async (data: Transaction, variables: SendMoneyVariables, context: SendMoneyContext) => {
      logger.debug('[useSendMoney] 🎉 SUCCESS: Transaction confirmed by server');

      // Replace optimistic transaction with real one
      const currentTransactions = queryClient.getQueryData<Transaction[]>(
        queryKeys.transactionsByAccount(variables.senderAccountId, 4)
      );

      if (currentTransactions) {
        const updatedTransactions = currentTransactions.map(tx => 
          tx.id === context.optimisticTransaction.id ? data : tx
        );
        
        queryClient.setQueryData(
          queryKeys.transactionsByAccount(variables.senderAccountId, 4),
          updatedTransactions
        );
      }

      // Update local cache with confirmed transaction
      try {
        await transactionRepository.removeTransaction(context.optimisticTransaction.id);
        await transactionRepository.saveTransaction(data);
        logger.debug('[useSendMoney] ✅ SUCCESS: Updated local cache with confirmed transaction');
      } catch (error) {
        logger.warn('[useSendMoney] ⚠️ SUCCESS: Failed to update local cache:', error);
      }

      // Refresh balances to get accurate server state
      queryClient.invalidateQueries({ queryKey: queryKeys.balances(variables.senderEntityId) });
      
      logger.info(`[useSendMoney] 💸 COMPLETED: Sent ${variables.amount} to ${variables.recipientName}`);
    },

    onError: (error: Error, variables: SendMoneyVariables, context: SendMoneyContext | undefined) => {
      logger.error('[useSendMoney] ❌ ERROR: Transaction failed, rolling back optimistic updates');

      if (!context) {
        logger.warn('[useSendMoney] ⚠️ ERROR: No context for rollback');
        return;
      }

      // Rollback transactions list
      if (context.previousTransactions !== undefined) {
        queryClient.setQueryData(
          queryKeys.transactionsByAccount(variables.senderAccountId, 4),
          context.previousTransactions
        );
        logger.debug('[useSendMoney] ↩️ ROLLBACK: Restored transaction list');
      }

      // Rollback balances
      if (context.previousBalances !== undefined) {
        queryClient.setQueryData(
          queryKeys.balances(variables.senderEntityId),
          context.previousBalances
        );
        logger.debug('[useSendMoney] ↩️ ROLLBACK: Restored balances');
      }

      // Remove optimistic transaction from local cache
      transactionRepository.removeTransaction(context.optimisticTransaction.id).catch(err => {
        logger.warn('[useSendMoney] ⚠️ ROLLBACK: Failed to remove optimistic transaction from cache:', err);
      });

      logger.warn(`[useSendMoney] 💔 FAILED: Transaction to ${variables.recipientName} failed:`, error.message);
    },

    onSettled: (data, error, variables) => {
      // Always invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.transactionsByAccount(variables.senderAccountId, 4) });
      queryClient.invalidateQueries({ queryKey: queryKeys.balances(variables.senderEntityId) });
      
      logger.debug('[useSendMoney] 🔄 SETTLED: Refreshed all related queries');
    },

    // Configuration for optimal UX
    retry: (failureCount, error: any) => {
      // Don't retry validation errors (4xx)
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      
      // Retry network errors up to 2 times
      return failureCount < 2;
    },

    // Network mode configuration
    networkMode: isOffline ? 'offlineFirst' : 'online',
  });
};

/**
 * Hook for offline transaction queue
 * Shows pending transactions that will be sent when online
 */
export const useOfflineTransactionQueue = () => {
  const [queuedTransactions, setQueuedTransactions] = React.useState(offlineTransactionQueue.getQueue());
  const [stats, setStats] = React.useState(offlineTransactionQueue.getQueueStats());

  React.useEffect(() => {
    // Subscribe to queue changes
    const unsubscribe = offlineTransactionQueue.onQueueChange((queue) => {
      setQueuedTransactions(queue);
      setStats(offlineTransactionQueue.getQueueStats());
    });

    // Initial load
    setQueuedTransactions(offlineTransactionQueue.getQueue());
    setStats(offlineTransactionQueue.getQueueStats());

    return unsubscribe;
  }, []);

  const retryQueue = React.useCallback(() => {
    offlineTransactionQueue.processQueue();
  }, []);

  const retryFailedTransactions = React.useCallback(() => {
    offlineTransactionQueue.retryFailedTransactions();
  }, []);

  const clearQueue = React.useCallback(() => {
    offlineTransactionQueue.clearQueue();
  }, []);

  const clearFailedTransactions = React.useCallback(() => {
    offlineTransactionQueue.clearFailedTransactions();
  }, []);

  const removeTransaction = React.useCallback((id: string) => {
    offlineTransactionQueue.removeTransaction(id);
  }, []);

  return {
    queuedTransactions,
    stats,
    retryQueue,
    retryFailedTransactions,
    clearQueue,
    clearFailedTransactions,
    removeTransaction,
    isOnline: networkService.isOnline(),
  };
};

export default useSendMoney;