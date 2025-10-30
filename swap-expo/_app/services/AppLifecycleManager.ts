/**
 * AppLifecycleManager Service
 * 
 * Centralized management of app lifecycle events including:
 * - WebSocket initialization and cleanup
 * - Network service management
 * - Service managers cleanup on logout
 * 
 * Extracted from DataContext to create cleaner separation of concerns.
 */

import logger from '../utils/logger';
import { websocketService } from './websocketService';
import { webSocketHandler } from './WebSocketHandler';
import { messageManager } from './MessageManager';
import { IS_DEVELOPMENT } from '../config/env';
import { transactionManager } from './TransactionManager';
import { TimelineManager } from './TimelineManager';
import { networkService } from './NetworkService';

interface User {
  entityId: string;
  profileId: string;
}

interface AuthContext {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  getAccessToken: () => Promise<string>;
}

class AppLifecycleManager {
  private networkCleanup: (() => void) | null = null;
  private isInitialized = false;

  /**
   * Initialize app services when user authenticates
   */
  async initialize(authContext: AuthContext): Promise<void> {
    const { isAuthenticated, user, getAccessToken } = authContext;

    if (!isAuthenticated || !user) {
      return;
    }

    // Check if WebSocket is actually connected, reset if stale (handles Metro hot-reload)
    if (this.isInitialized && !websocketService.isSocketConnected()) {
      logger.info('[AppLifecycleManager] 🔄 Detected stale initialization (WebSocket disconnected), resetting...');
      if (IS_DEVELOPMENT) console.log('🔥 [AppLifecycleManager] 🔄 Resetting stale initialization state');
      this.isInitialized = false;
    }

    if (this.isInitialized) {
      return;
    }

    logger.debug('[AppLifecycleManager] User authenticated, initializing services', 'lifecycle');
    if (IS_DEVELOPMENT) console.log('🔥 [AppLifecycleManager] 🚀 STARTING service initialization...');

    try {
      // CRITICAL: Initialize network monitoring FIRST - must detect online/offline before WebSocket attempts connection
      await this.initializeNetworkService(authContext);

      // Initialize WebSocket connection AFTER network state is known
      await this.initializeWebSocket(getAccessToken);

      this.isInitialized = true;
      if (IS_DEVELOPMENT) console.log('🔥 [AppLifecycleManager] ✅ All services initialized successfully');
      
    } catch (error) {
      logger.error('[AppLifecycleManager] ❌ Service initialization failed:', error);
      console.error('🔥 [AppLifecycleManager] ❌ Service initialization failed:', error);
    }
  }

  /**
   * Initialize WebSocket connection and handlers
   */
  private async initializeWebSocket(getAccessToken: () => Promise<string>): Promise<void> {
    try {
      // CRITICAL: Log NetworkService state BEFORE attempting WebSocket connection
      const networkState = networkService.getNetworkState();
      if (IS_DEVELOPMENT) {
        console.log('🔥 [AppLifecycleManager] 🌐 NetworkService state before WebSocket:', {
          isConnected: networkState.isConnected,
          isInternetReachable: networkState.isInternetReachable,
          isOfflineMode: networkState.isOfflineMode,
          type: networkState.type
        });
      }

      if (networkState.isOfflineMode) {
        logger.warn('[AppLifecycleManager] ⚠️ NetworkService reports OFFLINE - WebSocket connection may fail');
        if (IS_DEVELOPMENT) console.warn('🔥 [AppLifecycleManager] ⚠️ WARNING: NetworkService reports OFFLINE mode!');
      }

      if (IS_DEVELOPMENT) console.log('🔥 [AppLifecycleManager] 🧪 Testing WebSocket connection...');
      const isConnected = websocketService.isSocketConnected();
      const isAuthenticated = websocketService.isSocketAuthenticated();

      if (IS_DEVELOPMENT) console.log('🔥 [AppLifecycleManager] WebSocket status:', {
        isConnected,
        isAuthenticated
      });

      if (!isConnected) {
        if (IS_DEVELOPMENT) console.log('🔥 [AppLifecycleManager] 🔌 WebSocket not connected, attempting to connect...');
        const token = await getAccessToken();
        if (token) {
          await websocketService.connect(token);
          if (IS_DEVELOPMENT) console.log('🔥 [AppLifecycleManager] ✅ WebSocket connected successfully');
        }
      }
      
      // Initialize the WebSocketHandler
      if (IS_DEVELOPMENT) console.log('🔥 [AppLifecycleManager] 🧪 Initializing WebSocket event handlers...');
      webSocketHandler.initialize();
      
      if (IS_DEVELOPMENT) console.log('🔥 [AppLifecycleManager] 💰 Balance data handled by TanStack Query hooks');
      
    } catch (error) {
      console.error('🔥 [AppLifecycleManager] ❌ WebSocket initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize network monitoring service
   */
  private async initializeNetworkService(authContext: AuthContext): Promise<void> {
    console.log('🌐 [AppLifecycleManager] 🚀 Initializing network monitoring...');
    
    try {
      // Initialize network service
      logger.debug('[AppLifecycleManager] 🌐 Initializing NetworkService...');
      await networkService.initialize();
      logger.info('[AppLifecycleManager] ✅ NetworkService initialized successfully');
      
      // Set up network state listener
      this.networkCleanup = networkService.onNetworkStateChange((state) => {
        logger.info(`[AppLifecycleManager] 🌐 Network state changed: ${state.isOfflineMode ? 'OFFLINE' : 'ONLINE'}`);
        
        if (!state.isOfflineMode && state.isConnected) {
          // Coming back online - trigger background sync for critical data
          logger.debug('[AppLifecycleManager] 🔄 Back online - triggering background sync');
          
          // Only sync if we have authenticated user
          if (authContext.isAuthenticated && authContext.user) {
            // Background balance sync handled by TanStack Query
            logger.debug('[AppLifecycleManager] TanStack Query will handle background sync');
          }
        }
      });
      
      // Get initial network state
      const initialState = networkService.getNetworkState();
      logger.debug(`[AppLifecycleManager] Initial network state: ${JSON.stringify(initialState)}`);
      
    } catch (error) {
      logger.error('[AppLifecycleManager] ❌ Failed to initialize NetworkService:', error);
      // Continue without network service - app should still work offline
      this.networkCleanup = () => {}; // Return empty cleanup function
    }
  }

  /**
   * Cleanup all services when user logs out
   */
  cleanup(): void {
    if (IS_DEVELOPMENT) console.log('🔥 [AppLifecycleManager] ⚠️  CLEANING UP ALL SERVICES');
    logger.debug('[AppLifecycleManager] Cleaning up all services for user logout', 'lifecycle');
    
    // Clear all TimelineManager instances
    TimelineManager.clearAllInstances();
    
    // Disconnect and clear WebSocket state
    try {
      websocketService.disconnect();
      logger.debug('[AppLifecycleManager] WebSocket disconnected for logout', 'lifecycle');
    } catch (error) {
      logger.warn('[AppLifecycleManager] Error disconnecting WebSocket', 'lifecycle', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
    
    // Clear MessageManager, TransactionManager state
    try {
      messageManager.cleanup();
      transactionManager.cleanup();
      webSocketHandler.cleanup();
      logger.debug('[AppLifecycleManager] Managers cleaned up for logout', 'lifecycle');
    } catch (error) {
      logger.warn('[AppLifecycleManager] Error cleaning up managers', 'lifecycle', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
    
    // Cleanup network service
    if (this.networkCleanup) {
      try {
        this.networkCleanup();
        this.networkCleanup = null;
        logger.debug('[AppLifecycleManager] Network service cleaned up', 'lifecycle');
      } catch (error) {
        logger.warn('[AppLifecycleManager] Error cleaning up network service', 'lifecycle', { 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }
    
    this.isInitialized = false;
    logger.debug('[AppLifecycleManager] All services cleaned up successfully', 'lifecycle');
  }

  /**
   * Check if the manager is initialized
   */
  getInitializationStatus(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const appLifecycleManager = new AppLifecycleManager();
export default appLifecycleManager;