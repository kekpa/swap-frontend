/**
 * usePrefetchStrategy Hook
 * 
 * React hook for implementing intelligent prefetching based on user flows.
 * Provides easy-to-use prefetching patterns for common navigation scenarios.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppState, AppStateStatus } from 'react-native';
import { createPrefetchStrategies, type UserFlow } from './prefetchStrategy';
import { logger } from '../../utils/logger';

interface UsePrefetchStrategyOptions {
  entityId?: string;
  enableAppLaunchPrefetch?: boolean;
  enableBackgroundPrefetch?: boolean;
  enableAutomaticPrefetch?: boolean;
}

/**
 * Main prefetch strategy hook
 */
export const usePrefetchStrategy = (options: UsePrefetchStrategyOptions = {}) => {
  const queryClient = useQueryClient();
  const {
    entityId,
    enableAppLaunchPrefetch = true,
    enableBackgroundPrefetch = true,
    enableAutomaticPrefetch = true,
  } = options;

  const strategiesRef = useRef(createPrefetchStrategies(queryClient, entityId));
  const hasLaunchedRef = useRef(false);

  // Update strategies when entityId changes
  useEffect(() => {
    strategiesRef.current = createPrefetchStrategies(queryClient, entityId);
  }, [queryClient, entityId]);

  // App launch prefetching
  useEffect(() => {
    if (enableAppLaunchPrefetch && !hasLaunchedRef.current && entityId) {
      logger.info('[usePrefetchStrategy] Executing app launch prefetch...');
      strategiesRef.current.appLaunch();
      hasLaunchedRef.current = true;
    }
  }, [enableAppLaunchPrefetch, entityId]);

  // Background/foreground prefetching
  useEffect(() => {
    if (!enableBackgroundPrefetch) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && entityId) {
        logger.debug('[usePrefetchStrategy] App became active - executing background refresh prefetch');
        strategiesRef.current.backgroundRefresh();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [enableBackgroundPrefetch, entityId]);

  // Manual prefetch functions
  const prefetchForUserFlow = useCallback((userFlow: UserFlow, additionalParams?: any) => {
    const strategies = strategiesRef.current;
    
    switch (userFlow) {
      case 'app_launch':
        strategies.appLaunch();
        break;
      case 'balance_view':
        strategies.balanceView();
        break;
      case 'payment_flow':
        strategies.paymentFlow();
        break;
      case 'message_thread':
        if (additionalParams?.interactionId) {
          strategies.messageThread(additionalParams.interactionId);
        }
        break;
      case 'background_refresh':
        strategies.backgroundRefresh();
        break;
      default:
        logger.warn('[usePrefetchStrategy] Unknown user flow:', userFlow);
    }
    
    logger.debug('[usePrefetchStrategy] Manual prefetch triggered', 'data', {
      userFlow,
      additionalParams,
    });
  }, []);

  const getStatus = useCallback(() => {
    return strategiesRef.current.strategy.getStatus();
  }, []);

  const cancelPrefetches = useCallback(() => {
    strategiesRef.current.strategy.cancel();
    logger.debug('[usePrefetchStrategy] All prefetches cancelled');
  }, []);

  return {
    prefetchForUserFlow,
    getStatus,
    cancelPrefetches,
    // Convenient shorthand methods
    prefetchForBalance: () => prefetchForUserFlow('balance_view'),
    prefetchForPayment: () => prefetchForUserFlow('payment_flow'),
    prefetchForMessage: (interactionId: string) => 
      prefetchForUserFlow('message_thread', { interactionId }),
    prefetchBackground: () => prefetchForUserFlow('background_refresh'),
  };
};

/**
 * Hook for automatic prefetching based on navigation patterns
 */
export const useAutomaticPrefetch = (entityId?: string) => {
  const { prefetchForUserFlow } = usePrefetchStrategy({ 
    entityId,
    enableAutomaticPrefetch: true,
  });

  // Navigation-based prefetching
  const onNavigateToBalance = useCallback(() => {
    prefetchForUserFlow('balance_view');
  }, [prefetchForUserFlow]);

  const onNavigateToPayment = useCallback(() => {
    prefetchForUserFlow('payment_flow');
  }, [prefetchForUserFlow]);

  const onNavigateToMessage = useCallback((interactionId: string) => {
    prefetchForUserFlow('message_thread', { interactionId });
  }, [prefetchForUserFlow]);

  return {
    onNavigateToBalance,
    onNavigateToPayment,
    onNavigateToMessage,
  };
};

/**
 * Hook for monitoring prefetch performance
 */
export const usePrefetchMonitoring = () => {
  const queryClient = useQueryClient();
  const metricsRef = useRef({
    prefetchCount: 0,
    prefetchHits: 0, // Number of times prefetched data was used
    prefetchMisses: 0, // Number of times data had to be fetched despite prefetch
  });

  // Monitor query cache to track prefetch effectiveness
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated') {
        const { query } = event;
        
        // Track if a query was served from cache (prefetch hit)
        if (query.state.status === 'success' && query.state.fetchStatus === 'idle') {
          const wasServedFromCache = query.state.dataUpdatedAt < Date.now() - 1000; // Rough heuristic
          
          if (wasServedFromCache) {
            metricsRef.current.prefetchHits++;
          } else {
            metricsRef.current.prefetchMisses++;
          }
        }
      }
    });

    return unsubscribe;
  }, [queryClient]);

  const getPrefetchMetrics = useCallback(() => {
    const metrics = metricsRef.current;
    const total = metrics.prefetchHits + metrics.prefetchMisses;
    const hitRate = total > 0 ? (metrics.prefetchHits / total) * 100 : 0;

    return {
      ...metrics,
      hitRate: `${hitRate.toFixed(1)}%`,
      total,
    };
  }, []);

  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      prefetchCount: 0,
      prefetchHits: 0,
      prefetchMisses: 0,
    };
  }, []);

  return {
    getPrefetchMetrics,
    resetMetrics,
  };
};

export default usePrefetchStrategy;