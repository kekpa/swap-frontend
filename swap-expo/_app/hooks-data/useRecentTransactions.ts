// Enhanced transaction hooks with WhatsApp-style local-first architecture - 2025-01-11
// Same pattern as useTimeline and useBalances for instant cached data display

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../tanstack-query/queryKeys';
import { queryClient } from '../tanstack-query/queryClient';
import { transactionManager } from '../services/TransactionManager';
import { transactionRepository } from '../localdb/TransactionRepository';
import { Transaction } from '../types/transaction.types';
import logger from '../utils/logger';
import { networkService } from '../services/NetworkService';

interface BaseTransactionResult {
  transactions: Transaction[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isOffline: boolean;
  refetch: () => void;
}

/**
 * WhatsApp-style fetch wallet transactions with instant cached data display
 */
const fetchWalletTransactionsWhatsAppStyle = async (accountId: string, limit: number = 4): Promise<Transaction[]> => {
  try {
    logger.debug(`[useWalletTransactions] 🚀 WHATSAPP-STYLE: Starting transaction fetch for account: ${accountId}`);
    
    // STEP 1: ALWAYS load from local cache first (INSTANT display like WhatsApp)
    const cachedTransactions = await transactionRepository.getTransactionsByAccount(accountId, limit);
    logger.debug(`[useWalletTransactions] ✅ INSTANT: Loaded ${cachedTransactions.length} transactions from SQLite cache`);
    
    // STEP 2: Return cached data IMMEDIATELY if we have it (WhatsApp behavior)
    if (cachedTransactions.length > 0) {
      logger.debug(`[useWalletTransactions] ⚡ INSTANT: Returning ${cachedTransactions.length} cached transactions immediately`);
      
      // STEP 3: Background sync (non-blocking, like WhatsApp)
      setTimeout(async () => {
        try {
          logger.debug(`[useWalletTransactions] 🔄 BACKGROUND SYNC: Fetching fresh data from API`);
          const result = await transactionManager.getTransactionsForAccount(accountId, limit, 0);
          const apiTransactions = result?.data || [];
          logger.debug(`[useWalletTransactions] ✅ BACKGROUND SYNC: Loaded ${apiTransactions.length} transactions from server`);
          
          // Save to local cache
          if (apiTransactions.length > 0) {
            await transactionRepository.saveTransactions(apiTransactions);
            logger.debug(`[useWalletTransactions] ✅ BACKGROUND SYNC: Updated ${apiTransactions.length} transactions in cache`);
            
            // Update TanStack Query cache with fresh data
            queryClient.setQueryData(queryKeys.transactionsByAccount(accountId, limit), apiTransactions);
          }
          
        } catch (error) {
          logger.debug(`[useWalletTransactions] ⚠️ BACKGROUND SYNC: Failed (non-critical):`, error instanceof Error ? error.message : String(error));
        }
      }, 150); // 150ms delay for background sync
      
      return cachedTransactions;
    }
    
    // STEP 4: No cache - fetch from API (first time only)
    logger.debug(`[useWalletTransactions] 📡 FIRST TIME: No cache found, fetching from API`);
    const result = await transactionManager.getTransactionsForAccount(accountId, limit, 0);
    const apiTransactions = result?.data || [];
    logger.debug(`[useWalletTransactions] ✅ FIRST TIME: Loaded ${apiTransactions.length} transactions from server`);
    
    // Save to cache for next time
    if (apiTransactions.length > 0) {
      await transactionRepository.saveTransactions(apiTransactions);
      logger.debug(`[useWalletTransactions] ✅ FIRST TIME: Saved ${apiTransactions.length} transactions to cache`);
    }
    
    return apiTransactions;
    
  } catch (error) {
    logger.error(`[useWalletTransactions] ❌ Error in WhatsApp-style fetch:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
};

/**
 * Hook for wallet dashboard - WhatsApp-Style Local-First
 * 
 * Shows cached transactions instantly, syncs in background.
 * Same pattern as useTimeline and useBalances.
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
      return fetchWalletTransactionsWhatsAppStyle(accountId, 4);
    },
    enabled: enabled && !!accountId,
    
    // WHATSAPP-STYLE: Optimized configuration for instant loading
    staleTime: 10 * 60 * 1000, // 10 minutes - longer staleness for better UX
    gcTime: 60 * 60 * 1000, // 1 hour - keep in cache much longer
    
    // LOCAL-FIRST: Prefer cached data over network
    networkMode: 'offlineFirst',
    
    // PERFORMANCE: Reduce unnecessary refetches
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: false, // Don't refetch if we have cached data
    
    // RELIABILITY: Conservative retry strategy
    retry: (failureCount, error: any) => {
      if (!accountId) return false;
      if (isOffline) return false;
      if (error?.status >= 400 && error?.status < 500) return false;
      return failureCount < 1;
    },
    
    // UX: Use placeholder data for smoother transitions
    placeholderData: (previousData: any) => previousData,
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