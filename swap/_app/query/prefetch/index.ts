/**
 * Prefetch Strategy Exports
 * 
 * Centralized exports for intelligent prefetching functionality.
 */

// Core prefetch strategy
export {
  PrefetchStrategy,
  createPrefetchStrategies,
  type PrefetchPriority,
  type UserFlow,
} from './prefetchStrategy';

// Prefetch hooks
export {
  usePrefetchStrategy,
  useAutomaticPrefetch,
  usePrefetchMonitoring,
} from './usePrefetchStrategy';

/**
 * Quick setup for common prefetch patterns:
 * 
 * ```tsx
 * // Basic prefetch setup
 * const { prefetchForBalance, prefetchForPayment } = usePrefetchStrategy({
 *   entityId: 'user123',
 * });
 * 
 * // Automatic navigation-based prefetching
 * const { onNavigateToBalance } = useAutomaticPrefetch('user123');
 * 
 * // Monitor prefetch effectiveness
 * const { getPrefetchMetrics } = usePrefetchMonitoring();
 * ```
 */