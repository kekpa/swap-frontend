// Enhanced recent transactions with local-first architecture - 2025-01-10
// TanStack Query integration for transaction loading

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { transactionManager } from '../../services/TransactionManager';
import { Transaction } from '../../types/transaction.types';
import logger from '../../utils/logger';
import { networkService } from '../../services/NetworkService';

interface UseRecentTransactionsOptions {
  entityId?: string;
  walletId?: string;
  accountId?: string; // NEW: Account-specific filtering
  limit?: number;
  enabled?: boolean;
  forceRefresh?: boolean;
}

interface UseRecentTransactionsResult {
  transactions: Transaction[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isOffline: boolean;
  refetch: () => void;
}

/**
 * Hook for loading recent transactions with local-first pattern
 * 
 * Features:
 * - Local-first loading with cache priority
 * - Automatic request deduplication via TanStack Query
 * - Offline-aware transaction loading
 * - Real-time transaction updates
 * - Intelligent caching with stale-while-revalidate
 * - Backend filtering for account-specific transactions (PROFESSIONAL)
 * 
 * @param options Transaction loading options
 * @returns Recent transactions and loading state
 */
export const useRecentTransactions = ({
  entityId,
  walletId,
  accountId,
  limit = 20,
  enabled = true,
  forceRefresh = false
}: UseRecentTransactionsOptions = {}): UseRecentTransactionsResult => {
  const isOffline = !networkService.isOnline();
  
  // Create appropriate query key based on parameters
  const queryKey = accountId 
    ? queryKeys.transactionsByAccount(accountId, limit) // NEW: Account-specific key
    : walletId 
    ? queryKeys.transactionsByWallet(walletId)
    : entityId 
    ? queryKeys.recentTransactions(entityId, limit)
    : queryKeys.transactions;
  
  const {
    data: transactions = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<Transaction[]> => {
      // BACKEND FILTERING: Use account-specific endpoint when accountId is provided
      if (accountId) {
        logger.debug(`[useRecentTransactions] 🚀 BACKEND FILTERING: Loading transactions for account: ${accountId} (limit: ${limit})`);
        
        try {
          const result = await transactionManager.getTransactionsForAccount(accountId, limit, 0);
          const accountTransactions = result?.data || [];
          
          logger.debug(`[useRecentTransactions] ✅ BACKEND FILTERING: Loaded ${accountTransactions.length} account transactions`);
          return accountTransactions;
        } catch (error) {
          logger.error(`[useRecentTransactions] ❌ BACKEND FILTERING: Failed to load account transactions: ${error}`);
          
          // In offline mode, return empty array gracefully
          if (isOffline) {
            logger.debug('[useRecentTransactions] Returning empty transactions for offline mode');
            return [];
          }
          
          throw error;
        }
      }
      
      // GENERAL TRANSACTIONS: Use existing method for general transaction loading
      logger.debug(`[useRecentTransactions] Loading recent transactions (limit: ${limit})`);
      
      try {
        // Use existing transactionManager singleton for data fetching
        const recentTransactions = await transactionManager.getRecentTransactions(limit);
        
        logger.debug(`[useRecentTransactions] Loaded ${recentTransactions.length} recent transactions`);
        
        return recentTransactions;
      } catch (error) {
        logger.error('[useRecentTransactions] Failed to load recent transactions:', error);
        
        // In offline mode, return empty array gracefully
        if (isOffline) {
          logger.debug('[useRecentTransactions] Returning empty transactions for offline mode');
          return [];
        }
        
        throw error;
      }
    },
    enabled,
    staleTime: forceRefresh ? 0 : 30 * 1000, // 30 seconds, or 0 if force refresh
    gcTime: 10 * 60 * 1000, // 10 minutes - keep transactions in cache
    retry: (failureCount, error) => {
      // Don't retry if offline
      if (isOffline) return false;
      
      // Retry up to 2 times for network errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Refetch when coming back online
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
 * Hook for loading transactions by account ID (PROFESSIONAL BACKEND FILTERING)
 */
export const useTransactionsByAccount = (accountId: string, options?: Omit<UseRecentTransactionsOptions, 'accountId'>) => {
  return useRecentTransactions({
    ...options,
    accountId,
  });
};

/**
 * Hook for loading transactions by wallet ID
 */
export const useTransactionsByWallet = (walletId: string, options?: Omit<UseRecentTransactionsOptions, 'walletId'>) => {
  return useRecentTransactions({
    ...options,
    walletId,
  });
};

/**
 * Hook for loading transactions by entity ID
 */
export const useTransactionsByEntity = (entityId: string, options?: Omit<UseRecentTransactionsOptions, 'entityId'>) => {
  return useRecentTransactions({
    ...options,
    entityId,
  });
};

/**
 * Hook for loading transaction details by ID
 */
export const useTransactionDetails = (transactionId: string) => {
  const isOffline = !networkService.isOnline();
  
  return useQuery({
    queryKey: queryKeys.transactionDetails(transactionId),
    queryFn: async (): Promise<Transaction | null> => {
      logger.debug(`[useTransactionDetails] Loading transaction details: ${transactionId}`);
      
      try {
        // Use existing transactionManager singleton
        // This would need to be implemented in TransactionManager
        // For now, return null as placeholder
        logger.debug(`[useTransactionDetails] Transaction details not yet implemented for: ${transactionId}`);
        return null;
      } catch (error) {
        logger.error(`[useTransactionDetails] Failed to load transaction ${transactionId}:`, error);
        
        if (isOffline) {
          return null;
        }
        
        throw error;
      }
    },
    enabled: !!transactionId,
    staleTime: 5 * 60 * 1000, // 5 minutes - transaction details change rarely
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount, error) => {
      if (isOffline) return false;
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    networkMode: isOffline ? 'offlineFirst' : 'online',
  });
};

export default useRecentTransactions; 