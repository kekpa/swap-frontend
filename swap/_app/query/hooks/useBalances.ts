/**
 * useBalances Hook
 * 
 * TanStack Query hook for wallet balances with local-first architecture.
 * Uses direct API calls and SQLite repositories for optimal caching.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { logger } from '../../utils/logger';
import { queryKeys } from '../queryKeys';
import { balanceApi } from '../api/balanceApi';
import { currencyWalletsRepository, CurrencyWallet } from '../../localdb/CurrencyWalletsRepository';
import { WalletBalance } from '../../types/wallet.types';
import { networkService } from '../../services/NetworkService';

/**
 * Local-first balance fetching function
 * 1. Try SQLite cache first (instant)
 * 2. If no cache or stale, fetch from API (background)
 * 3. Update cache with fresh data
 */
const fetchBalancesLocalFirst = async (entityId: string): Promise<WalletBalance[]> => {
  logger.debug('[useBalances] Starting local-first balance fetch for entity:', entityId);
  
  try {
    // Step 1: Try local cache first (instant response)
    const cachedBalances = await currencyWalletsRepository.getAllCurrencyWallets();
    
    if (cachedBalances && cachedBalances.length > 0) {
      logger.debug(`[useBalances] ✅ INSTANT: Loaded ${cachedBalances.length} balances from cache`);
      
      // Convert from repository format to WalletBalance format
      const walletBalances: WalletBalance[] = cachedBalances.map((wallet: CurrencyWallet) => ({
        wallet_id: wallet.id,
        account_id: wallet.account_id,
        entity_id: entityId, // Add entity_id from parameter
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
      
      return walletBalances;
    }
    
    // Step 2: No cache available, fetch from API
    logger.debug('[useBalances] 📡 No cache found, fetching from API...');
    
    if (!networkService.isOnline) {
      logger.warn('[useBalances] ⚠️ Offline and no cache available');
      return [];
    }
    
    // Fetch fresh data directly from API
    const apiBalances = await balanceApi.fetchBalances(entityId);
    
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
      balance_last_updated: balance.balance_last_updated,
      is_active: balance.is_active,
      is_primary: balance.isPrimary,
    }));
    
    // Save to local repository for offline access
    await currencyWalletsRepository.saveCurrencyWallets(repositoryBalances);
    
    // Get the fresh data that was just saved
    const freshBalances = repositoryBalances;
    
    if (freshBalances && freshBalances.length > 0) {
      logger.debug(`[useBalances] ✅ FRESH: Loaded ${freshBalances.length} balances from API`);
      
      const walletBalances: WalletBalance[] = freshBalances.map((wallet: CurrencyWallet) => ({
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
      
      return walletBalances;
    }
    
    logger.warn('[useBalances] ⚠️ No balances available from API');
    return [];
    
  } catch (error) {
    logger.error('[useBalances] ❌ Failed to fetch balances:', error);
    
    // Try to return cached data as fallback
    try {
      const fallbackBalances = await currencyWalletsRepository.getAllCurrencyWallets();
      if (fallbackBalances && fallbackBalances.length > 0) {
        logger.debug('[useBalances] 🔄 Returning cached data as fallback');
        
        const walletBalances: WalletBalance[] = fallbackBalances.map((wallet: CurrencyWallet) => ({
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
        
        return walletBalances;
      }
    } catch (fallbackError) {
      logger.error('[useBalances] ❌ Fallback cache read failed:', fallbackError);
    }
    
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
      // Don't retry if offline
      if (!networkService.isOnline) {
        return false;
      }
      
      // Don't retry on client errors (4xx)
      if (error?.status >= 400 && error?.status < 500) {
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