/**
 * useBalances Hook
 * 
 * TanStack Query hook for wallet balances with WhatsApp-style local-first architecture.
 * Shows cached data instantly, syncs in background like ContactInteractionHistory2.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../tanstack-query/queryKeys';
import apiClient from '../_api/apiClient';
import { API_PATHS } from '../_api/apiPaths';
import logger from '../utils/logger';
import { currencyWalletsRepository, CurrencyWallet } from '../localdb/CurrencyWalletsRepository';
import { WalletBalance } from '../types/wallet.types';

interface UseBalancesOptions {
  enabled?: boolean;
}

// API Response interfaces matching actual backend response
interface WalletApiResponse {
  wallet_id: string;
  account_id: string;
  entity_id: string;
  currency_id: string;
  currency_code: string;
  currency_symbol: string;
  currency_name: string;
  balance: number;
  reserved_balance: number;
  available_balance: number;
  balance_last_updated: string | null;
  is_active: boolean;
  is_primary: boolean;
}

/**
 * Helper function to parse complex nested JSON structure from backend
 */
const parseComplexBackendResponse = (data: any): WalletApiResponse[] => {
  logger.debug('[useBalances] 🔍 Parsing complex backend response:', typeof data === 'string' ? data.substring(0, 200) + '...' : JSON.stringify(data).substring(0, 200) + '...');
  
  let result = data;
  
  // Handle multiple levels of JSON string parsing
  let parseAttempts = 0;
  while (typeof result === 'string' && parseAttempts < 5) {
    try {
      logger.debug(`[useBalances] 🔄 Parsing JSON string (attempt ${parseAttempts + 1})`);
      result = JSON.parse(result);
      parseAttempts++;
    } catch (parseError) {
      logger.error(`[useBalances] ❌ Failed to parse JSON string (attempt ${parseAttempts + 1}):`, parseError instanceof Error ? parseError : new Error(String(parseError)));
      break;
    }
  }
  
  // Handle different response structures
  if (Array.isArray(result)) {
    logger.debug('[useBalances] ✅ Found direct array response');
    return result;
  }
  
  if (result && typeof result === 'object') {
    // Check for nested data structures
    const keys = Object.keys(result);
    logger.debug(`[useBalances] 🔍 Object keys: ${keys.join(', ')}`);
    
    // Look for array-like structure (numbered keys)
    const numberedKeys = keys.filter(key => /^\d+$/.test(key)).sort((a, b) => parseInt(a) - parseInt(b));
    if (numberedKeys.length > 0) {
      logger.debug(`[useBalances] ✅ Found numbered keys structure with ${numberedKeys.length.toString()} items`);
      return numberedKeys.map(key => {
        const item = result[key];
        return typeof item === 'string' ? JSON.parse(item) : item;
      });
    }
    
    // Check for data property
    if (result.data) {
      logger.debug('[useBalances] ✅ Found data property, recursing');
      return parseComplexBackendResponse(result.data);
    }
  }
  
  logger.warn(`[useBalances] ⚠️ Unexpected response structure, returning empty array`);
  return [];
};

/**
 * Transform API response to WalletBalance format
 */
const transformToWalletBalance = (apiWallet: WalletApiResponse): WalletBalance => {
  return {
    wallet_id: apiWallet.wallet_id,
    account_id: apiWallet.account_id,
    entity_id: apiWallet.entity_id,
    currency_id: apiWallet.currency_id,
    currency_code: apiWallet.currency_code,
    currency_symbol: apiWallet.currency_symbol,
    currency_name: apiWallet.currency_name,
    balance: apiWallet.balance,
    available_balance: apiWallet.available_balance,
    reserved_balance: apiWallet.reserved_balance,
    balance_last_updated: apiWallet.balance_last_updated,
    is_active: apiWallet.is_active,
    isPrimary: apiWallet.is_primary,
    last_updated: apiWallet.balance_last_updated || new Date().toISOString(),
  };
};

/**
 * useBalances Hook - WhatsApp-Style Local-First
 * 
 * Provides wallet balances with instant cached data display.
 * Same pattern as useTimeline in ContactInteractionHistory2.
 */
export const useBalances = (entityId: string, options: UseBalancesOptions = {}) => {
  const { enabled = true } = options;
  const queryClient = useQueryClient();

  // PROFESSIONAL FIX: Validate entityId AND check if enabled to prevent unauthorized API calls
  const isValidEntityId = entityId && entityId.trim().length > 0 && entityId !== 'undefined' && entityId !== 'null';
  const shouldExecute = enabled && isValidEntityId;

  if (!isValidEntityId) {
    logger.debug(`[useBalances] ⏸️ SKIPPING: Invalid entityId "${entityId}" - waiting for user data to load`);
  }

  if (!enabled) {
    logger.debug(`[useBalances] ⏸️ SKIPPING: Hook disabled - likely due to authentication state`);
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
          const response = await apiClient.get(API_PATHS.WALLET.BY_ENTITY(entityId));
          const parsedWallets = parseComplexBackendResponse(response.data);
          const transformedBalances = parsedWallets.map(transformToWalletBalance);
          
          if (transformedBalances && transformedBalances.length > 0) {
            logger.debug(`[useBalances] ✅ BACKGROUND SYNC: Loaded ${transformedBalances.length} balances from server`);
            
            // Transform API response to CurrencyWallet format for repository
            const repositoryBalances: CurrencyWallet[] = transformedBalances.map((balance: WalletBalance) => ({
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
            queryClient.setQueryData(queryKeys.balancesByEntity(entityId), transformedBalances);
            logger.debug(`[useBalances] ✅ BACKGROUND SYNC: Updated ${transformedBalances.length} balances in cache`);
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
    const response = await apiClient.get(API_PATHS.WALLET.BY_ENTITY(entityId));
    const parsedWallets = parseComplexBackendResponse(response.data);
    const apiBalances = parsedWallets.map(transformToWalletBalance);
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
    enabled: Boolean(shouldExecute), // PROFESSIONAL FIX: Only enable when authenticated and entityId is valid
    staleTime: Infinity, // Never show loading for cached data
    gcTime: 1000 * 60 * 30, // 30 minutes
    networkMode: 'always',
    // Return cached data immediately if available
    initialData: () => {
      if (!shouldExecute) {
        return []; // Return empty array for unauthenticated or invalid entityId
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
 * Interface for wallet eligibility response
 */
interface WalletEligibilityResponse {
  eligible: boolean;
  reason?: 'KYC_REQUIRED' | 'PROFILE_INCOMPLETE' | 'BLOCKED';
  kycStatus: 'none' | 'partial' | 'verified';
  profileComplete: boolean;
  nextStep: 'complete-profile' | 'verify-identity' | 'ready';
  hasWallets: boolean;
}

/**
 * Interface for wallet initialization response
 */
interface WalletInitializationResponse {
  accounts: any[];
  wallets: WalletBalance[];
  defaultWalletId: string;
}

/**
 * Hook for checking wallet eligibility
 */
export const useWalletEligibility = (entityId: string, options: UseBalancesOptions = {}) => {
  const { enabled = true } = options;

  // Validate entityId
  const isValidEntityId = entityId && entityId.trim().length > 0 && entityId !== 'undefined' && entityId !== 'null';

  return useQuery({
    queryKey: ['wallet_eligibility', entityId],
    queryFn: async (): Promise<WalletEligibilityResponse> => {
      if (!isValidEntityId) {
        throw new Error('Invalid entity ID');
      }

      logger.debug(`[useWalletEligibility] 🔍 Checking eligibility for entity: ${entityId}`);
      const response = await apiClient.get(`/wallets/eligibility?entityId=${entityId}`);
      logger.debug(`[useWalletEligibility] ✅ Eligibility result:`, response.data);

      return response.data;
    },
    enabled: Boolean(enabled && isValidEntityId),
    staleTime: 1000 * 60 * 5, // 5 minutes - eligibility doesn't change often
    networkMode: 'always',
  });
};

/**
 * Hook for initializing wallet system
 */
export const useInitializeWallet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['initialize_wallet'],
    mutationFn: async (entityId: string): Promise<WalletInitializationResponse> => {
      logger.debug(`[useInitializeWallet] 🚀 Initializing wallet for entity: ${entityId}`);
      const response = await apiClient.post(`/wallets/initialize?entityId=${entityId}`);
      logger.debug(`[useInitializeWallet] ✅ Wallet initialized successfully`);

      return response.data;
    },
    onSuccess: (data, entityId) => {
      // Update the balances cache with new wallets
      if (data.wallets && data.wallets.length > 0) {
        queryClient.setQueryData(queryKeys.balancesByEntity(entityId), data.wallets);
        logger.debug(`[useInitializeWallet] ✅ Updated cache with ${data.wallets.length} new wallets`);
      }

      // Invalidate eligibility cache since user now has wallets
      queryClient.invalidateQueries({ queryKey: ['wallet_eligibility', entityId] });

      // Transform API response to CurrencyWallet format for local storage
      const repositoryBalances: CurrencyWallet[] = data.wallets.map((balance: WalletBalance) => ({
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

      // Save to local SQLite cache
      currencyWalletsRepository.saveCurrencyWallets(repositoryBalances)
        .then(() => {
          logger.debug(`[useInitializeWallet] ✅ Saved ${repositoryBalances.length} wallets to cache`);
        })
        .catch((error) => {
          logger.warn(`[useInitializeWallet] ⚠️ Failed to save wallets to cache:`, error);
        });
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
      const response = await apiClient.patch(`/wallets/${walletId}/primary`);
      logger.debug(`[useSetPrimaryWallet] ✅ Primary wallet set successfully`);
      
      // Handle the response data - it's a single wallet object, not an array
      let walletData = response.data;
      
      // If the data is a JSON string, parse it
      if (typeof walletData === 'string') {
        try {
          walletData = JSON.parse(walletData);
        } catch (parseError) {
          logger.error('[useSetPrimaryWallet] ❌ Failed to parse wallet data JSON:', parseError);
          throw new Error('Invalid JSON response from setPrimaryWallet');
        }
      }
      
      // Validate that we have a wallet object with required fields
      if (!walletData || typeof walletData !== 'object' || !walletData.wallet_id) {
        logger.error('[useSetPrimaryWallet] ❌ Invalid wallet data structure:', walletData);
        throw new Error('Invalid wallet data structure from setPrimaryWallet');
      }
      
      // Transform to WalletBalance format
      const transformedWallet = transformToWalletBalance(walletData);
      logger.debug(`[useSetPrimaryWallet] ✅ Successfully transformed primary wallet: ${transformedWallet.currency_code}`);
      
      return transformedWallet;
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