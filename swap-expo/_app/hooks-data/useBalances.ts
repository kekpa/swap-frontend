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
import { useCurrentProfileId } from '../hooks/useCurrentProfileId';
import { useAuthContext } from '../features/auth/context/AuthContext';
import { profileContextManager } from '../services/ProfileContextManager';

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
  currency_color: string | null;
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

    // Check for result property (backend uses {result: [...], meta: {...}} format)
    if (result.result) {
      logger.debug('[useBalances] ✅ Found result property, recursing');
      return parseComplexBackendResponse(result.result);
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
    currency_color: apiWallet.currency_color || null,
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
  const profileId = useCurrentProfileId();
  const { isProfileSwitching } = useAuthContext();

  // PROFESSIONAL FIX: Validate entityId AND profileId AND check if enabled to prevent unauthorized API calls
  // CRITICAL: Also check isProfileSwitching to prevent stale queries during profile switch
  const isValidEntityId = entityId && entityId.trim().length > 0 && entityId !== 'undefined' && entityId !== 'null';
  const shouldExecute = enabled && isValidEntityId && !!profileId && !isProfileSwitching;

  if (!isValidEntityId) {
    logger.debug(`[useBalances] ⏸️ SKIPPING: Invalid entityId "${entityId}" - waiting for user data to load`);
  }

  if (!enabled) {
    logger.debug(`[useBalances] ⏸️ SKIPPING: Hook disabled - likely due to authentication state`);
  }

  if (isProfileSwitching) {
    logger.debug(`[useBalances] ⏸️ SKIPPING: Profile switch in progress - preventing stale query`);
  }

  // WhatsApp-style fetchBalances function
  const fetchBalances = async (): Promise<WalletBalance[]> => {
    // DEBUG: Log entityId at query execution time
    console.log('💰 [useBalances] queryFn executing with:', { entityId, profileId, isValidEntityId, shouldExecute });

    // CRITICAL: Double-check entityId before making API calls
    if (!isValidEntityId) {
      console.log('💰 [useBalances] ❌ ABORT: Invalid entityId:', entityId);
      return [];
    }

    console.log('💰 [useBalances] 🚀 Starting balance fetch for entity:', entityId);
  
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
      currency_color: wallet.currency_color || null,
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
      // PROFILE-SAFE: Capture profileId and entityId at schedule time, check for staleness at execution time
      const capturedProfileId = profileId!;
      const capturedEntityId = entityId;
      setTimeout(async () => {
        try {
          // PROFILE SWITCH GUARD: Skip if profile changed or switching in progress
          if (profileContextManager.isProfileStale(capturedProfileId) || profileContextManager.isSwitchingProfile()) {
            logger.debug(`[useBalances] ⏸️ BACKGROUND SYNC SKIPPED: Profile changed (was: ${capturedProfileId})`);
            return;
          }

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
          const response = await apiClient.get(API_PATHS.WALLET.BY_ENTITY(capturedEntityId));
          const parsedWallets = parseComplexBackendResponse(response.data);
          const transformedBalances = parsedWallets.map(transformToWalletBalance);

          // PROFILE SWITCH GUARD: Check again after API call
          if (profileContextManager.isProfileStale(capturedProfileId) || profileContextManager.isSwitchingProfile()) {
            logger.debug(`[useBalances] ⏸️ BACKGROUND SYNC SKIPPED: Profile changed during API call`);
            return;
          }

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
          currency_color: balance.currency_color || undefined,
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
            // SECURITY FIX: Include profileId for proper data isolation
        await currencyWalletsRepository.saveCurrencyWallets(repositoryBalances, capturedProfileId);

            // Update TanStack Query cache with WalletBalance format
            queryClient.setQueryData(queryKeys.balancesByEntity(capturedProfileId, capturedEntityId), transformedBalances);
            logger.debug(`[useBalances] ✅ BACKGROUND SYNC: Updated ${transformedBalances.length} balances in cache (profileId: ${capturedProfileId})`);
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
      currency_color: balance.currency_color || undefined,
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

    // SECURITY FIX: Include profileId for proper data isolation
    await currencyWalletsRepository.saveCurrencyWallets(repositoryBalances, profileId!);
    logger.debug(`[useBalances] ✅ FIRST TIME: Saved ${repositoryBalances.length} balances to cache`);
    
    return apiBalances;
  };

  return useQuery({
    queryKey: queryKeys.balancesByEntity(profileId!, entityId),
    queryFn: fetchBalances,
    enabled: Boolean(shouldExecute), // PROFESSIONAL FIX: Only enable when authenticated and entityId and profileId are valid
    staleTime: Infinity, // Never show loading for cached data
    gcTime: 1000 * 60 * 30, // 30 minutes
    networkMode: 'always',
    // Return cached data immediately if available
    initialData: () => {
      if (!shouldExecute || !profileId) {
        return []; // Return empty array for unauthenticated or invalid entityId/profileId
      }

      const cached = queryClient.getQueryData<WalletBalance[]>(queryKeys.balancesByEntity(profileId, entityId));
      if (cached && cached.length > 0) {
        logger.debug(`[useBalances] ⚡ INITIAL: Using ${cached.length} cached balances (profileId: ${profileId})`);
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
  reason?: 'KYC_REQUIRED' | 'PROFILE_INCOMPLETE' | 'KYC_REJECTED' | 'ACCOUNT_SUSPENDED' | 'BLOCKED';
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
  const profileId = useCurrentProfileId();

  return useMutation({
    mutationKey: ['initialize_wallet'],
    mutationFn: async (entityId: string): Promise<WalletInitializationResponse> => {
      logger.debug(`[useInitializeWallet] 🚀 Initializing wallet for entity: ${entityId} (profileId: ${profileId})`);

      try {
        const response = await apiClient.post(`/wallets/initialize?entityId=${entityId}`);
        logger.debug(`[useInitializeWallet] ✅ Wallet initialized successfully`);
        return response.data;
      } catch (error: any) {
        // ✅ SMART RECOVERY: Check if wallets exist despite error (race condition recovery)
        if (error.response?.status === 500 || error.response?.status === 409) {
          logger.warn(`[useInitializeWallet] ⚠️ Initialization failed with ${error.response.status}, checking if wallets exist...`);

          try {
            // Check if the operation actually succeeded (wallets created by concurrent request)
            const eligibilityResponse = await apiClient.get(`/wallets/eligibility?entityId=${entityId}`);

            if (eligibilityResponse.data?.hasWallets) {
              logger.log(`[useInitializeWallet] ✅ RACE RECOVERY: Wallets exist despite error - initialization succeeded via concurrent request`);

              // Fetch the actual wallet data
              const walletsResponse = await apiClient.get(API_PATHS.WALLET.BY_ENTITY(entityId));
              const parsedWallets = parseComplexBackendResponse(walletsResponse.data);
              const transformedBalances = parsedWallets.map(transformToWalletBalance);

              return {
                accounts: [],
                wallets: transformedBalances,
                defaultWalletId: transformedBalances.find(w => w.isPrimary)?.wallet_id || transformedBalances[0]?.wallet_id
              };
            }
          } catch (checkError) {
            logger.error(`[useInitializeWallet] ❌ Failed to verify wallet existence after error:`, checkError);
          }
        }

        // Re-throw original error if recovery didn't work
        throw error;
      }
    },
    // ✅ AUTOMATIC RETRY: Retry server errors with exponential backoff
    retry: (failureCount, error: any) => {
      // Don't retry on client errors (4xx) - these are permanent failures
      if (error.response?.status >= 400 && error.response?.status < 500) {
        logger.debug(`[useInitializeWallet] ⏸️ Not retrying - client error: ${error.response.status}`);
        return false;
      }

      // Retry server errors (5xx) up to 2 times
      if (failureCount < 2) {
        logger.debug(`[useInitializeWallet] 🔄 Retrying (attempt ${failureCount + 1}/2)...`);
        return true;
      }

      logger.debug(`[useInitializeWallet] ⏸️ Max retries reached (${failureCount})`);
      return false;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 500ms, 1000ms
      const delay = Math.min(1000 * Math.pow(2, attemptIndex - 1), 1000);
      logger.debug(`[useInitializeWallet] ⏳ Waiting ${delay}ms before retry...`);
      return delay;
    },
    onSuccess: (data, entityId) => {
      if (!profileId) {
        logger.warn('[useInitializeWallet] ⚠️ No profileId available, skipping cache update');
        return;
      }

      // Update the balances cache with new wallets
      if (data.wallets && data.wallets.length > 0) {
        queryClient.setQueryData(queryKeys.balancesByEntity(profileId, entityId), data.wallets);
        logger.debug(`[useInitializeWallet] ✅ Updated cache with ${data.wallets.length} new wallets (profileId: ${profileId})`);
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
        currency_color: balance.currency_color || undefined,
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
      // SECURITY FIX: Include profileId for proper data isolation
      currencyWalletsRepository.saveCurrencyWallets(repositoryBalances, profileId)
        .then(() => {
          logger.debug(`[useInitializeWallet] ✅ Saved ${repositoryBalances.length} wallets to cache (profileId: ${profileId})`);
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
  const profileId = useCurrentProfileId();

  return useMutation({
    mutationKey: ['set_primary_wallet'],
    mutationFn: async ({ walletId, entityId }: { walletId: string; entityId: string }) => {
      logger.debug(`[useSetPrimaryWallet] 🔄 Setting primary wallet: ${walletId} (profileId: ${profileId})`);
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
      if (!profileId) {
        logger.warn('[useSetPrimaryWallet] ⚠️ No profileId available, skipping optimistic update');
        return { previousBalances: undefined };
      }

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.balancesByEntity(profileId, entityId) });

      // Snapshot the previous value
      const previousBalances = queryClient.getQueryData<WalletBalance[]>(queryKeys.balancesByEntity(profileId, entityId));

      // Optimistically update to the new value
      if (previousBalances) {
        const optimisticBalances = previousBalances.map(balance => ({
          ...balance,
          isPrimary: balance.wallet_id === walletId,
        }));

        queryClient.setQueryData(queryKeys.balancesByEntity(profileId, entityId), optimisticBalances);
        logger.debug(`[useSetPrimaryWallet] ⚡ OPTIMISTIC: Updated primary wallet to ${walletId} (profileId: ${profileId})`);
      }

      // Return a context object with the snapshotted value
      return { previousBalances };
    },
    onError: (err, { entityId }, context) => {
      if (!profileId) {
        logger.warn('[useSetPrimaryWallet] ⚠️ No profileId available for rollback');
        return;
      }

      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousBalances) {
        queryClient.setQueryData(queryKeys.balancesByEntity(profileId, entityId), context.previousBalances);
        logger.debug(`[useSetPrimaryWallet] ⚠️ ROLLBACK: Restored previous balances due to error (profileId: ${profileId})`);
      }
    },
    onSuccess: (data, { entityId }) => {
      if (!profileId) {
        logger.warn('[useSetPrimaryWallet] ⚠️ No profileId available for cache update');
        return;
      }

      // Update the cache with the actual server response
      if (data) {
        const currentBalances = queryClient.getQueryData<WalletBalance[]>(queryKeys.balancesByEntity(profileId, entityId));
        if (currentBalances) {
          const updatedBalances = currentBalances.map(balance => ({
            ...balance,
            isPrimary: balance.wallet_id === data.wallet_id,
          }));

          queryClient.setQueryData(queryKeys.balancesByEntity(profileId, entityId), updatedBalances);
          logger.debug(`[useSetPrimaryWallet] ✅ SUCCESS: Updated cache with server response (profileId: ${profileId})`);
        }
      }
    },
    onSettled: (data, error, { entityId }) => {
      if (!profileId) {
        logger.warn('[useSetPrimaryWallet] ⚠️ No profileId available for invalidation');
        return;
      }

      // Only invalidate on error, not on success (to avoid unnecessary refetches)
      if (error) {
        logger.debug(`[useSetPrimaryWallet] ⚠️ ERROR: Invalidating cache due to mutation error (profileId: ${profileId})`);
        queryClient.invalidateQueries({ queryKey: queryKeys.balancesByEntity(profileId, entityId) });
      }
    },
  });
};

/**
 * Hook for creating a new currency wallet
 * Uses GET_OR_CREATE endpoint - creates if doesn't exist, returns existing if it does
 */
export const useCreateCurrencyWallet = () => {
  const queryClient = useQueryClient();
  const profileId = useCurrentProfileId();

  return useMutation({
    mutationKey: ['create_currency_wallet'],
    mutationFn: async ({
      accountId,
      currencyId,
      entityId
    }: {
      accountId: string;
      currencyId: string;
      entityId: string;
    }) => {
      logger.debug(`[useCreateCurrencyWallet] 🔄 Creating wallet for currency: ${currencyId}`);

      // Create wallet endpoint - POST for resource creation (RESTful best practice)
      const response = await apiClient.post(API_PATHS.WALLET.GET_OR_CREATE(accountId, currencyId));

      logger.debug(`[useCreateCurrencyWallet] ✅ Wallet created/retrieved successfully`);

      // Handle the response data
      let walletData = response.data?.data || response.data;

      // If the data is a JSON string, parse it
      if (typeof walletData === 'string') {
        try {
          walletData = JSON.parse(walletData);
        } catch (parseError) {
          logger.error('[useCreateCurrencyWallet] ❌ Failed to parse wallet data JSON:', parseError);
          throw new Error('Invalid JSON response from createCurrencyWallet');
        }
      }

      // Validate that we have a wallet object with required fields
      if (!walletData || typeof walletData !== 'object' || !walletData.wallet_id) {
        logger.error('[useCreateCurrencyWallet] ❌ Invalid wallet data structure:', walletData);
        throw new Error('Invalid wallet data structure from createCurrencyWallet');
      }

      // Transform to WalletBalance format
      const transformedWallet = transformToWalletBalance(walletData);
      logger.debug(`[useCreateCurrencyWallet] ✅ Created wallet: ${transformedWallet.currency_code} (${transformedWallet.wallet_id})`);

      // Set the new wallet as primary so it shows on top (better UX - user sees what they just added)
      try {
        await apiClient.patch(`/wallets/${transformedWallet.wallet_id}/primary`);
        transformedWallet.isPrimary = true;
        logger.debug(`[useCreateCurrencyWallet] ✅ Set ${transformedWallet.currency_code} as primary wallet`);
      } catch (primaryError) {
        // Non-critical - wallet was still created, just not set as primary
        logger.warn(`[useCreateCurrencyWallet] ⚠️ Failed to set as primary:`, primaryError);
      }

      return { wallet: transformedWallet, entityId };
    },
    onSuccess: ({ wallet, entityId }) => {
      if (!profileId) {
        logger.warn('[useCreateCurrencyWallet] ⚠️ No profileId available for cache update');
        return;
      }

      // Get current balances and add the new wallet
      const currentBalances = queryClient.getQueryData<WalletBalance[]>(queryKeys.balancesByEntity(profileId, entityId));

      if (currentBalances) {
        // Check if wallet already exists (avoid duplicates)
        const walletExists = currentBalances.some(b => b.wallet_id === wallet.wallet_id);

        if (!walletExists) {
          // Clear primary from all existing wallets, add new wallet as primary
          const updatedBalances = currentBalances.map(b => ({ ...b, isPrimary: false }));
          updatedBalances.push({ ...wallet, isPrimary: true });
          queryClient.setQueryData(queryKeys.balancesByEntity(profileId, entityId), updatedBalances);
          logger.debug(`[useCreateCurrencyWallet] ✅ Added ${wallet.currency_code} wallet as primary (now ${updatedBalances.length} wallets)`);
        } else {
          // Wallet exists - just update primary status
          const updatedBalances = currentBalances.map(b => ({
            ...b,
            isPrimary: b.wallet_id === wallet.wallet_id
          }));
          queryClient.setQueryData(queryKeys.balancesByEntity(profileId, entityId), updatedBalances);
          logger.debug(`[useCreateCurrencyWallet] ℹ️ Wallet ${wallet.currency_code} already exists, set as primary`);
        }
      } else {
        // No existing balances, set the new wallet as the only one (and primary)
        queryClient.setQueryData(queryKeys.balancesByEntity(profileId, entityId), [{ ...wallet, isPrimary: true }]);
        logger.debug(`[useCreateCurrencyWallet] ✅ Created initial wallet cache with ${wallet.currency_code} as primary`);
      }

      // Also save to local SQLite cache and update primary status
      const repositoryWallet: CurrencyWallet = {
        id: wallet.wallet_id,
        account_id: wallet.account_id,
        currency_id: wallet.currency_id,
        currency_code: wallet.currency_code,
        currency_symbol: wallet.currency_symbol,
        currency_name: wallet.currency_name,
        currency_color: wallet.currency_color || undefined,
        balance: wallet.balance,
        reserved_balance: wallet.reserved_balance || 0,
        available_balance: wallet.available_balance || wallet.balance,
        balance_last_updated: wallet.balance_last_updated || undefined,
        is_active: wallet.is_active ?? true,
        is_primary: true, // New wallets are set as primary for better UX
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_synced: true,
      };

      // Update primary status in local SQLite (clears others, sets this one)
      currencyWalletsRepository.updatePrimaryWallet(wallet.wallet_id, profileId)
        .catch((error) => {
          logger.warn(`[useCreateCurrencyWallet] ⚠️ Failed to update primary in local cache:`, error);
        });

      currencyWalletsRepository.saveCurrencyWallets([repositoryWallet], profileId)
        .then(() => {
          logger.debug(`[useCreateCurrencyWallet] ✅ Saved ${wallet.currency_code} wallet to local cache`);
        })
        .catch((error) => {
          logger.warn(`[useCreateCurrencyWallet] ⚠️ Failed to save wallet to local cache:`, error);
        });
    },
    onError: (error) => {
      logger.error('[useCreateCurrencyWallet] ❌ Failed to create wallet:', error);
    },
  });
};

/**
 * Hook for deactivating (soft-deleting) a currency wallet
 *
 * Business Rules:
 * - Wallet must have 0 balance and 0 reserved_balance
 * - Cannot be the user's only wallet
 * - Transaction history is preserved (soft delete)
 * - Re-adding the same currency later will reactivate the wallet
 */
export const useDeactivateWallet = () => {
  const queryClient = useQueryClient();
  const profileId = useCurrentProfileId();

  return useMutation({
    mutationKey: ['deactivate_wallet'],
    mutationFn: async ({
      walletId,
      entityId
    }: {
      walletId: string;
      entityId: string;
    }): Promise<{ newPrimaryWalletId: string | null; entityId: string }> => {
      logger.debug(`[useDeactivateWallet] 🗑️ Deactivating wallet: ${walletId}`);

      const response = await apiClient.delete(`/wallets/${walletId}`);

      logger.debug(`[useDeactivateWallet] ✅ Wallet deactivated successfully`, response.data);

      return {
        newPrimaryWalletId: response.data?.newPrimaryWalletId || null,
        entityId,
      };
    },
    onMutate: async ({ walletId, entityId }) => {
      if (!profileId) {
        logger.warn('[useDeactivateWallet] ⚠️ No profileId available, skipping optimistic update');
        return { previousBalances: undefined };
      }

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.balancesByEntity(profileId, entityId) });

      // Snapshot the previous value
      const previousBalances = queryClient.getQueryData<WalletBalance[]>(queryKeys.balancesByEntity(profileId, entityId));

      // Optimistically remove the wallet from the list
      if (previousBalances) {
        const optimisticBalances = previousBalances.filter(balance => balance.wallet_id !== walletId);

        // If the removed wallet was primary, set the next one as primary
        const removedWallet = previousBalances.find(b => b.wallet_id === walletId);
        if (removedWallet?.isPrimary && optimisticBalances.length > 0) {
          optimisticBalances[0] = { ...optimisticBalances[0], isPrimary: true };
        }

        queryClient.setQueryData(queryKeys.balancesByEntity(profileId, entityId), optimisticBalances);
        logger.debug(`[useDeactivateWallet] ⚡ OPTIMISTIC: Removed wallet ${walletId} from cache`);
      }

      return { previousBalances };
    },
    onError: (err, { entityId }, context) => {
      if (!profileId) {
        logger.warn('[useDeactivateWallet] ⚠️ No profileId available for rollback');
        return;
      }

      // Rollback to previous state on error
      if (context?.previousBalances) {
        queryClient.setQueryData(queryKeys.balancesByEntity(profileId, entityId), context.previousBalances);
        logger.debug(`[useDeactivateWallet] ⚠️ ROLLBACK: Restored wallet due to error`);
      }

      logger.error('[useDeactivateWallet] ❌ Failed to deactivate wallet:', err);
    },
    onSuccess: async ({ newPrimaryWalletId, entityId }) => {
      if (!profileId) {
        logger.warn('[useDeactivateWallet] ⚠️ No profileId available for cache update');
        return;
      }

      // If a new primary wallet was set, update the cache
      if (newPrimaryWalletId) {
        const currentBalances = queryClient.getQueryData<WalletBalance[]>(queryKeys.balancesByEntity(profileId, entityId));
        if (currentBalances) {
          const updatedBalances = currentBalances.map(balance => ({
            ...balance,
            isPrimary: balance.wallet_id === newPrimaryWalletId,
          }));
          queryClient.setQueryData(queryKeys.balancesByEntity(profileId, entityId), updatedBalances);
          logger.debug(`[useDeactivateWallet] ✅ Updated primary wallet to ${newPrimaryWalletId}`);
        }
      }

      // Refresh local SQLite cache
      try {
        const response = await apiClient.get(API_PATHS.WALLET.BY_ENTITY(entityId));
        const parsedWallets = parseComplexBackendResponse(response.data);
        const transformedBalances = parsedWallets.map(transformToWalletBalance);

        // Transform to repository format and save
        const repositoryBalances: CurrencyWallet[] = transformedBalances.map((balance: WalletBalance) => ({
          id: balance.wallet_id,
          account_id: balance.account_id,
          currency_id: balance.currency_id,
          currency_code: balance.currency_code,
          currency_symbol: balance.currency_symbol,
          currency_name: balance.currency_name,
          currency_color: balance.currency_color || undefined,
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

        await currencyWalletsRepository.clearAllCurrencyWallets();
        await currencyWalletsRepository.saveCurrencyWallets(repositoryBalances, profileId);
        logger.debug(`[useDeactivateWallet] ✅ Refreshed local cache with ${repositoryBalances.length} wallets`);
      } catch (error) {
        logger.warn(`[useDeactivateWallet] ⚠️ Failed to refresh local cache:`, error);
      }
    },
    onSettled: (_, error, { entityId }) => {
      if (!profileId) return;

      // Only invalidate on error to trigger a full refetch
      if (error) {
        queryClient.invalidateQueries({ queryKey: queryKeys.balancesByEntity(profileId, entityId) });
      }
    },
  });
};