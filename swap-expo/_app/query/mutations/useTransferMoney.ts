/**
 * useTransferMoney Hook
 * 
 * TanStack Query mutation hook for money transfers with optimistic updates.
 * Implements best practices for financial transactions with proper error handling.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '../../utils/logger';
import { queryKeys } from '../queryKeys';
import { WalletBalance } from '../../types/wallet.types';
import { networkService } from '../../services/NetworkService';

// Transfer request interface
export interface TransferRequest {
  fromWalletId: string;
  toEntityId: string;
  amount: number;
  currencyCode: string;
  description?: string;
  reference?: string;
}

// Transfer response interface
export interface TransferResponse {
  transactionId: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  estimatedCompletion?: string;
}

/**
 * Mock transfer function - replace with actual API call
 */
const transferMoneyAPI = async (request: TransferRequest): Promise<TransferResponse> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate occasional failures for testing
  if (Math.random() < 0.1) {
    throw new Error('Transfer failed due to insufficient funds');
  }
  
  return {
    transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    status: 'pending',
    timestamp: new Date().toISOString(),
    estimatedCompletion: new Date(Date.now() + 60000).toISOString(), // 1 minute
  };
};

/**
 * useTransferMoney Hook
 * 
 * Provides money transfer functionality with optimistic updates and proper error handling.
 */
export const useTransferMoney = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transferMoneyAPI,
    
    // Optimistic update - update balance immediately for better UX
    onMutate: async (request: TransferRequest) => {
      logger.debug('[useTransferMoney] 🔄 Starting optimistic update for transfer:', {
        amount: request.amount,
        currency: request.currencyCode,
        fromWallet: request.fromWalletId,
      });

      // Cancel any outgoing refetches for balances to avoid conflicts
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.balances() 
      });

      // Get the current entity ID (assuming it's stored somewhere accessible)
      // In a real app, this would come from auth context or user store
      const entityId = 'current_user_entity_id'; // Replace with actual entity ID

      // Snapshot the previous balance data for potential rollback
      const previousBalances = queryClient.getQueryData<WalletBalance[]>(
        queryKeys.balancesByEntity(entityId)
      );

      // Optimistically update the balance
      if (previousBalances) {
        const updatedBalances = previousBalances.map(balance => {
          if (balance.wallet_id === request.fromWalletId) {
            return {
              ...balance,
              available_balance: balance.available_balance - request.amount,
              balance_last_updated: new Date().toISOString(),
            };
          }
          return balance;
        });

        queryClient.setQueryData(
          queryKeys.balancesByEntity(entityId),
          updatedBalances
        );

        logger.debug('[useTransferMoney] ✅ Optimistic balance update applied');
      }

      // Return context for potential rollback
      return { previousBalances, entityId, request };
    },

    // Handle successful transfer
    onSuccess: (data, variables, context) => {
      logger.info('[useTransferMoney] ✅ Transfer successful:', {
        transactionId: data.transactionId,
        status: data.status,
        amount: variables.amount,
        currency: variables.currencyCode,
      });

      // Invalidate related queries to fetch fresh data
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.balances() 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.transactions() 
      });

      // Show success notification (if notification system exists)
      // showSuccessNotification(`Transfer of ${variables.amount} ${variables.currencyCode} initiated successfully`);
    },

    // Handle transfer failure - rollback optimistic update
    onError: (error, variables, context) => {
      logger.error('[useTransferMoney] ❌ Transfer failed:', {
        error: error.message,
        amount: variables.amount,
        currency: variables.currencyCode,
        fromWallet: variables.fromWalletId,
      });

      // Rollback optimistic update if we have previous data
      if (context?.previousBalances && context?.entityId) {
        queryClient.setQueryData(
          queryKeys.balancesByEntity(context.entityId),
          context.previousBalances
        );
        
        logger.debug('[useTransferMoney] 🔄 Optimistic update rolled back');
      }

      // Show error notification (if notification system exists)
      // showErrorNotification(`Transfer failed: ${error.message}`);
    },

    // Always run after success or error
    onSettled: (data, error, variables, context) => {
      logger.debug('[useTransferMoney] 🏁 Transfer operation settled:', {
        success: !error,
        transactionId: data?.transactionId,
        error: error?.message,
      });

      // Always refetch balances to ensure consistency
      // This is a safety net in case optimistic updates were incorrect
      if (context?.entityId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.balancesByEntity(context.entityId),
          refetchType: 'active',
        });
      }
    },

    // Network mode - only allow transfers when online
    networkMode: 'online',
    
    // Retry configuration for transfers
    retry: (failureCount, error: any) => {
      // Don't retry on client errors (insufficient funds, invalid data, etc.)
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
 * Utility hook for offline transfer queue
 * This would be used to queue transfers when offline and process them when online
 */
export const useOfflineTransferQueue = () => {
  // This would implement offline queueing logic
  // For now, just return empty functions
  return {
    queueTransfer: (request: TransferRequest) => {
      logger.info('[useOfflineTransferQueue] 📱 Transfer queued for when online:', request);
      // Implementation would save to AsyncStorage or SQLite
    },
    processQueue: () => {
      logger.info('[useOfflineTransferQueue] 🔄 Processing offline transfer queue');
      // Implementation would process queued transfers
    },
    getQueueSize: () => 0,
  };
};

export default useTransferMoney;