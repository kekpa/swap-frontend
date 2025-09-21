/**
 * Prefetching Strategy
 * 
 * Implements intelligent prefetching for common user flows to improve perceived performance.
 * Uses predictive patterns based on user behavior and navigation flows.
 */

import { QueryClient } from '@tanstack/react-query';
import { logger } from '../../utils/logger';
import { queryKeys } from '../queryKeys';
import { networkService } from '../../services/NetworkService';

// Prefetch priority levels
export type PrefetchPriority = 'critical' | 'high' | 'medium' | 'low';

// User flow patterns for predictive prefetching
export type UserFlow = 
  | 'app_launch'           // App startup prefetching
  | 'balance_view'         // User viewing balance (likely to check transactions)
  | 'transaction_list'     // User viewing transactions (likely to view details)
  | 'message_thread'       // User in messaging (likely to send messages)
  | 'profile_view'         // User viewing profile (likely to edit)
  | 'payment_flow'         // User initiating payment (critical data needed)
  | 'background_refresh';  // Background app state prefetching

// Prefetch configuration
interface PrefetchConfig {
  priority: PrefetchPriority;
  staleTime?: number;
  gcTime?: number;
  enabled: boolean;
  networkCondition?: 'any' | 'wifi_only' | 'fast_only';
  delayMs?: number; // Delay before prefetching
}

// Default prefetch configurations for different scenarios
const DEFAULT_PREFETCH_CONFIGS: Record<PrefetchPriority, PrefetchConfig> = {
  critical: {
    priority: 'critical',
    staleTime: 0, // Always fetch fresh data
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: true,
    networkCondition: 'any',
    delayMs: 0,
  },
  high: {
    priority: 'high',
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: true,
    networkCondition: 'any',
    delayMs: 100,
  },
  medium: {
    priority: 'medium',
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    enabled: true,
    networkCondition: 'fast_only',
    delayMs: 500,
  },
  low: {
    priority: 'low',
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled: true,
    networkCondition: 'wifi_only',
    delayMs: 2000,
  },
};

// Prefetch item definition
interface PrefetchItem {
  queryKey: unknown[];
  queryFn: () => Promise<any>;
  config: PrefetchConfig;
  userFlow: UserFlow;
  description: string;
}

/**
 * Main prefetch strategy class
 */
export class PrefetchStrategy {
  private queryClient: QueryClient;
  private prefetchQueue: PrefetchItem[] = [];
  private isProcessing = false;
  private abortController: AbortController | null = null;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Add item to prefetch queue
   */
  queue(item: PrefetchItem): void {
    // Check if already queued
    const exists = this.prefetchQueue.some(
      existing => JSON.stringify(existing.queryKey) === JSON.stringify(item.queryKey)
    );

    if (!exists) {
      this.prefetchQueue.push(item);
      logger.debug('[PrefetchStrategy] Queued prefetch:', {
        queryKey: item.queryKey,
        priority: item.config.priority,
        userFlow: item.userFlow,
        description: item.description,
      });
    }

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process prefetch queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.prefetchQueue.length === 0) return;

    this.isProcessing = true;
    this.abortController = new AbortController();

    // Sort by priority (critical first, then high, medium, low)
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    this.prefetchQueue.sort((a, b) => 
      priorityOrder[a.config.priority] - priorityOrder[b.config.priority]
    );

    logger.debug('[PrefetchStrategy] Processing prefetch queue:', {
      items: this.prefetchQueue.length,
      priorities: this.prefetchQueue.map(item => item.config.priority),
    });

    while (this.prefetchQueue.length > 0 && !this.abortController.signal.aborted) {
      const item = this.prefetchQueue.shift()!;
      
      try {
        await this.executePrefetch(item);
      } catch (error) {
        logger.error('[PrefetchStrategy] Prefetch failed:', {
          queryKey: item.queryKey,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.isProcessing = false;
    this.abortController = null;
  }

  /**
   * Execute individual prefetch
   */
  private async executePrefetch(item: PrefetchItem): Promise<void> {
    const { queryKey, queryFn, config, userFlow, description } = item;

    // Check if prefetch is enabled
    if (!config.enabled) {
      logger.debug('[PrefetchStrategy] Prefetch disabled for:', description);
      return;
    }

    // Check network conditions
    if (!this.shouldPrefetchBasedOnNetwork(config.networkCondition)) {
      logger.debug('[PrefetchStrategy] Network conditions not suitable for prefetch:', {
        description,
        requiredCondition: config.networkCondition,
        currentCondition: this.getCurrentNetworkCondition(),
      });
      return;
    }

    // Check if data already exists and is fresh
    const existingData = this.queryClient.getQueryData(queryKey);
    const queryState = this.queryClient.getQueryState(queryKey);
    
    if (existingData && queryState && 
        Date.now() - queryState.dataUpdatedAt < (config.staleTime || 0)) {
      logger.debug('[PrefetchStrategy] Skipping prefetch - data is fresh:', {
        description,
        dataAge: Date.now() - queryState.dataUpdatedAt,
        staleTime: config.staleTime,
      });
      return;
    }

    // Add delay if specified
    if (config.delayMs && config.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, config.delayMs));
    }

    // Check if still relevant after delay
    if (this.abortController?.signal.aborted) {
      return;
    }

    logger.debug('[PrefetchStrategy] Executing prefetch:', {
      description,
      queryKey,
      priority: config.priority,
      userFlow,
    });

    try {
      await this.queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: config.staleTime,
        gcTime: config.gcTime,
      });

      logger.debug('[PrefetchStrategy] ✅ Prefetch completed:', description);
    } catch (error) {
      logger.error('[PrefetchStrategy] ❌ Prefetch failed:', {
        description,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Check if prefetch should proceed based on network conditions
   */
  private shouldPrefetchBasedOnNetwork(condition?: 'any' | 'wifi_only' | 'fast_only'): boolean {
    if (!networkService.isOnline) return false;
    
    const currentCondition = this.getCurrentNetworkCondition();
    
    switch (condition) {
      case 'wifi_only':
        return currentCondition === 'wifi';
      case 'fast_only':
        return currentCondition === 'wifi' || currentCondition === 'fast_cellular';
      case 'any':
      default:
        return true;
    }
  }

  /**
   * Get current network condition
   */
  private getCurrentNetworkCondition(): 'wifi' | 'fast_cellular' | 'slow_cellular' | 'offline' {
    if (!networkService.isOnline) return 'offline';
    
    // This would need to be implemented based on your network service
    // For now, assume good conditions
    return 'wifi';
  }

  /**
   * Cancel all pending prefetches
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.prefetchQueue.length = 0;
    this.isProcessing = false;
    
    logger.debug('[PrefetchStrategy] All prefetches cancelled');
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.prefetchQueue.length,
      queueItems: this.prefetchQueue.map(item => ({
        description: item.description,
        priority: item.config.priority,
        userFlow: item.userFlow,
      })),
    };
  }
}

/**
 * Predefined prefetch strategies for common user flows
 */
export const createPrefetchStrategies = (queryClient: QueryClient, entityId?: string) => {
  const strategy = new PrefetchStrategy(queryClient);

  return {
    strategy,

    // App launch prefetching
    appLaunch: () => {
      if (!entityId) return;

      strategy.queue({
        queryKey: queryKeys.balancesByEntity(entityId),
        queryFn: () => import('../../_api/apiClient').then(api => 
          api.default.get(`/wallets/entity/${entityId}`).then(response => response.data)
        ),
        config: DEFAULT_PREFETCH_CONFIGS.high,
        userFlow: 'app_launch',
        description: 'User balance on app launch',
      });

      strategy.queue({
        queryKey: queryKeys.recentTransactions(entityId, 10),
        queryFn: () => import('../../_api/apiClient').then(api => 
          api.default.get(`/transactions/recent/${entityId}?limit=10`).then(response => response.data)
        ),
        config: DEFAULT_PREFETCH_CONFIGS.medium,
        userFlow: 'app_launch',
        description: 'Recent transactions on app launch',
      });

      strategy.queue({
        queryKey: queryKeys.interactionsByEntity(entityId),
        queryFn: () => Promise.resolve([]), // Replace with actual API call
        config: DEFAULT_PREFETCH_CONFIGS.medium,
        userFlow: 'app_launch',
        description: 'User interactions on app launch',
      });
    },

    // Balance view prefetching
    balanceView: () => {
      if (!entityId) return;

      strategy.queue({
        queryKey: queryKeys.recentTransactions(entityId, 20),
        queryFn: () => import('../../_api/apiClient').then(api => 
          api.default.get(`/transactions/recent/${entityId}?limit=20`).then(response => response.data)
        ),
        config: DEFAULT_PREFETCH_CONFIGS.high,
        userFlow: 'balance_view',
        description: 'Extended transaction history after balance view',
      });
    },

    // Payment flow prefetching
    paymentFlow: () => {
      if (!entityId) return;

      strategy.queue({
        queryKey: queryKeys.balancesByEntity(entityId),
        queryFn: () => import('../../_api/apiClient').then(api => 
          api.default.get(`/wallets/entity/${entityId}`).then(response => response.data)
        ),
        config: DEFAULT_PREFETCH_CONFIGS.critical,
        userFlow: 'payment_flow',
        description: 'Fresh balance data for payment flow',
      });
    },

    // Message thread prefetching
    messageThread: (interactionId: string) => {
      strategy.queue({
        queryKey: queryKeys.timeline(interactionId),
        queryFn: () => Promise.resolve([]), // Replace with actual API call
        config: DEFAULT_PREFETCH_CONFIGS.high,
        userFlow: 'message_thread',
        description: 'Message timeline for active conversation',
      });
    },

    // Background refresh prefetching
    backgroundRefresh: () => {
      if (!entityId) return;

      strategy.queue({
        queryKey: queryKeys.balancesByEntity(entityId),
        queryFn: () => import('../../_api/apiClient').then(api => 
          api.default.get(`/wallets/entity/${entityId}`).then(response => response.data)
        ),
        config: DEFAULT_PREFETCH_CONFIGS.medium,
        userFlow: 'background_refresh',
        description: 'Background balance refresh',
      });
    },
  };
};

export default PrefetchStrategy;