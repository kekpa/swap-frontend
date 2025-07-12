/**
 * useBalances Hook
 * 
 * TanStack Query hook for wallet balances with local-first architecture.
 * Uses direct API calls and SQLite repositories for optimal caching.
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { logger } from '../../utils/logger';
import { queryKeys } from '../queryKeys';
import { balanceApi } from '../../_api/balanceApi';
import { currencyWalletsRepository, CurrencyWallet } from '../../localdb/CurrencyWalletsRepository';
import { WalletBalance } from '../../types/wallet.types';
import { networkService } from '../../services/NetworkService';
import apiClient from '../../_api/apiClient';

/**
 * Fetch balances with local-first pattern
 */
const fetchBalancesLocalFirst = async (entityId: string): Promise<WalletBalance[]> => {
  logger.debug(`[${entityId}] [useBalances] Starting local-first balance fetch for entity:`);
  
  try {
    // Step 1: Load from local cache immediately
    const cachedBalances = await currencyWalletsRepository.getAllCurrencyWallets();
    logger.debug(`[useBalances] ✅ INSTANT: Loaded ${cachedBalances.length} balances from cache`);
    
    // Step 2: Convert cached data to WalletBalance format
    const cachedWalletBalances: WalletBalance[] = cachedBalances.map((wallet: CurrencyWallet) => ({
      wallet_id: wallet.id,
      account_id: wallet.account_id,
      entity_id: entityId,
      currency_id: wallet.currency_id,
      currency_code: wallet.currency_code,
      currency_symbol: wallet.currency_symbol,
      currency_name: wallet.currency_name,
      balance: wallet.balance,
      reserved_balance: wallet.reserved_balance,
      available_balance: wallet.available_balance,
      balance_last_updated: wallet.balance_last_updated || null,
      is_active: wallet.is_active,
      isPrimary: wallet.is_primary,
    }));
    
    // Step 3: Always fetch from API to ensure data consistency
    logger.debug(`[useBalances] 🔄 Fetching fresh data from API for consistency check`);
    
    if (await networkService.isOnline()) {
      try {
        const apiBalances = await balanceApi.fetchBalances(entityId);
        logger.debug(`[useBalances] ✅ API: Loaded ${apiBalances.length} balances from server`);
        
        // Debug: Compare primary wallet between cache and API
        const cachedPrimary = cachedWalletBalances.find(w => w.isPrimary);
        const apiPrimary = apiBalances.find(w => w.isPrimary);
        
        if (cachedPrimary?.wallet_id !== apiPrimary?.wallet_id) {
          logger.warn(`[useBalances] 🔄 PRIMARY WALLET MISMATCH DETECTED:`);
          logger.warn(`[useBalances] 🔄 Cache primary: ${cachedPrimary?.currency_code} (${cachedPrimary?.wallet_id})`);
          logger.warn(`[useBalances] 🔄 API primary: ${apiPrimary?.currency_code} (${apiPrimary?.wallet_id})`);
          logger.warn(`[useBalances] 🔄 Using API data as source of truth`);
        }
        
        // Convert API format to repository format and save to local cache
        const repositoryBalances: CurrencyWallet[] = apiBalances.map(balance => ({
          id: balance.wallet_id,
          account_id: balance.account_id,
          currency_id: balance.currency_id,
          currency_code: balance.currency_code,
          currency_symbol: balance.currency_symbol,
          currency_name: balance.currency_name,
          balance: balance.balance,
          reserved_balance: balance.reserved_balance,
          available_balance: balance.available_balance,
          balance_last_updated: balance.balance_last_updated || undefined,
          is_active: balance.is_active,
          is_primary: balance.isPrimary ?? false,
        }));
        
        // Save to local cache
        await currencyWalletsRepository.saveCurrencyWallets(repositoryBalances);
        logger.debug(`[useBalances] ✅ SYNC: Saved ${repositoryBalances.length} balances to local cache`);
        
        // Return API data as source of truth
        return apiBalances;
        
      } catch (apiError) {
        logger.warn(`[useBalances] ⚠️ API fetch failed, using cached data:`, apiError instanceof Error ? apiError.message : String(apiError));
        return cachedWalletBalances;
      }
    } else {
      logger.debug(`[useBalances] 📱 OFFLINE: Using cached data`);
      return cachedWalletBalances;
    }
    
  } catch (error) {
    logger.error(`[useBalances] ❌ Error in local-first fetch:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
};

/**
 * useBalances Hook
 * 
 * Provides wallet balances with local-first loading pattern.
 * Shows cached data immediately, refreshes in background.
 */
export const useBalances = (entityId: string) => {
  return useQuery({
    queryKey: queryKeys.balancesByEntity(entityId),
    queryFn: () => fetchBalancesLocalFirst(entityId),
    
    // Only run query if entityId is provided
    enabled: !!entityId && entityId.length > 0,
    
    // True local-first configuration
    staleTime: 5 * 60 * 1000, // 5 minutes - balance data can be slightly stale
    gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in memory longer for offline use
    
    // Network behavior optimized for local-first
    networkMode: 'offlineFirst', // Always show cached data first
    refetchOnWindowFocus: false, // Don't refetch on focus (mobile optimization)
    refetchOnReconnect: true,    // Refetch when network reconnects
    refetchOnMount: true,        // Check for updates on mount, but don't block
    
    // Background updates without blocking UI
    refetchInterval: 10 * 60 * 1000, // Background refresh every 10 minutes when active
    refetchIntervalInBackground: false, // Don't refetch when app is backgrounded
    
    // Error handling optimized for offline scenarios
    retry: (failureCount, error: any) => {
      // Don't retry if no entityId
      if (!entityId || entityId.length === 0) {
        logger.debug('[useBalances] Skipping retry - no entityId provided');
        return false;
      }
      
      // Don't retry if offline
      if (!networkService.isOnline) {
        return false;
      }
      
      // Don't retry on client errors (4xx)
      if (error?.status >= 400 && error?.status < 500) {
        logger.error(`[useBalances] Client error ${error.status}, not retrying`);
        return false;
      }
      
      // Conservative retry for financial data
      return failureCount < 1;
    },
    
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    
    // Advanced local-first options
    structuralSharing: true, // Optimize re-renders by sharing unchanged data
  });
};

/**
 * useRefreshBalances Hook
 * 
 * Provides a function to manually refresh balances
 */
export const useRefreshBalances = (entityId: string) => {
  const queryClient = useQueryClient();
  
  const refreshBalances = async () => {
    logger.debug('[useRefreshBalances] 🔄 Manual refresh triggered');
    
    try {
      // Force refetch by invalidating cache and triggering immediate refetch
      await queryClient.invalidateQueries({
        queryKey: queryKeys.balancesByEntity(entityId),
        refetchType: 'active', // Immediately refetch active queries
      });
      
      logger.debug('[useRefreshBalances] ✅ Manual refresh completed');
    } catch (error) {
      logger.error('[useRefreshBalances] ❌ Manual refresh failed:', error);
      throw error;
    }
  };
  
  return { refreshBalances };
};

/**
 * Utility function to update balances cache optimistically
 */
export const updateBalancesCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  entityId: string,
  updater: (oldData: WalletBalance[] | undefined) => WalletBalance[]
) => {
  queryClient.setQueryData(
    queryKeys.balancesByEntity(entityId),
    updater
  );
};

export default useBalances; 

/**
 * Mutation to set a wallet as primary
 */
export const useSetPrimaryWallet = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ walletId, entityId }: { walletId: string; entityId: string }) => {
      logger.debug(`[useSetPrimaryWallet] Setting wallet ${walletId} as primary for entity ${entityId}`);
      
      // Use the correct API endpoint that exists in the backend
      const response = await apiClient.patch(`/wallets/${walletId}/primary`);
      
      logger.info(`[useSetPrimaryWallet] Successfully set wallet ${walletId} as primary`);
      
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate balance queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: queryKeys.balancesByEntity(variables.entityId) });
      
      logger.info(`[useSetPrimaryWallet] Invalidated balance queries for entity ${variables.entityId}`);
    },
    onError: (error) => {
      logger.error('[useSetPrimaryWallet] Failed to set primary wallet:', error);
    },
  });
}; 