/**
 * TanStack Query Client Configuration
 * 
 * Optimized for React Native with local-first architecture:
 * - Background refetch when app becomes active
 * - Intelligent caching with proper stale times
 * - Network-aware behavior
 */

import { QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import { logger } from '../utils/logger';
import { networkService } from '../services/NetworkService';

// Create QueryClient with React Native optimizations
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Local-first: Show cached data immediately, refetch in background
      staleTime: 2 * 60 * 1000, // 2 minutes - data considered fresh
      gcTime: 10 * 60 * 1000,   // 10 minutes - garbage collection time (formerly cacheTime)
      
      // Network behavior
      networkMode: 'offlineFirst', // Work offline with cached data
      refetchOnWindowFocus: false, // Don't refetch on focus (mobile optimization)
      refetchOnReconnect: true,    // Refetch when network reconnects
      
      // Retry configuration
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for network/server errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // React Native specific optimizations
      refetchOnMount: 'always', // Always check for fresh data on mount
    },
    mutations: {
      // Network behavior for mutations
      networkMode: 'online', // Mutations require network
      retry: 1, // Retry mutations once
      
      // Global error handling for mutations
      onError: (error: any, variables, context) => {
        logger.error('[QueryClient] Mutation failed', {
          error: error?.message || 'Unknown error',
          variables,
          context,
        });
      },
    },
  },
});

// React Native App State integration
let appStateSubscription: any = null;

export const setupAppStateRefetch = () => {
  if (Platform.OS !== 'web' && !appStateSubscription) {
    appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      logger.debug('[QueryClient] App state changed to:', nextAppState);
      
      if (nextAppState === 'active') {
        // App became active - refetch stale queries
        queryClient.invalidateQueries();
      }
    });
  }
};

// Network state integration
export const setupNetworkRefetch = () => {
  // Listen for network reconnection
  networkService.on('online', () => {
    logger.debug('[QueryClient] Network reconnected - refetching stale queries');
    
    // Refetch all queries when coming back online
    queryClient.invalidateQueries();
  });
  
  // Pause queries when offline
  networkService.on('offline', () => {
    logger.debug('[QueryClient] Network disconnected - pausing background refetch');
    
    // TanStack Query will automatically pause background refetch when offline
    // due to networkMode: 'offlineFirst' configuration
  });
};

// Initialize integrations
export const initializeQueryClient = () => {
  logger.info('[QueryClient] Initializing TanStack Query with React Native optimizations');
  
  setupAppStateRefetch();
  setupNetworkRefetch();
  
  logger.info('[QueryClient] ✅ TanStack Query initialization complete');
};

// Cleanup function
export const cleanupQueryClient = () => {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
  
  logger.debug('[QueryClient] Cleanup complete');
};

// Development helpers
if (__DEV__) {
  // Log query cache changes in development
  queryClient.getQueryCache().subscribe((event) => {
    if (event?.type === 'updated') {
      logger.debug('[QueryClient] Query updated:', JSON.stringify({
        queryKey: event.query.queryKey,
        status: event.query.state.status,
        dataUpdatedAt: event.query.state.dataUpdatedAt,
      }));
    }
  });
}

export default queryClient; 