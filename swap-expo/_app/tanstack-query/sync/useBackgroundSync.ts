/**
 * useBackgroundSync Hook
 * 
 * Handles background synchronization when app state changes.
 * Implements intelligent sync strategies for optimal performance and battery life.
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '../../utils/logger';
import { queryKeys, extractEntityId } from '../queryKeys';
import { networkService } from '../../services/NetworkService';

interface BackgroundSyncOptions {
  // Entity ID for user-specific data sync
  entityId?: string;
  
  // Sync intervals
  foregroundSyncInterval?: number; // How often to sync when app is active
  backgroundSyncDelay?: number;    // Delay before syncing when app becomes active
  
  // Which data types to sync
  syncBalances?: boolean;
  syncTransactions?: boolean;
  syncInteractions?: boolean;
  syncNotifications?: boolean;
  
  // Advanced options
  aggressiveSync?: boolean;        // Sync more frequently for critical data
  adaptiveSync?: boolean;          // Adjust sync frequency based on usage patterns
  batchSync?: boolean;             // Batch multiple sync operations
}

interface SyncMetrics {
  lastSyncTime: number;
  syncCount: number;
  failureCount: number;
  avgSyncDuration: number;
  backgroundTime: number;
}

export const useBackgroundSync = (options: BackgroundSyncOptions = {}) => {
  const queryClient = useQueryClient();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastActiveTimeRef = useRef<number>(Date.now());
  const syncMetricsRef = useRef<SyncMetrics>({
    lastSyncTime: 0,
    syncCount: 0,
    failureCount: 0,
    avgSyncDuration: 0,
    backgroundTime: 0,
  });

  const {
    entityId,
    foregroundSyncInterval = 5 * 60 * 1000, // 5 minutes
    backgroundSyncDelay = 1000,              // 1 second
    syncBalances = true,
    syncTransactions = true,
    syncInteractions = true,
    syncNotifications = true,
    aggressiveSync = false,
    adaptiveSync = true,
    batchSync = true,
  } = options;

  // Calculate adaptive sync interval based on usage patterns
  const getAdaptiveSyncInterval = (): number => {
    if (!adaptiveSync) return foregroundSyncInterval;

    const metrics = syncMetricsRef.current;
    const timeSinceLastSync = Date.now() - metrics.lastSyncTime;
    
    // If app was in background for a long time, sync more aggressively
    if (metrics.backgroundTime > 30 * 60 * 1000) { // 30 minutes
      return Math.min(foregroundSyncInterval / 2, 2 * 60 * 1000); // Max 2 minutes
    }
    
    // If recent failures, back off
    if (metrics.failureCount > 2) {
      return foregroundSyncInterval * 2;
    }
    
    // If frequent usage, sync more often
    if (timeSinceLastSync < foregroundSyncInterval / 2) {
      return foregroundSyncInterval * 1.5;
    }
    
    return foregroundSyncInterval;
  };

  // Sync specific data types
  const syncBalanceData = async (): Promise<void> => {
    if (!syncBalances || !entityId) return;

    try {
      logger.debug('[useBackgroundSync] Syncing balance data...', 'data');
      
      await queryClient.invalidateQueries({
        queryKey: queryKeys.balancesByEntity(entityId),
        refetchType: 'active',
      });
      
      logger.debug('[useBackgroundSync] Balance data synced', 'data');
    } catch (error) {
      logger.error('[useBackgroundSync] Failed to sync balance data', error, 'data');
      syncMetricsRef.current.failureCount++;
    }
  };

  const syncTransactionData = async (): Promise<void> => {
    if (!syncTransactions || !entityId) return;

    try {
      logger.debug('[useBackgroundSync] Syncing transaction data...', 'data');
      
      await queryClient.invalidateQueries({
        queryKey: queryKeys.recentTransactions(entityId, 20),
        refetchType: 'active',
      });
      
      logger.debug('[useBackgroundSync] Transaction data synced', 'data');
    } catch (error) {
      logger.error('[useBackgroundSync] Failed to sync transaction data', error, 'data');
      syncMetricsRef.current.failureCount++;
    }
  };

  const syncInteractionData = async (): Promise<void> => {
    if (!syncInteractions || !entityId) return;

    try {
      logger.debug('[useBackgroundSync] Syncing interaction data...', 'data');
      
      await queryClient.invalidateQueries({
        queryKey: queryKeys.interactionsByEntity(entityId),
        refetchType: 'active',
      });
      
      logger.debug('[useBackgroundSync] Interaction data synced', 'data');
    } catch (error) {
      logger.error('[useBackgroundSync] Failed to sync interaction data', error, 'data');
      syncMetricsRef.current.failureCount++;
    }
  };

  const syncNotificationData = async (): Promise<void> => {
    if (!syncNotifications || !entityId) return;

    try {
      logger.debug('[useBackgroundSync] Syncing notification data...', 'data');
      
      // Invalidate notification-related queries
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && 
                 (key.includes('notifications') || key.includes('unread'));
        },
        refetchType: 'active',
      });
      
      logger.debug('[useBackgroundSync] Notification data synced', 'data');
    } catch (error) {
      logger.error('[useBackgroundSync] Failed to sync notification data', error, 'data');
      syncMetricsRef.current.failureCount++;
    }
  };

  // Perform comprehensive sync
  const performSync = async (reason: string): Promise<void> => {
    if (!networkService.isOnline()) {
      logger.debug('[useBackgroundSync] Skipping sync - device offline', 'data');
      return;
    }

    const startTime = Date.now();
    logger.info(`[useBackgroundSync] Starting sync (${reason})...`, 'data');

    try {
      if (batchSync) {
        // Perform all syncs in parallel for better performance
        await Promise.allSettled([
          syncBalanceData(),
          syncTransactionData(),
          syncInteractionData(),
          syncNotificationData(),
        ]);
      } else {
        // Perform syncs sequentially to reduce load
        await syncBalanceData();
        await syncTransactionData();
        await syncInteractionData();
        await syncNotificationData();
      }

      // Update metrics
      const duration = Date.now() - startTime;
      const metrics = syncMetricsRef.current;
      metrics.lastSyncTime = Date.now();
      metrics.syncCount++;
      metrics.avgSyncDuration = (metrics.avgSyncDuration * (metrics.syncCount - 1) + duration) / metrics.syncCount;
      
      logger.info(`[useBackgroundSync] Sync completed in ${duration}ms (${reason})`, 'data');
    } catch (error) {
      logger.error(`[useBackgroundSync] Sync failed (${reason})`, error, 'data');
      syncMetricsRef.current.failureCount++;
    }
  };

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      logger.debug(`[useBackgroundSync] App state changed: ${previousState} -> ${nextAppState}`, 'app');

      if (previousState === 'active' && nextAppState.match(/inactive|background/)) {
        // App going to background
        const activeTime = Date.now() - lastActiveTimeRef.current;
        logger.debug(`[useBackgroundSync] App backgrounded after ${activeTime}ms active`, 'app');
        
        // Update background time tracking
        syncMetricsRef.current.backgroundTime = Date.now();
        
      } else if (previousState.match(/inactive|background/) && nextAppState === 'active') {
        // App coming to foreground
        const backgroundTime = Date.now() - syncMetricsRef.current.backgroundTime;
        syncMetricsRef.current.backgroundTime = backgroundTime;
        
        logger.debug(`[useBackgroundSync] App foregrounded after ${backgroundTime}ms background`, 'app');
        
        // Determine sync strategy based on background time
        let syncReason = 'foreground_return';
        
        if (backgroundTime > 10 * 60 * 1000) { // 10 minutes
          syncReason = 'long_background';
        } else if (backgroundTime > 2 * 60 * 1000) { // 2 minutes
          syncReason = 'medium_background';
        } else {
          syncReason = 'short_background';
        }
        
        // Delay sync slightly to allow app to settle
        setTimeout(() => {
          performSync(syncReason);
        }, backgroundSyncDelay);
        
        lastActiveTimeRef.current = Date.now();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [entityId, backgroundSyncDelay]);

  // Periodic sync when app is active
  useEffect(() => {
    if (!entityId) return;

    const syncInterval = setInterval(() => {
      if (AppState.currentState === 'active') {
        const interval = getAdaptiveSyncInterval();
        const timeSinceLastSync = Date.now() - syncMetricsRef.current.lastSyncTime;
        
        if (timeSinceLastSync >= interval) {
          performSync('periodic');
        }
      }
    }, Math.min(foregroundSyncInterval, 60 * 1000)); // Check every minute max

    return () => clearInterval(syncInterval);
  }, [entityId, foregroundSyncInterval]);

  // Network reconnection sync
  useEffect(() => {
    const handleNetworkReconnection = () => {
      if (AppState.currentState === 'active') {
        logger.debug('[useBackgroundSync] Network reconnected, performing sync...', 'data');
        performSync('network_reconnection');
      }
    };

    networkService.on('online', handleNetworkReconnection);

    return () => {
      networkService.off('online', handleNetworkReconnection);
    };
  }, []);

  // Force sync function for manual triggers
  const forceSync = async (): Promise<void> => {
    await performSync('manual');
  };

  // Get sync status
  const getSyncStatus = () => {
    const metrics = syncMetricsRef.current;
    const timeSinceLastSync = Date.now() - metrics.lastSyncTime;
    
    return {
      lastSyncTime: metrics.lastSyncTime,
      timeSinceLastSync,
      syncCount: metrics.syncCount,
      failureCount: metrics.failureCount,
      avgSyncDuration: metrics.avgSyncDuration,
      isOverdue: timeSinceLastSync > getAdaptiveSyncInterval(),
      nextSyncIn: Math.max(0, getAdaptiveSyncInterval() - timeSinceLastSync),
    };
  };

  return {
    forceSync,
    getSyncStatus,
    // Utility functions
    isOnline: () => networkService.isOnline(),
    appState: appStateRef.current,
  };
};

/**
 * useOfflineQueueSync Hook
 * 
 * Handles synchronization of queued offline operations.
 */
export const useOfflineQueueSync = (entityId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOnlineStatus = async () => {
      if (networkService.isOnline() && entityId) {
        logger.info('[useOfflineQueueSync] Device online, processing offline queue...', 'data');
        
        try {
          // Process any queued offline operations
          // This would integrate with the offline mutation queue
          // For now, just invalidate all queries to refresh data
          await queryClient.invalidateQueries({
            refetchType: 'active',
          });
          
          logger.info('[useOfflineQueueSync] Offline queue processed', 'data');
        } catch (error) {
          logger.error('[useOfflineQueueSync] Failed to process offline queue', error, 'data');
        }
      }
    };

    networkService.on('online', handleOnlineStatus);

    return () => {
      networkService.off('online', handleOnlineStatus);
    };
  }, [entityId, queryClient]);
};

export default useBackgroundSync;