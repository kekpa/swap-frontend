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
import { backgroundSyncService } from './BackgroundSyncService'; // LOCAL-FIRST: Replaces MessageManager & TransactionManager
import { IS_DEVELOPMENT } from '../config/env';
import { InteractionTimelineCache } from './InteractionTimelineCache';
import { networkService } from './NetworkService';
import { userStateManager } from './UserStateManager';
import { pushNotificationService } from './PushNotificationService';
import { timelineSyncService } from './TimelineSyncService';
import { deliveryConfirmationManager } from './DeliveryConfirmationManager';
import { interactionRepository } from '../localdb/InteractionRepository';
import { AppState } from 'react-native';
import { queryClient } from '../tanstack-query/queryClient';
import apiClient from '../_api/apiClient';
import { getAccessToken } from './token';

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
  private appStateSubscription: any = null;
  private handlerRetryInterval: ReturnType<typeof setInterval> | null = null;

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
      await this.initializeWebSocket(getAccessToken, user);

      // 🚀 PHASE 2.1: Initialize global user subscription model
      // 🔧 DATABASE-FIRST FIX: Use entity_id for unified messaging system
      const apiEntityId = await apiClient.getEntityId();
      const userEntityId = user?.entityId;
      
      console.log('🔥🔥🔥 [AppLifecycleManager] USER STATE MANAGER ENTITY ID COMPARISON:', {
        apiEntityId,
        userEntityId,
        match: apiEntityId === userEntityId,
        timestamp: new Date().toISOString()
      });
      
      if (apiEntityId) {
        userStateManager.initialize(apiEntityId);
        logger.info('[AppLifecycleManager] ✅ Global user subscription model initialized with API entity ID');
      } else if (userEntityId) {
        // Fallback to user entity ID if API entity ID not available
        userStateManager.initialize(userEntityId);
        logger.warn('[AppLifecycleManager] ⚠️ Using fallback user entity ID for user state manager');
      }

      // 🚀 PHASE 2.3: Initialize app state monitoring for smart notifications
      this.initializeAppStateMonitoring();

      // 🚀 PHASE 2.4: Initialize push notifications for background delivery
      await this.initializePushNotifications();

      // 🚀 PHASE 2.5: Initialize message sync for offline reliability
      this.initializeMessageSync(user);

      // 🚀 PHASE 2.6: Initialize delivery confirmation system
      this.initializeDeliveryConfirmation();

      // 🚀 WHATSAPP PATTERN: Pre-fetch timelines on app launch for instant chat display
      // This ensures SQLite has data BEFORE user opens any chat
      this.prefetchTimelines(user);

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
  private async initializeWebSocket(getAccessToken: () => Promise<string>, user: User | null = null): Promise<void> {
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
          console.log('🔥🔥🔥 [AppLifecycleManager] STARTING WEBSOCKET CONNECTION:', {
            hasToken: !!token,
            tokenLength: token.length,
            userEntityId: user?.entityId,
            userProfileId: user?.profileId,
            timestamp: new Date().toISOString(),
            deviceType: 'DEBUGGING_WEBSOCKET_INIT'
          });
          
          const connected = await websocketService.connect(token);
          
          console.log('🔥🔥🔥 [AppLifecycleManager] WEBSOCKET CONNECTION RESULT:', {
            connected,
            isSocketConnected: websocketService.isSocketConnected(),
            isSocketAuthenticated: websocketService.isSocketAuthenticated(),
            userEntityId: user?.entityId,
            userProfileId: user?.profileId,
            timestamp: new Date().toISOString()
          });

          // CRITICAL: Only join profile room AFTER successful authentication
          // The websocketService.connect() should return true only after authentication is complete
          
          // 🔧 DATABASE-FIRST FIX: Use entity_id for messaging rooms (unified personal/business system)
          const apiEntityId = await apiClient.getEntityId();
          const userEntityId = user?.entityId;
          
          console.log('🔥🔥🔥 [AppLifecycleManager] ENTITY ID COMPARISON (DATABASE-FIRST):', {
            apiEntityId,
            userEntityId,
            match: apiEntityId === userEntityId,
            connected,
            timestamp: new Date().toISOString()
          });
          
          if (connected && apiEntityId) {
            if (IS_DEVELOPMENT) console.log('🔥 [AppLifecycleManager] 🏠 WebSocket authenticated, joining entity room...');
            
            console.log('🔥🔥🔥 [AppLifecycleManager] PREPARING ENTITY ROOM JOIN (DATABASE-FIRST):', {
              entityId: apiEntityId,
              userEntityId: user?.entityId,
              connected,
              isAuthenticated: websocketService.isSocketAuthenticated(),
              source: 'JWT_TOKEN_ENTITY_ID',
              timestamp: new Date().toISOString()
            });
            
            // Add small delay to ensure authentication is fully processed by backend
            setTimeout(() => {
              if (IS_DEVELOPMENT) console.log('🔥 [AppLifecycleManager] 🏠 Attempting to join entity room:', apiEntityId);
              console.log('🔥🔥🔥 [AppLifecycleManager] EXECUTING ENTITY ROOM JOIN (DATABASE-FIRST):', {
                entityId: apiEntityId,
                userEntityId: user?.entityId,
                source: 'JWT_TOKEN_ENTITY_ID',
                timestamp: new Date().toISOString()
              });
              websocketService.joinEntityRoom(apiEntityId);
            }, 100);
          } else {
            if (IS_DEVELOPMENT) console.warn('🔥 [AppLifecycleManager] ⚠️ Cannot join entity room - not authenticated or no entityId:', {
              connected,
              apiEntityId,
              userEntityId
            });
            console.log('🔥🔥🔥 [AppLifecycleManager] ENTITY ROOM JOIN FAILED (DATABASE-FIRST):', {
              connected,
              apiEntityId,
              userEntityId,
              isSocketConnected: websocketService.isSocketConnected(),
              isSocketAuthenticated: websocketService.isSocketAuthenticated(),
              reason: !connected ? 'NOT_CONNECTED' : !apiEntityId ? 'NO_API_ENTITY_ID' : 'UNKNOWN',
              timestamp: new Date().toISOString()
            });
          }
        } else {
          console.log('🔥🔥🔥 [AppLifecycleManager] NO ACCESS TOKEN AVAILABLE:', {
            hasToken: !!token,
            userEntityId: user?.entityId,
            userProfileId: user?.profileId,
            timestamp: new Date().toISOString()
          });
        }
      }

      // ✅ FIX: Only initialize handlers if WebSocket is connected and authenticated
      // This prevents event listeners from being attached to null socket
      if (websocketService.isSocketConnected() && websocketService.isSocketAuthenticated()) {
        if (IS_DEVELOPMENT) console.log('🔥 [AppLifecycleManager] 🧪 Initializing WebSocket event handlers with direct cache updates...');
        // Get entityId for proper cache key matching
        const entityIdForCache = await apiClient.getEntityId() || user?.entityId;
        webSocketHandler.initialize(queryClient, entityIdForCache);
        if (IS_DEVELOPMENT) console.log('🔥 [AppLifecycleManager] ✅ WebSocket handlers initialized successfully', {
          hasEntityId: !!entityIdForCache
        });
      } else {
        logger.warn('[AppLifecycleManager] ⚠️ Cannot initialize WebSocket handlers - socket not connected/authenticated');
        if (IS_DEVELOPMENT) console.warn('🔥 [AppLifecycleManager] ⚠️ Skipping handler initialization:', {
          isConnected: websocketService.isSocketConnected(),
          isAuthenticated: websocketService.isSocketAuthenticated(),
          willRetryOnReconnection: true
        });

        // ✅ Set up one-time listener for successful connection to initialize handlers
        // This handles cases where initial connection failed but later succeeds
        const retryInitialization = async () => {
          if (websocketService.isSocketConnected() && websocketService.isSocketAuthenticated()) {
            logger.info('[AppLifecycleManager] 🔄 WebSocket connected - initializing handlers now');
            if (IS_DEVELOPMENT) console.log('🔥 [AppLifecycleManager] 🔄 Retrying handler initialization after connection success');
            // Get entityId for proper cache key matching
            const entityIdForCache = await apiClient.getEntityId() || user?.entityId;
            webSocketHandler.initialize(queryClient, entityIdForCache);
            if (IS_DEVELOPMENT) console.log('🔥 [AppLifecycleManager] ✅ WebSocket handlers initialized successfully (retry)', {
              hasEntityId: !!entityIdForCache
            });
          }
        };

        // Check every 2 seconds for up to 30 seconds (15 attempts)
        let attempts = 0;
        const maxAttempts = 15;

        // Clear any existing retry interval first
        if (this.handlerRetryInterval) {
          clearInterval(this.handlerRetryInterval);
        }

        this.handlerRetryInterval = setInterval(() => {
          attempts++;
          if (websocketService.isSocketConnected() && websocketService.isSocketAuthenticated()) {
            retryInitialization();
            if (this.handlerRetryInterval) {
              clearInterval(this.handlerRetryInterval);
              this.handlerRetryInterval = null;
            }
          } else if (attempts >= maxAttempts) {
            logger.warn('[AppLifecycleManager] ⚠️ WebSocket handlers not initialized after 30s - user may need to reconnect');
            if (IS_DEVELOPMENT) console.warn('🔥 [AppLifecycleManager] ⚠️ Handler initialization retry timeout');
            if (this.handlerRetryInterval) {
              clearInterval(this.handlerRetryInterval);
              this.handlerRetryInterval = null;
            }
          }
        }, 2000);
      }

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
   * 🚀 PHASE 2.3: Initialize app state monitoring for smart notifications
   */
  private initializeAppStateMonitoring(): void {
    logger.debug('[AppLifecycleManager] 📱 Initializing app state monitoring');
    
    // Set initial app state
    const currentState = AppState.currentState;
    userStateManager.setAppState(currentState === 'active' ? 'foreground' : 'background');
    
    // Monitor app state changes
    this.appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
      logger.debug(`[AppLifecycleManager] 📱 App state changed: ${nextAppState}`);

      const appState = nextAppState === 'active' ? 'foreground' : 'background';
      userStateManager.setAppState(appState);

      // Update online status based on app state
      const isOnline = nextAppState === 'active';
      userStateManager.setOnlineStatus(isOnline);

      // ✅ WhatsApp/Telegram pattern: Check WebSocket connection when app resumes
      if (nextAppState === 'active') {
        logger.debug('[AppLifecycleManager] 📱 App resumed to foreground - checking WebSocket connection');

        // 🔄 Smart Fallback: Invalidate transaction cache on foreground (Revolut/Square pattern)
        logger.debug('[AppLifecycleManager] 💰 Invalidating transaction cache on app foreground');
        queryClient.invalidateQueries({ queryKey: ['transactions'] });

        // Check if WebSocket is connected
        if (!websocketService.isSocketConnected()) {
          logger.info('[AppLifecycleManager] 🔄 WebSocket disconnected, triggering reconnection...');

          // Get fresh token and reconnect
          try {
            const token = await getAccessToken();
            if (token) {
              const connected = await websocketService.connect(token);

              if (connected) {
                logger.info('[AppLifecycleManager] ✅ WebSocket reconnected successfully after app resume');

                // Rejoin entity room (rooms will be auto-rejoined by websocketService)
                const apiEntityId = await apiClient.getEntityId();
                if (apiEntityId) {
                  setTimeout(() => {
                    websocketService.joinEntityRoom(apiEntityId);
                  }, 100);
                }
              } else {
                logger.warn('[AppLifecycleManager] ⚠️ WebSocket reconnection failed after app resume');
              }
            }
          } catch (error) {
            logger.error('[AppLifecycleManager] ❌ Error reconnecting WebSocket on app resume:', error);
          }
        } else {
          logger.debug('[AppLifecycleManager] ✅ WebSocket already connected');
        }
      }
    });
    
    logger.info('[AppLifecycleManager] ✅ App state monitoring initialized');
  }

  /**
   * 🚀 PHASE 2.4: Initialize push notifications for background message delivery
   */
  private async initializePushNotifications(): Promise<void> {
    try {
      logger.debug('[AppLifecycleManager] 📱 Initializing push notifications...');
      await pushNotificationService.initialize();
      logger.info('[AppLifecycleManager] ✅ Push notifications initialized');
    } catch (error) {
      logger.error('[AppLifecycleManager] ❌ Push notification initialization failed:', error);
      // Continue without push notifications - WebSocket will still work
    }
  }

  /**
   * 🚀 PHASE 2.5: Initialize message sync for offline message reliability
   */
  private initializeMessageSync(user?: { entityId?: string }): void {
    try {
      logger.debug('[AppLifecycleManager] 🔄 Initializing message sync...');
      timelineSyncService.initialize();

      // Set current entity ID for sync operations
      if (user?.entityId) {
        timelineSyncService.setCurrentEntityId(user.entityId);
        logger.debug(`[AppLifecycleManager] Entity ID set for message sync: ${user.entityId}`);
      }

      logger.info('[AppLifecycleManager] ✅ Message sync initialized');
    } catch (error) {
      logger.error('[AppLifecycleManager] ❌ Message sync initialization failed:', error);
      // Continue without message sync - basic messaging will still work
    }
  }

  /**
   * 🚀 PHASE 2.6: Initialize delivery confirmation system
   */
  private initializeDeliveryConfirmation(): void {
    try {
      logger.debug('[AppLifecycleManager] 📨 Initializing delivery confirmation...');
      deliveryConfirmationManager.initialize();
      logger.info('[AppLifecycleManager] ✅ Delivery confirmation initialized');
    } catch (error) {
      logger.error('[AppLifecycleManager] ❌ Delivery confirmation initialization failed:', error);
      // Continue without delivery confirmation - basic messaging will still work
    }
  }

  /**
   * 🚀 WHATSAPP PATTERN: Pre-fetch timelines on app launch
   *
   * This ensures SQLite has data BEFORE user opens any chat.
   * When user taps on an interaction, data is already cached → INSTANT display.
   *
   * Strategy:
   * - Fetch top 10 most recent interactions (most likely to be opened)
   * - Sync in parallel for speed
   * - Non-blocking - runs in background, doesn't block app launch
   */
  private prefetchTimelines(user?: User): void {
    if (!user?.profileId) {
      logger.debug('[AppLifecycleManager] Skipping timeline pre-fetch - no profile ID');
      return;
    }

    // Run in background - don't await, don't block app launch
    this.performTimelinePrefetch(user.profileId).catch((error) => {
      logger.warn('[AppLifecycleManager] Timeline pre-fetch failed (non-fatal):', error);
    });
  }

  /**
   * Perform the actual timeline pre-fetch (async)
   */
  private async performTimelinePrefetch(profileId: string): Promise<void> {
    logger.info('[AppLifecycleManager] 🚀 Pre-fetching timelines (WhatsApp pattern)');

    try {
      // Get all interactions for current profile
      const interactions = await interactionRepository.getInteractionsWithMembers(profileId);

      if (interactions.length === 0) {
        logger.debug('[AppLifecycleManager] No interactions to pre-fetch');
        return;
      }

      // Pre-fetch top 10 most recent interactions (most likely to be opened)
      const recentInteractions = interactions
        .sort((a, b) => {
          const timeA = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
          const timeB = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
          return timeB - timeA;
        })
        .slice(0, 10);

      logger.debug(`[AppLifecycleManager] Pre-fetching ${recentInteractions.length} most recent interactions`);

      // Sync in parallel (faster than sequential)
      await Promise.all(
        recentInteractions.map((interaction) =>
          timelineSyncService.syncInteraction(interaction.id).catch((err) => {
            logger.warn(`[AppLifecycleManager] Pre-fetch failed for ${interaction.id}:`, err);
            // Continue with other interactions - non-fatal
          })
        )
      );

      logger.info(`[AppLifecycleManager] ✅ Pre-fetched ${recentInteractions.length} timelines`);
    } catch (error) {
      logger.error('[AppLifecycleManager] Pre-fetch failed:', error);
      // Non-fatal - app continues, user just waits on first chat open
    }
  }

  /**
   * Cleanup all services when user logs out
   */
  cleanup(): void {
    if (IS_DEVELOPMENT) console.log('🔥 [AppLifecycleManager] ⚠️  CLEANING UP ALL SERVICES');
    logger.debug('[AppLifecycleManager] Cleaning up all services for user logout', 'lifecycle');

    // Clear handler retry interval if running
    if (this.handlerRetryInterval) {
      clearInterval(this.handlerRetryInterval);
      this.handlerRetryInterval = null;
      logger.debug('[AppLifecycleManager] Cleared WebSocket handler retry interval');
    }

    // Clear all InteractionTimelineCache instances
    InteractionTimelineCache.clearAllInstances();
    
    // 🚀 PHASE 2.1: Cleanup global user subscription
    userStateManager.cleanup();
    
    // 🚀 PHASE 2.3: Cleanup app state monitoring
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    // 🚀 PHASE 2.4: Cleanup push notifications
    pushNotificationService.cleanup();

    // 🚀 PHASE 2.5: Cleanup message sync
    timelineSyncService.cleanup();

    // 🚀 PHASE 2.6: Cleanup delivery confirmation
    deliveryConfirmationManager.cleanup();
    
    // Disconnect and clear WebSocket state
    try {
      websocketService.disconnect();
      logger.debug('[AppLifecycleManager] WebSocket disconnected for logout', 'lifecycle');
    } catch (error) {
      logger.warn('[AppLifecycleManager] Error disconnecting WebSocket', 'lifecycle', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
    
    // Clear BackgroundSyncService state (LOCAL-FIRST: replaces MessageManager & TransactionManager)
    try {
      backgroundSyncService.stop();
      webSocketHandler.cleanup();
      logger.debug('[AppLifecycleManager] Background sync and handlers cleaned up for logout', 'lifecycle');
    } catch (error) {
      logger.warn('[AppLifecycleManager] Error cleaning up sync service', 'lifecycle', {
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