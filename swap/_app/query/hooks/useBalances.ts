/**
 * useBalances Hook
 * 
 * TanStack Query hook for wallet balances with WhatsApp-style local-first architecture.
 * Shows cached data instantly, syncs in background like ContactInteractionHistory2.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import balanceApi from '../../_api/balanceApi';
import { logger } from '../../utils/logger';
import { currencyWalletsRepository, CurrencyWallet } from '../../localdb/CurrencyWalletsRepository';
import { WalletBalance } from '../../types/wallet.types';

interface UseBalancesOptions {
  enabled?: boolean;
}

/**
 * useBalances Hook - WhatsApp-Style Local-First
 * 
 * Provides wallet balances with instant cached data display.
 * Same pattern as useTimeline in ContactInteractionHistory2.
 */
export const useBalances = (entityId: string, options: UseBalancesOptions = {}) => {
  const { enabled = true } = options;
  const queryClient = useQueryClient();

  // CRITICAL FIX: Validate entityId to prevent 400 errors during app initialization
  const isValidEntityId = entityId && entityId.trim().length > 0 && entityId !== 'undefined' && entityId !== 'null';
  
  if (!isValidEntityId) {
    logger.debug(`[useBalances] ⏸️ SKIPPING: Invalid entityId "${entityId}" - waiting for user data to load`);
  }

  // WhatsApp-style fetchBalances function
  const fetchBalances = async (): Promise<WalletBalance[]> => {
    // CRITICAL: Double-check entityId before making API calls
    if (!isValidEntityId) {
      logger.debug(`[useBalances] ❌ ABORT: Cannot fetch balances with invalid entityId "${entityId}"`);
      return [];
    }
    
    logger.debug(`[useBalances] 🚀 WHATSAPP-STYLE: Starting balance fetch for entity: ${entityId}`);
    
    // STEP 1: ALWAYS load from local cache first (INSTANT display like WhatsApp)
    const cachedBalances = await currencyWalletsRepository.getAllCurrencyWallets();
    logger.debug(`[useBalances] ✅ INSTANT: Loaded ${cachedBalances.length} balances from SQLite cache`);
    
    // Convert cached data to WalletBalance format
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
    
    // STEP 2: Return cached data IMMEDIATELY if we have it (WhatsApp behavior)
    if (cachedWalletBalances.length > 0) {
      logger.debug(`[useBalances] ⚡ INSTANT: Returning ${cachedWalletBalances.length} cached balances immediately`);
      
      // STEP 3: Background sync (non-blocking, like WhatsApp)
      setTimeout(async () => {
        try {
          // CRITICAL: Check if ANY wallet mutation is active RIGHT BEFORE syncing
          const mutations = queryClient.getMutationCache().getAll();
          const isWalletMutationActive = mutations.some(mutation => {
            const mutationKey = mutation.options.mutationKey;
            const isWalletMutation = mutationKey && mutationKey.includes('set_primary_wallet');
            const isPending = mutation.state.status === 'pending';
            
            if (isWalletMutation) {
              logger.debug(`[useBalances] 🔍 Found wallet mutation: ${mutationKey}, status: ${mutation.state.status}`);
            }
            
            return isWalletMutation && isPending;
          });
          
          if (isWalletMutationActive) {
            logger.debug(`[useBalances] ⏸️ SKIPPING background sync - wallet mutation in progress`);
            return;
          }

          logger.debug(`[useBalances] 🔄 BACKGROUND SYNC: Fetching fresh data from API`);
          const response = await balanceApi.fetchBalances(entityId);
          
          if (response && response.length > 0) {
            logger.debug(`[useBalances] ✅ BACKGROUND SYNC: Loaded ${response.length} balances from server`);
            
            // Transform API response to CurrencyWallet format for repository
            const repositoryBalances: CurrencyWallet[] = response.map((balance: WalletBalance) => ({
              id: balance.wallet_id,
              account_id: balance.account_id,
              currency_id: balance.currency_id,
              currency_code: balance.currency_code,
              currency_symbol: balance.currency_symbol,
              currency_name: balance.currency_name,
              balance: balance.balance,
              reserved_balance: balance.reserved_balance || 0,
              available_balance: balance.available_balance || balance.balance,
              balance_last_updated: balance.balance_last_updated || undefined,
              is_active: balance.is_active ?? true,
              is_primary: balance.isPrimary ?? false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_synced: true,
            }));
            
            // Save to local SQLite
            await currencyWalletsRepository.saveCurrencyWallets(repositoryBalances);
            
            // Update TanStack Query cache with WalletBalance format
            queryClient.setQueryData(queryKeys.balancesByEntity(entityId), response);
            logger.debug(`[useBalances] ✅ BACKGROUND SYNC: Updated ${response.length} balances in cache`);
          }
        } catch (error) {
          logger.debug(`[useBalances] ⚠️ Background sync failed (non-critical): ${error instanceof Error ? error.message : String(error)}`);
          // Fail silently to not disrupt user experience
        }
      }, 3000); // INCREASED: 3 second delay to ensure API calls complete first
      
      return cachedWalletBalances;
    }
    
    // STEP 4: No cache - fetch from API (first time only)
    logger.debug(`[useBalances] 📡 FIRST TIME: No cache found, fetching from API`);
    const apiBalances = await balanceApi.fetchBalances(entityId);
    logger.debug(`[useBalances] ✅ FIRST TIME: Loaded ${apiBalances.length} balances from server`);
    
    // Save to cache for next time
    const repositoryBalances: CurrencyWallet[] = apiBalances.map((balance: WalletBalance) => ({
      id: balance.wallet_id,
      account_id: balance.account_id,
      currency_id: balance.currency_id,
      currency_code: balance.currency_code,
      currency_symbol: balance.currency_symbol,
      currency_name: balance.currency_name,
      balance: balance.balance,
      reserved_balance: balance.reserved_balance || 0,
      available_balance: balance.available_balance || balance.balance,
      balance_last_updated: balance.balance_last_updated || undefined,
      is_active: balance.is_active ?? true,
      is_primary: balance.isPrimary ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_synced: true,
    }));
    
    await currencyWalletsRepository.saveCurrencyWallets(repositoryBalances);
    logger.debug(`[useBalances] ✅ FIRST TIME: Saved ${repositoryBalances.length} balances to cache`);
    
    return apiBalances;
  };

  return useQuery({
    queryKey: queryKeys.balancesByEntity(entityId),
    queryFn: fetchBalances,
    enabled: Boolean(enabled && isValidEntityId), // CRITICAL FIX: Only enable when entityId is valid
    staleTime: Infinity, // Never show loading for cached data
    gcTime: 1000 * 60 * 30, // 30 minutes
    networkMode: 'always',
    // Return cached data immediately if available
    initialData: () => {
      if (!isValidEntityId) {
        return []; // Return empty array for invalid entityId
      }
      
      const cached = queryClient.getQueryData<WalletBalance[]>(queryKeys.balancesByEntity(entityId));
      if (cached && cached.length > 0) {
        logger.debug(`[useBalances] ⚡ INITIAL: Using ${cached.length} cached balances`);
        return cached;
      }
      return undefined;
    },
  });
};

/**
 * Hook for setting primary wallet with optimistic updates
 */
export const useSetPrimaryWallet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['set_primary_wallet'],
    mutationFn: async ({ walletId, entityId }: { walletId: string; entityId: string }) => {
      logger.debug(`[useSetPrimaryWallet] 🔄 Setting primary wallet: ${walletId}`);
      const response = await balanceApi.setPrimaryWallet(walletId);
      logger.debug(`[useSetPrimaryWallet] ✅ Primary wallet set successfully`);
      return response;
    },
    onMutate: async ({ walletId, entityId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.balancesByEntity(entityId) });

      // Snapshot the previous value
      const previousBalances = queryClient.getQueryData<WalletBalance[]>(queryKeys.balancesByEntity(entityId));

      // Optimistically update to the new value
      if (previousBalances) {
        const optimisticBalances = previousBalances.map(balance => ({
          ...balance,
          isPrimary: balance.wallet_id === walletId,
        }));
        
        queryClient.setQueryData(queryKeys.balancesByEntity(entityId), optimisticBalances);
        logger.debug(`[useSetPrimaryWallet] ⚡ OPTIMISTIC: Updated primary wallet to ${walletId}`);
      }

      // Return a context object with the snapshotted value
      return { previousBalances };
    },
    onError: (err, { entityId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousBalances) {
        queryClient.setQueryData(queryKeys.balancesByEntity(entityId), context.previousBalances);
        logger.debug(`[useSetPrimaryWallet] ⚠️ ROLLBACK: Restored previous balances due to error`);
      }
    },
    onSuccess: (data, { entityId }) => {
      // Update the cache with the actual server response
      if (data) {
        const currentBalances = queryClient.getQueryData<WalletBalance[]>(queryKeys.balancesByEntity(entityId));
        if (currentBalances) {
          const updatedBalances = currentBalances.map(balance => ({
            ...balance,
            isPrimary: balance.wallet_id === data.wallet_id,
          }));
          
          queryClient.setQueryData(queryKeys.balancesByEntity(entityId), updatedBalances);
          logger.debug(`[useSetPrimaryWallet] ✅ SUCCESS: Updated cache with server response`);
        }
      }
    },
    onSettled: (data, error, { entityId }) => {
      // Only invalidate on error, not on success (to avoid unnecessary refetches)
      if (error) {
        logger.debug(`[useSetPrimaryWallet] ⚠️ ERROR: Invalidating cache due to mutation error`);
        queryClient.invalidateQueries({ queryKey: queryKeys.balancesByEntity(entityId) });
      }
    },
  });
}; 