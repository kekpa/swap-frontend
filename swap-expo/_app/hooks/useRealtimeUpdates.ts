/**
 * useRealtimeUpdates Hook - Professional Real-time Messaging
 *
 * This hook implements the CORRECT architecture used by WhatsApp, Slack, and Discord.
 * Instead of invalidating queries on WebSocket events, we use direct cache updates.
 *
 * Benefits:
 * - Instant UI updates (0ms latency)
 * - No unnecessary API calls  
 * - Works offline
 * - Reduces server load
 * - Better user experience
 *
 * Architecture:
 * WebSocket → Full Data → CacheUpdateManager → Direct Cache Update → Instant UI
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { cacheUpdateManager } from '../services/CacheUpdateManager';
import { logger } from '../utils/logger';

interface UseRealtimeUpdatesOptions {
  interactionId?: string;
  onUpdate?: (event: { event: string; data: any }) => void;
}

/**
 * Professional hook for real-time updates via direct cache updates
 * 
 * @param options - Configuration options
 */
export const useRealtimeUpdates = (options: UseRealtimeUpdatesOptions = {}) => {
  const { interactionId, onUpdate } = options;
  const queryClient = useQueryClient();
  const subscriptionId = useRef<string>(`realtime-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    // Initialize the cache update manager with QueryClient
    cacheUpdateManager.initialize(queryClient);

    logger.debug('[useRealtimeUpdates] 🚀 Subscribing to real-time updates', {
      subscriptionId: subscriptionId.current,
      interactionId: interactionId || 'global',
    });

    // Subscribe to real-time updates
    const unsubscribe = cacheUpdateManager.subscribe({
      id: subscriptionId.current,
      interactionId,
      onUpdate,
    });

    logger.debug('[useRealtimeUpdates] ✅ Real-time subscription active');

    // Cleanup
    return () => {
      logger.debug('[useRealtimeUpdates] 🧹 Unsubscribing from real-time updates', {
        subscriptionId: subscriptionId.current,
      });
      
      unsubscribe();
    };
  }, [interactionId, onUpdate, queryClient]);

  // Return a force refresh function for rare cases where manual refresh is needed
  return {
    forceRefresh: () => {
      if (interactionId) {
        logger.info('[useRealtimeUpdates] Manual refresh requested');
        cacheUpdateManager.forceRefresh(interactionId);
      }
    },
  };
};

// Export with the old name for backwards compatibility during migration
export const useWebSocketQueryInvalidation = useRealtimeUpdates;

export default useRealtimeUpdates;