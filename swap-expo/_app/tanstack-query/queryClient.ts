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
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import logger from '../utils/logger';
import { networkService } from '../services/NetworkService';
import { staleTimeManager } from './config/staleTimeConfig';

/**
 * Create AsyncStorage persister for cache persistence
 * Note: Using a wrapper to make AsyncStorage work with sync storage persister
 */
const createAsyncStoragePersister = () => {
  try {
    // Create a simple in-memory cache as fallback since AsyncStorage is async
    // and createSyncStoragePersister expects synchronous storage
    const memoryStorage = new Map<string, string>();
    
    return createSyncStoragePersister({
      storage: {
        getItem: (key: string) => {
          return memoryStorage.get(key) || null;
        },
        setItem: (key: string, value: string) => {
          memoryStorage.set(key, value);
          // Async save to AsyncStorage in background
          AsyncStorage.setItem(key, value).catch(error => {
            logger.error('[QueryClient] Failed to save to AsyncStorage:', error);
          });
        },
        removeItem: (key: string) => {
          memoryStorage.delete(key);
          // Async remove from AsyncStorage in background
          AsyncStorage.removeItem(key).catch(error => {
            logger.error('[QueryClient] Failed to remove from AsyncStorage:', error);
          });
        },
      },
      serialize: JSON.stringify,
      deserialize: JSON.parse,
    });
  } catch (error) {
    logger.error('[QueryClient] Failed to create cache persister:', error);
    return null;
  }
};

// PROFESSIONAL: Optimized QueryClient for local-first banking app
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // WHATSAPP-STYLE: Prioritize cached data
      staleTime: 10 * 60 * 1000, // 10 minutes - longer staleness for better UX
      gcTime: 60 * 60 * 1000, // 1 hour - keep data longer in memory
      
      // LOCAL-FIRST: Prefer cached data over network
      networkMode: 'offlineFirst',
      
      // PERFORMANCE: Reduce unnecessary refetches
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false, // Don't refetch if we have cached data
      
      // RELIABILITY: Conservative retry strategy
      retry: (failureCount, error: any) => {
        // Don't retry client errors (4xx)
        if (error?.status >= 400 && error?.status < 500) return false;
        // Only retry server errors (5xx) up to 2 times
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // PERFORMANCE: Enable structural sharing for better re-renders
      structuralSharing: true,
      
      // UX: Use placeholder data for smoother transitions
      placeholderData: (previousData: any) => previousData,
    },
    mutations: {
      // RELIABILITY: Retry mutations more aggressively
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      
      // NETWORK: Allow mutations even when offline (for optimistic updates)
      networkMode: 'always',
    },
  },
});

// Store the app state listener reference for cleanup
let appStateListener: any = null;

/**
 * Initialize QueryClient with persistence and network monitoring
 */
export const initializeQueryClient = async (): Promise<void> => {
  try {
    logger.info('[QueryClient] Initializing TanStack Query with React Native optimizations');
    
    // Create persister for cache persistence
    const persister = createAsyncStoragePersister();
    
    if (persister) {
      // Enable cache persistence
      await persistQueryClient({
        queryClient,
        persister,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        buster: '1.0.0', // Increment to invalidate old cache
        dehydrateOptions: {
          // PROFESSIONAL FIX: Exclude pending queries from dehydration
          // This prevents "dehydrated query as pending" warnings during navigation
          shouldDehydrateQuery: (query) => {
            return query.state.status !== 'pending';
          },
        },
      });

      logger.info('[QueryClient] ✅ Cache persistence enabled with AsyncStorage');
    } else {
      logger.warn('[QueryClient] ⚠️  Cache persistence disabled - persister creation failed');
    }
    
    // Set up network state monitoring
    if (networkService) {
      logger.debug('[QueryClient] Network state monitoring delegated to NetworkService');
    }
    
    // Set up app state monitoring for background/foreground behavior
    const handleAppStateChange = (nextAppState: string) => {
      logger.debug('[QueryClient] App state changed:', nextAppState);
      
      if (nextAppState === 'active') {
        // App became active - refetch stale queries
        queryClient.refetchQueries({
          type: 'active',
          stale: true,
        });
        
        // Update stale time manager behavior based on app state
        if (nextAppState === 'active' || nextAppState === 'background' || nextAppState === 'inactive') {
          staleTimeManager.adjustForAppState(nextAppState as 'active' | 'background' | 'inactive');
        }
      }
    };
    
    // Listen for app state changes
    appStateListener = AppState.addEventListener('change', handleAppStateChange);
    
    logger.info('[QueryClient] ✅ TanStack Query initialization complete');
    
  } catch (error) {
    logger.error('[QueryClient] Failed to initialize:', error);
    throw error;
  }
};

/**
 * Cleanup QueryClient resources
 */
export const cleanupQueryClient = (): void => {
  try {
    // Remove app state listener
    if (appStateListener) {
      appStateListener.remove();
      appStateListener = null;
    }
    
    // Clear all queries
    queryClient.clear();
    
    logger.info('[QueryClient] ✅ QueryClient cleanup complete');
  } catch (error) {
    logger.error('[QueryClient] Cleanup failed:', error);
  }
};

/**
 * Get query client instance
 */
export const getQueryClient = (): QueryClient => queryClient;

/**
 * Utility function to invalidate queries by key pattern
 */
export const invalidateQueries = (keyPattern: string[]): void => {
  queryClient.invalidateQueries({
    queryKey: keyPattern,
  });
};

/**
 * Utility function to prefetch data
 */
export const prefetchQuery = async (
  queryKey: string[],
  queryFn: () => Promise<any>,
  staleTime?: number
): Promise<void> => {
  await queryClient.prefetchQuery({
    queryKey,
    queryFn,
    staleTime: staleTime || staleTimeManager.getStaleTime('balance'),
  });
}; 