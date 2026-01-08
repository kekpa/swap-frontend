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
  getAccessToken: () => Promise<string | null>;
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
      logger.info('Detected stale initialization (WebSocket disconnected), resetting', 'app');
      this.isInitialized = false;
    }

    if (this.isInitialized) {
      return;
    }

    logger.debug('User authenticated, initializing services', 'app');

    try {
      // CRITICAL: Initialize network monitoring FIRST - must detect online/offline before WebSocket attempts connection
      await this.initializeNetworkService(authContext);

      // Initialize WebSocket connection AFTER network state is known
      await this.initializeWebSocket(getAccessToken, user);

      // 🚀 PHASE 2.1: Initialize global user subscription model
      // 🔧 DATABASE-FIRST FIX: Use entity_id for unified messaging system
      const apiEntityId = await apiClient.getEntityId();
      const userEntityId = user?.entityId;

      logger.debug('Entity ID comparison', 'app', {
        apiEntityId,
        userEntityId,
        match: apiEntityId === userEntityId
      });

      if (apiEntityId) {
        userStateManager.initialize(apiEntityId);
        logger.info('Global user subscription model initialized with API entity ID', 'app');
      } else if (userEntityId) {
        // Fallback to user entity ID if API entity ID not available
        userStateManager.initialize(userEntityId);
        logger.warn('Using fallback user entity ID for user state manager', 'app');
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
      logger.info('All services initialized successfully', 'app');

    } catch (error) {
      logger.error('Service initialization failed', error, 'app');
    }
  }

  /**
   * Initialize WebSocket connection and handlers
   */
  private async initializeWebSocket(getAccessToken: () => Promise<string | null>, user: User | null = null): Promise<void> {
    try {
      // CRITICAL: Log NetworkService state BEFORE attempting WebSocket connection
      const networkState = networkService.getNetworkState();
      logger.debug('NetworkService state before WebSocket', 'app', {
        isConnected: networkState.isConnected,
        isInternetReachable: networkState.isInternetReachable,
        isOfflineMode: networkState.isOfflineMode,
        type: networkState.type
      });

      if (networkState.isOfflineMode) {
        logger.warn('NetworkService reports OFFLINE - WebSocket connection may fail', 'app');
      }

      logger.debug('Testing WebSocket connection', 'app');
      const isConnected = websocketService.isSocketConnected();
      const isAuthenticated = websocketService.isSocketAuthenticated();

      logger.debug('WebSocket status', 'app', { isConnected, isAuthenticated });

      if (!isConnected) {
        logger.debug('WebSocket not connected, attempting to connect', 'app');
        const token = await getAccessToken();
        if (token) {
          logger.debug('Starting WebSocket connection', 'app', {
            hasToken: !!token,
            userEntityId: user?.entityId
          });

          const connected = await websocketService.connect(token);

          logger.debug('WebSocket connection result', 'app', {
            connected,
            isSocketConnected: websocketService.isSocketConnected(),
            isSocketAuthenticated: websocketService.isSocketAuthenticated()
          });

          // CRITICAL: Only join profile room AFTER successful authentication
          // The websocketService.connect() should return true only after authentication is complete
          
          // 🔧 DATABASE-FIRST FIX: Use entity_id for messaging rooms (unified personal/business system)
          const apiEntityId = await apiClient.getEntityId();
          const userEntityId = user?.entityId;

          logger.debug('Entity ID comparison (DATABASE-FIRST)', 'app', {
            apiEntityId,
            userEntityId,
            match: apiEntityId === userEntityId,
            connected
          });

          if (connected && apiEntityId) {
            logger.debug('WebSocket authenticated, joining entity room', 'app');

            // Add small delay to ensure authentication is fully processed by backend
            setTimeout(() => {
              logger.debug(`Joining entity room: ${apiEntityId}`, 'app');
              websocketService.joinEntityRoom(apiEntityId);
            }, 100);
          } else {
            logger.warn('Cannot join entity room - not authenticated or no entityId', 'app', {
              connected,
              apiEntityId,
              userEntityId,
              reason: !connected ? 'NOT_CONNECTED' : !apiEntityId ? 'NO_API_ENTITY_ID' : 'UNKNOWN'
            });
          }
        } else {
          logger.warn('No access token available for WebSocket', 'app');
        }
      }

      // ✅ FIX: Only initialize handlers if WebSocket is connected and authenticated
      // This prevents event listeners from being attached to null socket
      if (websocketService.isSocketConnected() && websocketService.isSocketAuthenticated()) {
        logger.debug('Initializing WebSocket event handlers', 'app');
        // Get entityId for proper cache key matching
        const entityIdForCache = await apiClient.getEntityId() || user?.entityId;
        webSocketHandler.initialize(queryClient, entityIdForCache);
        logger.debug('WebSocket handlers initialized successfully', 'app', { hasEntityId: !!entityIdForCache });
      } else {
        logger.warn('Cannot initialize WebSocket handlers - socket not connected/authenticated', 'app');
        logger.debug('Skipping handler initialization, will retry on reconnection', 'app', {
          isConnected: websocketService.isSocketConnected(),
          isAuthenticated: websocketService.isSocketAuthenticated()
        });

        // ✅ Set up one-time listener for successful connection to initialize handlers
        // This handles cases where initial connection failed but later succeeds
        const retryInitialization = async () => {
          if (websocketService.isSocketConnected() && websocketService.isSocketAuthenticated()) {
            logger.info('WebSocket connected - initializing handlers now', 'app');
            // Get entityId for proper cache key matching
            const entityIdForCache = await apiClient.getEntityId() || user?.entityId;
            webSocketHandler.initialize(queryClient, entityIdForCache);
            logger.debug('WebSocket handlers initialized successfully (retry)', 'app', { hasEntityId: !!entityIdForCache });
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
            logger.warn('WebSocket handlers not initialized after 30s - user may need to reconnect', 'app');
            if (this.handlerRetryInterval) {
              clearInterval(this.handlerRetryInterval);
              this.handlerRetryInterval = null;
            }
          }
        }, 2000);
      }

      logger.debug('Balance data handled by TanStack Query hooks', 'app');

    } catch (error) {
      logger.error('WebSocket initialization failed', error, 'app');
      throw error;
    }
  }

  /**
   * Initialize network monitoring service
   */
  private async initializeNetworkService(authContext: AuthContext): Promise<void> {
    logger.debug('Initializing network monitoring', 'app');

    try {
      await networkService.initialize();
      logger.info('NetworkService initialized successfully', 'app');

      // Set up network state listener
      this.networkCleanup = networkService.onNetworkStateChange((state) => {
        logger.info(`Network state changed: ${state.isOfflineMode ? 'OFFLINE' : 'ONLINE'}`, 'app');

        if (!state.isOfflineMode && state.isConnected) {
          // Coming back online - trigger background sync for critical data
          logger.debug('Back online - TanStack Query will handle background sync', 'app');
        }
      });

      // Get initial network state
      const initialState = networkService.getNetworkState();
      logger.debug('Initial network state', 'app', initialState);

    } catch (error) {
      logger.error('Failed to initialize NetworkService', error, 'app');
      // Continue without network service - app should still work offline
      this.networkCleanup = () => {}; // Return empty cleanup function
    }
  }

  /**
   * 🚀 PHASE 2.3: Initialize app state monitoring for smart notifications
   */
  private initializeAppStateMonitoring(): void {
    logger.debug('Initializing app state monitoring', 'app');

    // Set initial app state
    const currentState = AppState.currentState;
    userStateManager.setAppState(currentState === 'active' ? 'foreground' : 'background');

    // Monitor app state changes
    this.appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
      logger.debug(`App state changed: ${nextAppState}`, 'app');

      const appState = nextAppState === 'active' ? 'foreground' : 'background';
      userStateManager.setAppState(appState);

      // Update online status based on app state
      const isOnline = nextAppState === 'active';
      userStateManager.setOnlineStatus(isOnline);

      // ✅ WhatsApp/Telegram pattern: Check WebSocket connection when app resumes
      if (nextAppState === 'active') {
        logger.debug('App resumed to foreground - checking WebSocket connection', 'app');

        // 🔄 Smart Fallback: Invalidate transaction cache on foreground (Revolut/Square pattern)
        logger.debug('Invalidating transaction cache on app foreground', 'app');
        queryClient.invalidateQueries({ queryKey: ['transactions'] });

        // Check if WebSocket is connected
        if (!websocketService.isSocketConnected()) {
          logger.info('WebSocket disconnected, triggering reconnection', 'app');

          // Get fresh token and reconnect
          try {
            const token = await getAccessToken();
            if (token) {
              const connected = await websocketService.connect(token);

              if (connected) {
                logger.info('WebSocket reconnected successfully after app resume', 'app');

                // Rejoin entity room (rooms will be auto-rejoined by websocketService)
                const apiEntityId = await apiClient.getEntityId();
                if (apiEntityId) {
                  setTimeout(() => {
                    websocketService.joinEntityRoom(apiEntityId);
                  }, 100);
                }
              } else {
                logger.warn('WebSocket reconnection failed after app resume', 'app');
              }
            }
          } catch (error) {
            logger.error('Error reconnecting WebSocket on app resume', error, 'app');
          }
        } else {
          logger.debug('WebSocket already connected', 'app');
        }
      }
    });

    logger.info('App state monitoring initialized', 'app');
  }

  /**
   * 🚀 PHASE 2.4: Initialize push notifications for background message delivery
   */
  private async initializePushNotifications(): Promise<void> {
    try {
      logger.debug('Initializing push notifications', 'app');
      await pushNotificationService.initialize();
      logger.info('Push notifications initialized', 'app');
    } catch (error) {
      logger.error('Push notification initialization failed', error, 'app');
      // Continue without push notifications - WebSocket will still work
    }
  }

  /**
   * 🚀 PHASE 2.5: Initialize message sync for offline message reliability
   */
  private initializeMessageSync(user?: { entityId?: string }): void {
    try {
      logger.debug('Initializing message sync', 'app');
      timelineSyncService.initialize();

      // Set current entity ID for sync operations
      if (user?.entityId) {
        timelineSyncService.setCurrentEntityId(user.entityId);
        logger.debug(`Entity ID set for message sync: ${user.entityId}`, 'app');
      }

      logger.info('Message sync initialized', 'app');
    } catch (error) {
      logger.error('Message sync initialization failed', error, 'app');
      // Continue without message sync - basic messaging will still work
    }
  }

  /**
   * 🚀 PHASE 2.6: Initialize delivery confirmation system
   */
  private initializeDeliveryConfirmation(): void {
    try {
      logger.debug('Initializing delivery confirmation', 'app');
      deliveryConfirmationManager.initialize();
      logger.info('Delivery confirmation initialized', 'app');
    } catch (error) {
      logger.error('Delivery confirmation initialization failed', error, 'app');
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
    logger.debug('Cleaning up all services for user logout', 'app');

    // Clear handler retry interval if running
    if (this.handlerRetryInterval) {
      clearInterval(this.handlerRetryInterval);
      this.handlerRetryInterval = null;
      logger.debug('Cleared WebSocket handler retry interval', 'app');
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
      logger.debug('WebSocket disconnected for logout', 'app');
    } catch (error) {
      logger.warn('Error disconnecting WebSocket', 'app', {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Clear BackgroundSyncService state (LOCAL-FIRST: replaces MessageManager & TransactionManager)
    try {
      backgroundSyncService.stop();
      webSocketHandler.cleanup();
      logger.debug('Background sync and handlers cleaned up for logout', 'app');
    } catch (error) {
      logger.warn('Error cleaning up sync service', 'app', {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Cleanup network service
    if (this.networkCleanup) {
      try {
        this.networkCleanup();
        this.networkCleanup = null;
        logger.debug('Network service cleaned up', 'app');
      } catch (error) {
        logger.warn('Error cleaning up network service', 'app', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    this.isInitialized = false;
    logger.debug('All services cleaned up successfully', 'app');
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