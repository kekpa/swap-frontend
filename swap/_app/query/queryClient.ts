/**
 * TanStack Query Client Configuration
 * 
 * Optimized for React Native with local-first architecture:
 * - Background refetch when app becomes active
 * - Intelligent caching with proper stale times
 * - Network-aware behavior
 * - Persistent cache with AsyncStorage
 */

import { QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { logger } from '../utils/logger';
import { networkService } from '../services/NetworkService';
import { staleTimeManager, getStaleTimeForQuery } from './config/staleTimeConfig';

// Create QueryClient with React Native optimizations
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Local-first: Show cached data immediately, refetch in background
      // Dynamic stale time based on query type and user behavior
      staleTime: (query) => {
        const queryKey = query.queryKey;
        if (Array.isArray(queryKey) && queryKey.length > 0) {
          const queryType = typeof queryKey[0] === 'string' ? queryKey[0] : 'default';
          return getStaleTimeForQuery(queryType);
        }
        return 2 * 60 * 1000; // 2 minutes default
      },
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

// Create AsyncStorage persister for cache persistence
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'SWAP_TANSTACK_QUERY_CACHE',
  serialize: JSON.stringify,
  deserialize: JSON.parse,
  // Keep cache for 7 days when app is not used
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// Initialize cache persistence
let persistenceInitialized = false;

export const initializeCachePersistence = async () => {
  if (persistenceInitialized) return;
  
  try {
    logger.info('[QueryClient] 🔄 Initializing cache persistence...');
    
    await persistQueryClient({
      queryClient,
      persister: asyncStoragePersister,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      buster: 'v1.0', // Update when cache structure changes
      dehydrateOptions: {
        // Only persist successful queries
        shouldDehydrateQuery: (query) => {
          return query.state.status === 'success';
        },
      },
    });
    
    persistenceInitialized = true;
    logger.info('[QueryClient] ✅ Cache persistence initialized successfully');
  } catch (error) {
    logger.error('[QueryClient] ❌ Failed to initialize cache persistence:', error);
    // Don't throw - app should work without persistence
  }
};

// React Native App State integration
let appStateSubscription: any = null;

export const setupAppStateRefetch = () => {
  if (Platform.OS !== 'web' && !appStateSubscription) {
    appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      logger.debug('[QueryClient] App state changed to:', nextAppState);
      
      // Update stale time manager behavior based on app state
      staleTimeManager.adjustForAppState(nextAppState);
      
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
    
    // Update stale time manager for online state
    staleTimeManager.adjustForNetwork(true, false);
    
    // Refetch all queries when coming back online
    queryClient.invalidateQueries();
  });
  
  // Pause queries when offline
  networkService.on('offline', () => {
    logger.debug('[QueryClient] Network disconnected - pausing background refetch');
    
    // Update stale time manager for offline state
    staleTimeManager.adjustForNetwork(false);
    
    // TanStack Query will automatically pause background refetch when offline
    // due to networkMode: 'offlineFirst' configuration
  });
};

// Initialize integrations
export const initializeQueryClient = async () => {
  logger.info('[QueryClient] Initializing TanStack Query with React Native optimizations');
  
  // Initialize cache persistence first
  await initializeCachePersistence();
  
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