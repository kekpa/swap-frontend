// Enhanced transaction hooks with local-first architecture - 2025-01-11
// Updated: 2025-12-23 - Unified architecture using local_timeline as single source of truth
// Updated: 2025-12-24 - TIMELINE_UPDATED_EVENT centralized in queryClient.ts (Revolut pattern)
// Same pattern as useTimeline and useBalances for instant cached data display

import React, { useCallback, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../tanstack-query/queryKeys';
import { queryClient } from '../tanstack-query/queryClient';
import { walletManager } from '../services/WalletManager';
import { Transaction } from '../types/transaction.types';
import logger from '../utils/logger';
import { networkService } from '../services/NetworkService';
import { useCurrentEntityId } from '../hooks/useCurrentEntityId';
import { useAuthContext } from '../features/auth/context/AuthContext';
import { profileContextManager } from '../services/ProfileContextManager';
import { unifiedTimelineRepository } from '../localdb/UnifiedTimelineRepository';
// NOTE: TIMELINE_UPDATED_EVENT listener is centralized in queryClient.ts
import { LocalTimelineItem } from '../localdb/schema/local-timeline-schema';

/**
 * Convert LocalTimelineItem to Transaction format for wallet display
 * This maps the unified timeline schema to the wallet's expected format
 */
const mapTimelineItemToTransaction = (item: LocalTimelineItem): Transaction => {
  return {
    id: item.id,
    server_id: item.server_id || item.id,
    interaction_id: item.interaction_id,
    amount: item.amount || 0,
    currency_id: item.currency_id || '',
    currency_code: item.currency_code || '',
    currency_symbol: item.currency_symbol || '',
    transaction_type: item.transaction_type as any || 'transfer',
    status: item.local_status as any || 'completed',
    from_entity_id: item.from_entity_id || '',
    to_entity_id: item.to_entity_id || '',
    from_wallet_id: item.from_wallet_id || '',
    to_wallet_id: item.to_wallet_id || '',
    description: item.description || item.content || '',
    created_at: item.created_at,
    updated_at: item.created_at,
    metadata: item.timeline_metadata ? (typeof item.timeline_metadata === 'string' ? JSON.parse(item.timeline_metadata) : item.timeline_metadata) : {},
  } as Transaction;
};

/**
 * Convert API Transaction to LocalTimelineItem format for storage
 */
const mapTransactionToTimelineItem = (tx: Transaction, entityId: string): Partial<LocalTimelineItem> & { id: string } => {
  return {
    id: tx.id,
    server_id: tx.id,
    interaction_id: tx.interaction_id || '',
    entity_id: entityId,
    item_type: 'transaction',
    created_at: tx.created_at || new Date().toISOString(),
    // Entity IDs - aligned with Supabase
    from_entity_id: tx.from_entity_id || '',
    to_entity_id: tx.to_entity_id || null,
    sync_status: 'synced',
    local_status: tx.status || 'completed',
    amount: tx.amount,
    currency_id: tx.currency_id,
    currency_code: tx.currency_code,
    currency_symbol: tx.currency_symbol,
    transaction_type: tx.transaction_type,
    description: tx.description,
    from_wallet_id: tx.from_wallet_id,
    to_wallet_id: tx.to_wallet_id,
    timeline_metadata: tx.metadata ? JSON.stringify(tx.metadata) : null,
  };
};

interface BaseTransactionResult {
  transactions: Transaction[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isOffline: boolean;
  refetch: () => void;
}

/**
 * Local-first fetch wallet transactions with instant cached data display
 * UNIFIED ARCHITECTURE: Uses local_timeline as single source of truth
 * PROFILE-SAFE: Checks for stale profile in setTimeout to prevent 404 errors after profile switch
 *
 * @param entityId - Current user's entity ID
 * @param walletId - Currency-specific wallet ID (for local SQLite query by from_wallet_id/to_wallet_id)
 * @param accountId - Parent account ID (for API call to /transactions/account/{accountId})
 * @param limit - Number of transactions to fetch
 */
const fetchWalletTransactionsLocalFirst = async (entityId: string, walletId: string, accountId: string, limit: number = 4): Promise<Transaction[]> => {
  try {
    logger.debug(`[useWalletTransactions] 🚀 UNIFIED: Starting transaction fetch for wallet: ${walletId} (entityId: ${entityId})`);

    // STEP 1: ALWAYS load from local_timeline first (instant display)
    // UNIFIED: Single source of truth - same table as chat timeline
    const cachedItems = await unifiedTimelineRepository.getTransactionsByWallet(walletId, entityId, limit);
    const cachedTransactions = cachedItems.map(mapTimelineItemToTransaction);
    logger.debug(`[useWalletTransactions] ✅ INSTANT: Loaded ${cachedTransactions.length} transactions from local_timeline`);

    // STEP 2: Return cached data IMMEDIATELY if we have it (local-first behavior)
    if (cachedTransactions.length > 0) {
      logger.debug(`[useWalletTransactions] ⚡ INSTANT: Returning ${cachedTransactions.length} cached transactions immediately`);

      // STEP 3: Background sync (non-blocking)
      // ENTITY-SAFE: Capture entityId at schedule time, check for staleness at execution time
      const capturedEntityId = entityId;
      const capturedWalletId = walletId;
      const capturedAccountId = accountId;
      setTimeout(async () => {
        try {
          // PROFILE SWITCH GUARD: Skip if profile changed or switching in progress
          if (profileContextManager.isProfileStale(capturedEntityId) || profileContextManager.isSwitchingProfile()) {
            logger.debug(`[useWalletTransactions] ⏸️ BACKGROUND SYNC SKIPPED: Entity changed (was: ${capturedEntityId})`);
            return;
          }

          logger.debug(`[useWalletTransactions] 🔄 BACKGROUND SYNC: Fetching fresh data from API (accountId: ${capturedAccountId})`);
          // CRITICAL FIX: Use accountId for API call (not walletId!)
          // API endpoint /transactions/account/{id} expects account_id, not wallet_id
          const result = await walletManager.getTransactionsForAccount(capturedAccountId, limit, 0);
          const apiTransactions = result?.data || [];
          logger.debug(`[useWalletTransactions] ✅ BACKGROUND SYNC: Loaded ${apiTransactions.length} transactions from server`);

          // PROFILE SWITCH GUARD: Check again after API call
          if (profileContextManager.isProfileStale(capturedEntityId) || profileContextManager.isSwitchingProfile()) {
            logger.debug(`[useWalletTransactions] ⏸️ BACKGROUND SYNC SKIPPED: Entity changed during API call`);
            return;
          }

          // UNIFIED: Save to local_timeline (single source of truth)
          if (apiTransactions.length > 0) {
            const timelineItems = apiTransactions.map(tx => mapTransactionToTimelineItem(tx, capturedEntityId));
            // Use batch upsert for efficient storage
            for (const item of timelineItems) {
              await unifiedTimelineRepository.upsertFromServer(item);
            }
            logger.debug(`[useWalletTransactions] ✅ BACKGROUND SYNC: Updated ${apiTransactions.length} transactions in local_timeline`);

            // Update TanStack Query cache with fresh data
            queryClient.setQueryData(queryKeys.transactionsByAccount(capturedEntityId, capturedWalletId, limit), apiTransactions);
          }

        } catch (error) {
          logger.debug(`[useWalletTransactions] ⚠️ BACKGROUND SYNC: Failed (non-critical):`, error instanceof Error ? error.message : String(error));
        }
      }, 150); // 150ms delay for background sync

      return cachedTransactions;
    }

    // STEP 4: No cache - fetch from API (first time only)
    logger.debug(`[useWalletTransactions] 📡 FIRST TIME: No cache found, fetching from API (accountId: ${accountId})`);
    // CRITICAL FIX: Use accountId for API call (not walletId!)
    // API endpoint /transactions/account/{id} expects account_id, not wallet_id
    const result = await walletManager.getTransactionsForAccount(accountId, limit, 0);
    const apiTransactions = result?.data || [];
    logger.debug(`[useWalletTransactions] ✅ FIRST TIME: Loaded ${apiTransactions.length} transactions from server`);

    // UNIFIED: Save to local_timeline (single source of truth)
    if (apiTransactions.length > 0) {
      const timelineItems = apiTransactions.map(tx => mapTransactionToTimelineItem(tx, entityId));
      for (const item of timelineItems) {
        await unifiedTimelineRepository.upsertFromServer(item);
      }
      logger.debug(`[useWalletTransactions] ✅ FIRST TIME: Saved ${apiTransactions.length} transactions to local_timeline`);
    }

    return apiTransactions;

  } catch (error) {
    logger.error(`[useWalletTransactions] ❌ Error in unified fetch:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
};

/**
 * Hook for wallet dashboard - Local-First Architecture
 *
 * Shows cached transactions instantly, syncs in background.
 * Same pattern as useTimeline and useBalances.
 * PROFILE-SAFE: Disabled during profile switch to prevent stale queries
 *
 * @param walletId - Currency-specific wallet ID (for local SQLite query by from_wallet_id/to_wallet_id)
 * @param accountId - Parent account ID (for API call to /transactions/account/{accountId})
 * @param enabled - Whether the query should be enabled
 */
export const useWalletTransactions = (walletId: string, accountId: string, enabled: boolean = true): BaseTransactionResult => {
  const isOffline = !networkService.isOnline();
  const entityId = useCurrentEntityId();
  const { isProfileSwitching } = useAuthContext();

  // PROFILE SWITCH GUARD: Disable query during profile switch
  const shouldExecute = enabled && !!walletId && !!accountId && !!entityId && !isProfileSwitching;

  if (isProfileSwitching) {
    logger.debug(`[useWalletTransactions] ⏸️ SKIPPING: Profile switch in progress`);
  }

  const {
    data: transactions = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.transactionsByAccount(entityId!, walletId, 10),
    queryFn: async (): Promise<Transaction[]> => {
      if (!walletId || !accountId || !entityId) {
        logger.debug('[useWalletTransactions] No walletId, accountId, or entityId provided');
        return [];
      }

      logger.debug(`[useWalletTransactions] 🎯 WALLET: Loading transactions for wallet: ${walletId?.substring(0, 8)}`);
      return fetchWalletTransactionsLocalFirst(entityId, walletId, accountId, 10);
    },
    enabled: shouldExecute,

    // LOCAL-FIRST: SQLite query is instant, so short stale time is fine
    // This ensures fresh data when switching wallets
    staleTime: 30 * 1000, // 30 seconds - wallet-specific data should refresh more often
    gcTime: 10 * 60 * 1000, // 10 minutes cache

    // LOCAL-FIRST: Prefer cached data over network
    networkMode: 'offlineFirst',

    // CRITICAL: Always run query when wallet changes - SQLite is instant anyway
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true, // Always fetch fresh from SQLite when mounting/wallet changes

    // RELIABILITY: Conservative retry strategy
    retry: (failureCount, error: any) => {
      if (!walletId || !accountId) return false;
      if (isOffline) return false;
      if (error?.status >= 400 && error?.status < 500) return false;
      return failureCount < 1;
    },

    // NO placeholderData - each wallet should show its own data, not previous wallet's
    // SQLite query is instant (<10ms), so no need for placeholder
  });
  
  // NOTE: TIMELINE_UPDATED_EVENT listener is centralized in queryClient.ts
  // This follows the Revolut/WhatsApp pattern - single listener, single invalidation
  // See: _app/tanstack-query/queryClient.ts setupTimelineEventListener()

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
 * Local-first fetch transaction list with instant cached data display
 * UNIFIED ARCHITECTURE: Uses local_timeline as single source of truth
 * PROFILE-SAFE: Checks for stale profile in setTimeout to prevent 404 errors after profile switch
 *
 * @param entityId - Current user's entity ID
 * @param walletId - Currency-specific wallet ID (for local SQLite query by from_wallet_id/to_wallet_id)
 * @param accountId - Parent account ID (for API call to /transactions/account/{accountId})
 * @param limit - Number of transactions to fetch
 * @param offset - Offset for pagination
 */
const fetchTransactionListLocalFirst = async (
  entityId: string,
  walletId: string,
  accountId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ data: Transaction[]; hasMore: boolean; isCached?: boolean }> => {
  try {
    logger.debug(`[useTransactionList] 🚀 UNIFIED: Starting transaction list fetch for wallet: ${walletId}`);

    // STEP 1: ALWAYS load from local_timeline first (instant display)
    // UNIFIED: Single source of truth - same table as chat timeline
    const cachedItems = await unifiedTimelineRepository.getTransactionsByWallet(walletId, entityId, limit);
    const cachedTransactions = cachedItems.map(mapTimelineItemToTransaction);
    logger.debug(`[useTransactionList] ✅ INSTANT: Loaded ${cachedTransactions.length} transactions from local_timeline`);

    // STEP 2: Return cached data IMMEDIATELY if we have it (local-first behavior)
    if (cachedTransactions.length > 0) {
      logger.debug(`[useTransactionList] ⚡ INSTANT: Returning ${cachedTransactions.length} cached transactions immediately`);

      // STEP 3: Background sync (non-blocking)
      const capturedEntityId = entityId;
      const capturedWalletId = walletId;
      const capturedAccountId = accountId;
      setTimeout(async () => {
        try {
          // PROFILE SWITCH GUARD: Skip if entity changed
          if (profileContextManager.isProfileStale(capturedEntityId) || profileContextManager.isSwitchingProfile()) {
            logger.debug(`[useTransactionList] ⏸️ BACKGROUND SYNC SKIPPED: Entity changed`);
            return;
          }

          logger.debug(`[useTransactionList] 🔄 BACKGROUND SYNC: Fetching fresh data from API (accountId: ${capturedAccountId})`);
          // CRITICAL FIX: Use accountId for API call (not walletId!)
          const result = await walletManager.getTransactionsForAccount(capturedAccountId, limit, offset);
          const apiTransactions = result?.data || [];
          logger.debug(`[useTransactionList] ✅ BACKGROUND SYNC: Loaded ${apiTransactions.length} transactions`);

          // PROFILE SWITCH GUARD: Check again after API call
          if (profileContextManager.isProfileStale(capturedEntityId) || profileContextManager.isSwitchingProfile()) {
            return;
          }

          // UNIFIED: Save to local_timeline (single source of truth)
          if (apiTransactions.length > 0) {
            const timelineItems = apiTransactions.map(tx => mapTransactionToTimelineItem(tx, capturedEntityId));
            for (const item of timelineItems) {
              await unifiedTimelineRepository.upsertFromServer(item);
            }
            // Update TanStack Query cache
            queryClient.setQueryData(
              [...queryKeys.transactionsByAccount(capturedEntityId, capturedWalletId, limit), 'offset', offset],
              { data: apiTransactions, hasMore: apiTransactions.length === limit }
            );
          }
        } catch (error) {
          logger.debug(`[useTransactionList] ⚠️ BACKGROUND SYNC: Failed (non-critical)`);
        }
      }, 150);

      return { data: cachedTransactions, hasMore: cachedTransactions.length === limit, isCached: true };
    }

    // STEP 4: No cache - fetch from API (first time only)
    logger.debug(`[useTransactionList] 📡 FIRST TIME: No cache found, fetching from API (accountId: ${accountId})`);
    // CRITICAL FIX: Use accountId for API call (not walletId!)
    const result = await walletManager.getTransactionsForAccount(accountId, limit, offset);
    const apiTransactions = result?.data || [];
    const hasMore = result?.pagination?.hasMore ?? apiTransactions.length === limit;

    // UNIFIED: Save to local_timeline (single source of truth)
    if (apiTransactions.length > 0) {
      const timelineItems = apiTransactions.map(tx => mapTransactionToTimelineItem(tx, entityId));
      for (const item of timelineItems) {
        await unifiedTimelineRepository.upsertFromServer(item);
      }
    }

    return { data: apiTransactions, hasMore };
  } catch (error) {
    logger.error(`[useTransactionList] ❌ Error:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
};

/**
 * Hook for transaction list page - Local-First Architecture with Pagination
 *
 * Shows cached transactions instantly, syncs in background.
 * Same pattern as useWalletTransactions.
 * PROFILE-SAFE: Disabled during profile switch to prevent stale queries
 * PAGINATION: Implements loadMore with accumulated results
 *
 * @param walletId - Currency-specific wallet ID (for local SQLite query by from_wallet_id/to_wallet_id)
 * @param accountId - Parent account ID (for API call to /transactions/account/{accountId})
 * @param pageSize - Number of transactions per page (default 50)
 * @param enabled - Whether the query should be enabled
 */
export const useTransactionList = (
  walletId: string,
  accountId: string,
  pageSize: number = 50,
  enabled: boolean = true
): BaseTransactionResult & { hasMore: boolean; loadMore: () => void; isLoadingMore: boolean } => {
  const isOffline = !networkService.isOnline();
  const entityId = useCurrentEntityId();
  const { isProfileSwitching } = useAuthContext();

  // Pagination state
  const [currentOffset, setCurrentOffset] = React.useState(0);
  const [accumulatedTransactions, setAccumulatedTransactions] = React.useState<Transaction[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  // Reset pagination when wallet changes
  React.useEffect(() => {
    setCurrentOffset(0);
    setAccumulatedTransactions([]);
    setHasMore(true);
  }, [walletId, entityId]);

  // PROFILE SWITCH GUARD: Disable query during profile switch
  const shouldExecute = enabled && !!walletId && !!accountId && !!entityId && !isProfileSwitching;

  const {
    data: result,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [...queryKeys.transactionsByAccount(entityId!, walletId, pageSize), 'offset', currentOffset] as const,
    queryFn: async (): Promise<{ data: Transaction[]; hasMore: boolean }> => {
      if (!walletId || !accountId || !entityId) {
        logger.debug('[useTransactionList] No walletId, accountId, or entityId provided');
        return { data: [], hasMore: false };
      }

      logger.debug(`[useTransactionList] 📋 LIST: Loading ${pageSize} transactions (offset: ${currentOffset}) for wallet: ${walletId?.substring(0, 8)}`);
      return fetchTransactionListLocalFirst(entityId, walletId, accountId, pageSize, currentOffset);
    },
    enabled: shouldExecute,

    // LOCAL-FIRST: SQLite query is instant, so short stale time is fine
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes cache

    // LOCAL-FIRST: Prefer cached data over network
    networkMode: 'offlineFirst',

    // CRITICAL: Always run query when wallet changes - SQLite is instant
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true, // Always fetch fresh from SQLite

    // RELIABILITY: Conservative retry strategy
    retry: (failureCount) => !isOffline && failureCount < 1,

    // NO placeholderData - each wallet should show its own data
  });

  // Accumulate transactions when new data arrives
  React.useEffect(() => {
    if (result?.data) {
      if (currentOffset === 0) {
        // First page - replace all
        setAccumulatedTransactions(result.data);
      } else {
        // Subsequent pages - append (deduplicate by id)
        setAccumulatedTransactions(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const newTransactions = result.data.filter(t => !existingIds.has(t.id));
          return [...prev, ...newTransactions];
        });
      }
      setHasMore(result.hasMore);
      setIsLoadingMore(false);
    }
  }, [result, currentOffset]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || isLoading) {
      logger.debug('[useTransactionList] loadMore skipped (no more data or already loading)');
      return;
    }

    logger.debug(`[useTransactionList] 📄 Loading more transactions (current offset: ${currentOffset})`);
    setIsLoadingMore(true);
    setCurrentOffset(prev => prev + pageSize);
  }, [hasMore, isLoadingMore, isLoading, currentOffset, pageSize]);

  // NOTE: TIMELINE_UPDATED_EVENT listener is centralized in queryClient.ts
  // This follows the Revolut/WhatsApp pattern - single listener, single invalidation
  // See: _app/tanstack-query/queryClient.ts setupTimelineEventListener()

  return {
    transactions: accumulatedTransactions,
    hasMore,
    isLoading: isLoading && currentOffset === 0, // Only show loading on first page
    isLoadingMore,
    isError,
    error: error as Error | null,
    isOffline,
    refetch: () => {
      // Reset pagination on manual refetch
      setCurrentOffset(0);
      setAccumulatedTransactions([]);
      setHasMore(true);
      refetch();
    },
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
 * PROFILE-SAFE: Disabled during profile switch to prevent stale queries
 */
export const useRecentTransactions = (
  entityIdParam: string,
  limit: number = 20,
  enabled: boolean = true
): BaseTransactionResult => {
  const isOffline = !networkService.isOnline();
  const entityId = useCurrentEntityId();
  const { isProfileSwitching } = useAuthContext();

  // PROFILE SWITCH GUARD: Disable query during profile switch
  const shouldExecute = enabled && !!entityIdParam && !!entityId && !isProfileSwitching;

  const {
    data: transactions = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.recentTransactions(entityId!, limit),
    queryFn: async (): Promise<Transaction[]> => {
      logger.debug(`[useRecentTransactions] 📊 GENERAL: Loading ${limit} recent transactions (entityId: ${entityId})`);

      try {
        const recentTransactions = await walletManager.getRecentTransactions(limit);

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
    enabled: shouldExecute,
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
// NOTE: This hook requires BOTH walletId and accountId now
export const useTransactionsByAccount = (walletId: string, accountId: string, options?: { limit?: number; enabled?: boolean }) => {
  logger.warn('[useTransactionsByAccount] DEPRECATED: Use useWalletTransactions or useTransactionList instead');
  return useWalletTransactions(walletId, accountId, options?.enabled);
};

export default useRecentTransactions; 