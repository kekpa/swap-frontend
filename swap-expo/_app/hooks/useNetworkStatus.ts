/**
 * useNetworkStatus Hook
 *
 * Monitors network connectivity status using NetInfo
 * Returns real-time connection state for offline protection
 *
 * Usage:
 * const { isConnected, isOnline } = useNetworkStatus();
 */

import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import logger from '../utils/logger';

export interface NetworkStatus {
  isConnected: boolean;
  isOnline: boolean;
  type: string | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true, // Assume connected initially
    isOnline: true,
    type: null,
  });

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected ?? false;
      const isOnline = state.isInternetReachable ?? isConnected;

      setNetworkStatus({
        isConnected,
        isOnline,
        type: state.type,
      });

      logger.debug('[NetworkStatus] Updated', 'app', {
        isConnected,
        isOnline,
        type: state.type,
      });
    });

    // Fetch initial state
    NetInfo.fetch().then(state => {
      const isConnected = state.isConnected ?? false;
      const isOnline = state.isInternetReachable ?? isConnected;

      setNetworkStatus({
        isConnected,
        isOnline,
        type: state.type,
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return networkStatus;
}

/**
 * Check network status once (for non-hook contexts)
 */
export async function checkNetworkStatus(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  } catch (error) {
    logger.error('[NetworkStatus] Error checking status:', error);
    return false;
  }
}
