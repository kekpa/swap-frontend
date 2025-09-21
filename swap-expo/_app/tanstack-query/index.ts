/**
 * TanStack Query Exports
 * 
 * Centralized exports for all TanStack Query functionality.
 * Provides a complete, production-ready query system for the Swap app.
 */

// Core query client and setup
export {
  queryClient,
  asyncStoragePersister,
  initializeCachePersistence,
  setupAppStateRefetch,
  setupNetworkRefetch,
  initializeQueryClient,
  cleanupQueryClient,
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
export * from './sync';

// Optimistic updates exports
export * from './optimistic';

// Configuration exports
export * from './config';

// Monitoring exports
export * from './monitoring';

// Prefetch exports
export * from './prefetch';

// API layer exports
export * from './api';

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
 * 3. Use mutation hooks:
 * ```tsx
 * import { useTransferMoney, useSendMessage } from ../tanstack-query/mutations';
 * 
 * const transferMutation = useTransferMoney();
 * const sendMessageMutation = useSendMessage();
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