// Enhanced transaction hooks with purpose-built architecture - 2025-01-11
// Each hook serves a specific use case with clear responsibilities

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { transactionManager } from '../../services/TransactionManager';
import { Transaction } from '../../types/transaction.types';
import logger from '../../utils/logger';
import { networkService } from '../../services/NetworkService';

interface BaseTransactionResult {
  transactions: Transaction[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isOffline: boolean;
  refetch: () => void;
}

/**
 * Hook for wallet dashboard - Shows 4 recent transactions for selected account
 * 
 * Purpose: Wallet dashboard preview (4 transactions max)
 * Endpoint: GET /api/v1/transactions/account/{accountId}?limit=4
 * Backend Filtering: ✅ Account-specific
 * Frontend Filtering: ❌ None needed
 */
export const useWalletTransactions = (accountId: string, enabled: boolean = true): BaseTransactionResult => {
  const isOffline = !networkService.isOnline();
  
  const {
    data: transactions = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.transactionsByAccount(accountId, 4),
    queryFn: async (): Promise<Transaction[]> => {
      if (!accountId) {
        logger.debug('[useWalletTransactions] No accountId provided');
        return [];
      }

      logger.debug(`[useWalletTransactions] 🎯 WALLET: Loading 4 transactions for account: ${accountId}`);
      
      try {
        const result = await transactionManager.getTransactionsForAccount(accountId, 4, 0);
        const accountTransactions = result?.data || [];
        
        logger.debug(`[useWalletTransactions] ✅ WALLET: Loaded ${accountTransactions.length} transactions`);
        return accountTransactions;
      } catch (error) {
        logger.error(`[useWalletTransactions] ❌ WALLET: Failed to load transactions: ${error}`);
        
        if (isOffline) {
          return [];
        }
        
        throw error;
      }
    },
    enabled: enabled && !!accountId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount) => !isOffline && failureCount < 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    networkMode: isOffline ? 'offlineFirst' : 'online',
  });
  
  return {
    transactions,
    isLoading,
    isError,
    error: error as Error | null,
    isOffline,
    refetch,
  };
};

/**
 * Hook for transaction list page - Shows 50 transactions with pagination
 * 
 * Purpose: Full transaction list with pagination
 * Endpoint: GET /api/v1/transactions/account/{accountId}?limit=50&offset={offset}
 * Backend Filtering: ✅ Account-specific with pagination
 * Frontend Filtering: ❌ None needed
 */
export const useTransactionList = (
  accountId: string, 
  limit: number = 50, 
  offset: number = 0,
  enabled: boolean = true
): BaseTransactionResult & { hasMore: boolean; loadMore: () => void } => {
  const isOffline = !networkService.isOnline();
  
  const {
    data: result,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
         queryKey: [...queryKeys.transactionsByAccount(accountId, limit), 'offset', offset] as const,
    queryFn: async (): Promise<{ data: Transaction[]; hasMore: boolean }> => {
      if (!accountId) {
        logger.debug('[useTransactionList] No accountId provided');
        return { data: [], hasMore: false };
      }

      logger.debug(`[useTransactionList] 📋 LIST: Loading ${limit} transactions for account: ${accountId} (offset: ${offset})`);
      
      try {
        const result = await transactionManager.getTransactionsForAccount(accountId, limit, offset);
        const transactions = result?.data || [];
        const pagination = result?.pagination;
        
        const hasMore = pagination ? pagination.hasMore : transactions.length === limit;
        
        logger.debug(`[useTransactionList] ✅ LIST: Loaded ${transactions.length} transactions (hasMore: ${hasMore})`);
        return { data: transactions, hasMore };
      } catch (error) {
        logger.error(`[useTransactionList] ❌ LIST: Failed to load transactions: ${error}`);
        
        if (isOffline) {
          return { data: [], hasMore: false };
        }
        
        throw error;
      }
    },
    enabled: enabled && !!accountId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount) => !isOffline && failureCount < 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    networkMode: isOffline ? 'offlineFirst' : 'online',
  });
  
  const loadMore = () => {
    // TODO: Implement pagination logic
    logger.debug('[useTransactionList] Load more requested');
  };
  
  return {
    transactions: result?.data || [],
    hasMore: result?.hasMore || false,
    isLoading,
    isError,
    error: error as Error | null,
    isOffline,
    refetch,
    loadMore,
  };
};

/**
 * Hook for general recent transactions (fallback/legacy support)
 * 
 * Purpose: General recent transactions (not account-specific)
 * Endpoint: GET /api/v1/transactions?limit={limit}
 * Backend Filtering: ❌ General transactions
 * Frontend Filtering: ⚠️ May be needed for specific use cases
 */
export const useRecentTransactions = (
  entityId: string,
  limit: number = 20,
  enabled: boolean = true
): BaseTransactionResult => {
  const isOffline = !networkService.isOnline();
  
  const {
    data: transactions = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.recentTransactions(entityId, limit),
    queryFn: async (): Promise<Transaction[]> => {
      logger.debug(`[useRecentTransactions] 📊 GENERAL: Loading ${limit} recent transactions`);
      
      try {
        const recentTransactions = await transactionManager.getRecentTransactions(limit);
        
        logger.debug(`[useRecentTransactions] ✅ GENERAL: Loaded ${recentTransactions.length} transactions`);
        return recentTransactions;
      } catch (error) {
        logger.error('[useRecentTransactions] ❌ GENERAL: Failed to load transactions:', error);
        
        if (isOffline) {
          return [];
        }
        
        throw error;
      }
    },
    enabled: enabled && !!entityId,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount) => !isOffline && failureCount < 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    networkMode: isOffline ? 'offlineFirst' : 'online',
  });
  
  return {
    transactions,
    isLoading,
    isError,
    error: error as Error | null,
    isOffline,
    refetch,
  };
};

// DEPRECATED: Legacy hooks for backward compatibility
export const useTransactionsByAccount = (accountId: string, options?: { limit?: number; enabled?: boolean }) => {
  logger.warn('[useTransactionsByAccount] DEPRECATED: Use useWalletTransactions or useTransactionList instead');
  return useWalletTransactions(accountId, options?.enabled);
};

export default useRecentTransactions; 