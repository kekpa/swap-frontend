import { useState, useCallback, useRef } from 'react';

const REFRESH_TIMEOUT_MS = 10000;

/**
 * Industry-standard hook for pull-to-refresh with TanStack Query
 *
 * Source: https://github.com/TanStack/query/issues/2380
 *
 * This hook decouples RefreshControl's `refreshing` state from TanStack Query's
 * internal `isFetching` state to prevent flickering and freezing issues.
 *
 * Why this pattern:
 * - Using `isFetching` directly causes RefreshControl flickering
 * - Global shared state causes cross-screen contamination
 * - This local state pattern is the official TanStack Query community solution
 *
 * Features:
 * - Per-screen local state (no cross-screen contamination)
 * - Timeout protection (prevents infinite spinner)
 * - Double-refresh guard
 * - Error resilience with try/catch/finally
 * - Stale closure prevention with useRef
 *
 * @example
 * ```typescript
 * const { refetch } = useMyQuery();
 * const { refreshing, onRefresh } = useRefreshByUser(refetch);
 *
 * <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
 * ```
 */
export function useRefreshByUser(
  refetch: () => Promise<any>,
  options?: { timeout?: number }
) {
  const [isRefetchingByUser, setIsRefetchingByUser] = useState(false);
  const timeoutMs = options?.timeout ?? REFRESH_TIMEOUT_MS;

  // Use ref to prevent stale closures when refetch function changes
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  const refetchByUser = useCallback(async () => {
    // Guard against double-refresh
    if (isRefetchingByUser) {
      console.log('[useRefreshByUser] Already refreshing, skipping');
      return;
    }

    console.log('[useRefreshByUser] Starting refresh');
    setIsRefetchingByUser(true);

    try {
      // Timeout protection - prevents infinite spinner if API hangs
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Refresh timeout')), timeoutMs)
      );

      await Promise.race([refetchRef.current(), timeoutPromise]);
      console.log('[useRefreshByUser] Refresh completed');
    } catch (error) {
      // Log but don't throw - RefreshControl should still release
      console.error('[useRefreshByUser] Refresh failed:', error);
    } finally {
      // ALWAYS reset - this is the critical fix for spinner freeze
      console.log('[useRefreshByUser] Setting refreshing=false');
      setIsRefetchingByUser(false);
    }
  }, [isRefetchingByUser, timeoutMs]);

  return {
    // Core state
    isRefetchingByUser,
    refetchByUser,
    // Convenient aliases for RefreshControl props
    refreshing: isRefetchingByUser,
    onRefresh: refetchByUser,
  };
}

/**
 * Hook for multiple refetch functions (e.g., wallet screen with balances + transactions)
 *
 * @example
 * ```typescript
 * const { refreshing, onRefresh } = useRefreshByUserMultiple([
 *   refreshBalances,
 *   refetchTransactions,
 * ]);
 * ```
 */
export function useRefreshByUserMultiple(
  refetchFns: Array<() => Promise<any>>,
  options?: { timeout?: number }
) {
  const combinedRefetch = useCallback(async () => {
    await Promise.all(refetchFns.map(fn => fn().catch(err => {
      console.error('[useRefreshByUserMultiple] One refetch failed:', err);
    })));
  }, [refetchFns]);

  return useRefreshByUser(combinedRefetch, options);
}
