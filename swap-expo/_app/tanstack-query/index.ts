/**
 * TanStack Query Exports
 * 
 * Centralized exports for all TanStack Query functionality.
 * Provides a complete, production-ready query system for the Swap app.
 */

// Core query client and setup
export {
  queryClient,
  initializeQueryClient,
  cleanupQueryClient,
  getQueryClient,
  invalidateQueries,
  prefetchQuery,
} from './queryClient';

// Query provider
export { QueryProvider } from './QueryProvider';

// Query keys
export { queryKeys, validateQueryKey } from './queryKeys';

// Hooks exports (moved to hooks-data folder)
export * from '../hooks-data';

// Mutation exports  
export * from './mutations';

// Error handling exports
export * from './errors';

// Background sync exports
export * from './sync/useBackgroundSync';

// Configuration exports
export * from './config';

// Monitoring exports
export * from './monitoring';

// Prefetch exports
export * from './prefetch';

/**
 * Quick setup guide:
 * 
 * 1. Initialize the query client:
 * ```tsx
 * import { initializeQueryClient, QueryProvider } from './query';
 * 
 * // In your App.tsx
 * useEffect(() => {
 *   initializeQueryClient();
 * }, []);
 * 
 * return (
 *   <QueryProvider>
 *     <App />
 *   </QueryProvider>
 * );
 * ```
 * 
 * 2. Use query hooks:
 * ```tsx
 * import { useBalance, useRecentTransactions } from ../tanstack-query/hooks';
 * 
 * const { data: balance } = useBalance(entityId);
 * const { data: transactions } = useRecentTransactions(entityId, 20);
 * ```
 * 
 * 3. Use local-first services for messages/transactions:
 * ```tsx
 * import { unifiedTimelineService } from '../services';
 *
 * // Send message (local-first - instant UI update)
 * await unifiedTimelineService.sendMessage({ interactionId, content, ... });
 *
 * // Send transaction (local-first - instant UI update)
 * await unifiedTimelineService.sendTransaction({ interactionId, amount, ... });
 * ```
 * 
 * 4. Use prefetching:
 * ```tsx
 * import { usePrefetchStrategy } from ../tanstack-query/prefetch';
 * 
 * const { prefetchForBalance } = usePrefetchStrategy({ entityId });
 * ```
 * 
 * 5. Monitor performance:
 * ```tsx
 * import { useRequestMonitoring, usePrefetchMonitoring } from ../tanstack-query/monitoring';
 * 
 * useRequestMonitoring({ enablePeriodicReporting: true });
 * const { getPrefetchMetrics } = usePrefetchMonitoring();
 * ```
 */