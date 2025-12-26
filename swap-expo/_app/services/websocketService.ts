import { io, Socket } from 'socket.io-client';
import { ENV } from '../config/env';
import logger from '../utils/logger';
import { networkService } from './NetworkService';
import { profileContextManager } from './ProfileContextManager';

interface WebSocketOptions {
  autoConnect?: boolean;
  timeout?: number;
  enableLogs?: boolean;
}

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private isAuthenticated = false;
  private authToken: string | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = Infinity; // ✅ Never give up (Socket.IO handles this now)
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionPromise: Promise<boolean> | null = null;
  private isOfflineMode = false;
  // ✅ Track rooms to rejoin after reconnection (WhatsApp/Telegram pattern)
  private currentEntityId: string | null = null;
  private activeInteractionRooms: Set<string> = new Set();

  // Profile switch cleanup function (React useEffect pattern)
  private cleanupProfileSwitch: (() => void) | null = null;

  constructor() {
    // Subscribe to profile switch events to clear room state
    this.subscribeToProfileSwitch();
    // Monitor network state changes
    networkService.onNetworkStateChange((state) => {
      this.isOfflineMode = state.isOfflineMode;
      
      if (state.isOfflineMode) {
        logger.info('[WebSocket] 📱 OFFLINE MODE: Disconnecting WebSocket gracefully');
        this.handleOfflineMode();
      } else {
        logger.info('[WebSocket] 🌐 ONLINE MODE: Will attempt to reconnect WebSocket');
        this.handleOnlineMode();
    }
    });
    
    // Get initial network state
    const initialState = networkService.getNetworkState();
    this.isOfflineMode = initialState.isOfflineMode;
  }

  private handleOfflineMode(): void {
    // Gracefully disconnect without showing errors
    if (this.socket && this.isConnected) {
      this.socket.disconnect();
      this.isConnected = false;
      logger.debug('[WebSocket] 📱 Disconnected due to offline mode');
    }
    
    // Clear any pending reconnection attempts
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.reconnectAttempts = 0;
    }
    
  private handleOnlineMode(): void {
    // Only reconnect if we were previously connected and have auth token
    if (this.authToken && !this.isConnected) {
      logger.debug('[WebSocket] 🔄 Network back online, attempting to reconnect...');
      setTimeout(() => {
        this.connect(this.authToken!);
      }, 1000); // Small delay to ensure network is stable
    }
  }

  /**
   * Subscribe to profile switch events to clear room state
   * CRITICAL: Prevents rejoining OLD profile's rooms after switch
   * Uses cleanup function pattern (React useEffect best practice)
   */
  private subscribeToProfileSwitch(): void {
    const unsubscribeSwitchStart = profileContextManager.onSwitchStart(() => {
      logger.info('[WebSocket] 🔄 Profile switch starting - clearing room state');

      // Clear entity room (prevents rejoining old profile's entity room)
      this.currentEntityId = null;

      // Clear interaction rooms (prevents rejoining old profile's chats)
      this.activeInteractionRooms.clear();

      // Reset authentication state (new profile needs new auth)
      this.isAuthenticated = false;

      logger.debug('[WebSocket] ✅ Room state cleared for profile switch');
    });

    const unsubscribeSwitchComplete = profileContextManager.onSwitchComplete((data) => {
      logger.info('[WebSocket] ✅ Profile switch complete - ready for new profile rooms');
      // New rooms will be joined explicitly by app code after switch
    });

    const unsubscribeSwitchFailed = profileContextManager.onSwitchFailed(() => {
      logger.warn('[WebSocket] ⚠️ Profile switch failed - room state already cleared');
      // State already cleared on switch start, no action needed
    });

    // Store cleanup function
    this.cleanupProfileSwitch = () => {
      unsubscribeSwitchStart();
      unsubscribeSwitchComplete();
      unsubscribeSwitchFailed();
      logger.debug('[WebSocket] Profile switch subscriptions cleaned up');
    };
  }

  async connect(token: string, options: WebSocketOptions = {}): Promise<boolean> {
    // Skip connection attempts when offline
    if (this.isOfflineMode) {
      logger.debug('[WebSocket] 📱 OFFLINE MODE: Skipping WebSocket connection attempt');
      return false;
    }

    // Return existing connection promise if already connecting
    if (this.connectionPromise) {
      logger.debug('[WebSocket] Connection already in progress, waiting for completion');
      return this.connectionPromise;
    }

    this.authToken = token;
    const { autoConnect = true, timeout = 10000, enableLogs = false } = options;

    this.connectionPromise = this.performConnection(token, timeout, enableLogs);
    
    try {
      const result = await this.connectionPromise;
      return result;
    } finally {
      this.connectionPromise = null;
    }
  }
  
  private async performConnection(token: string, timeout: number, enableLogs: boolean): Promise<boolean> {
      return new Promise((resolve, reject) => {
      try {
        if (this.isConnected && this.socket) {
          logger.debug('[WebSocket] Already connected');
          resolve(true);
          return;
        }

        // Skip if offline
        if (this.isOfflineMode) {
          logger.debug('[WebSocket] 📱 OFFLINE MODE: Aborting connection attempt');
          resolve(false);
          return;
        }
        
        logger.debug('[WebSocket] 🔌 Attempting to connect to WebSocket server...');

        // Backend WebSocket server uses /messaging namespace
        const socketUrl = `${ENV.REALTIME_URL}/messaging`;
        logger.debug(`[WebSocket] 🔌 Connecting to: ${socketUrl}`);
        logger.info(`[WebSocket] 🔌 Full URL for debugging: ${socketUrl}`);
        console.log('🔥🔥🔥 [websocketService] ATTEMPTING CONNECTION:', {
          url: socketUrl,
          realtimeUrl: ENV.REALTIME_URL,
          hasToken: !!token,
          isOfflineMode: this.isOfflineMode,
          timestamp: new Date().toISOString()
        });
        
        this.socket = io(socketUrl, {
          auth: { token },
          autoConnect: true,
          timeout: timeout,
          transports: ['websocket', 'polling'], // Match backend transports
          upgrade: false,
          rememberUpgrade: false,
          forceNew: false,
          // ✅ WhatsApp/Telegram pattern: Auto-reconnect with infinite retries
          reconnection: true,              // Enable auto-reconnect
          reconnectionDelay: 1000,         // Start with 1 second delay
          reconnectionDelayMax: 5000,      // Max 5 seconds between attempts
          reconnectionAttempts: Infinity,  // Never give up (like WhatsApp/Telegram)
          randomizationFactor: 0.5,        // Add jitter to prevent thundering herd
        });

        // Set up timeout for connection
        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            logger.warn('[WebSocket] ⏰ Connection timeout - treating as offline mode');
            this.handleConnectionFailure(new Error('Connection timeout'));
            resolve(false); // Don't reject, just return false for offline mode
          }
        }, timeout);

        // Set up timeout for authentication (5 seconds after connection)
        let authTimeout: NodeJS.Timeout | null = null;

        this.socket.on('connect', () => {
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          logger.info('[WebSocket] ✅ Connected successfully');
          console.log('🔥🔥🔥 [websocketService] SOCKET CONNECTED:', {
            socketId: this.socket?.id,
            willAuthenticate: true,
            timestamp: new Date().toISOString()
          });

          // Send authentication message to backend
          logger.debug('[WebSocket] 🔐 Sending authentication token...');
          console.log('🔥🔥🔥 [websocketService] SENDING AUTH TOKEN:', {
            tokenLength: token ? token.length : 0,
            tokenStart: token ? token.substring(0, 20) : 'null',
            socketId: this.socket?.id,
            timestamp: new Date().toISOString()
          });
          this.socket!.emit('authenticate', { token });

          // Wait for 'authenticated' event before resolving (5 second timeout)
          authTimeout = setTimeout(() => {
            if (!this.isAuthenticated) {
              logger.warn('[WebSocket] ⏰ Authentication timeout - no response from backend');
              console.log('🔥🔥🔥 [websocketService] AUTH TIMEOUT - NO BACKEND RESPONSE');
              resolve(false);
            }
          }, 5000);
        });

        this.socket.on('disconnect', (reason) => {
          clearTimeout(connectionTimeout);
          this.isConnected = false;
          this.isAuthenticated = false;
          
          if (this.isOfflineMode) {
            logger.debug(`[WebSocket] 📱 Disconnected due to offline mode: ${reason}`);
          } else {
            logger.warn(`[WebSocket] ⚠️ Disconnected: ${reason}`);
            this.handleReconnection();
          }
        });
        
        this.socket.on('connect_error', (error) => {
          clearTimeout(connectionTimeout);
          
          if (this.isOfflineMode) {
            logger.debug('[WebSocket] 📱 Connection error in offline mode (expected)');
            resolve(false);
          } else {
            logger.warn('[WebSocket] ❌ Connection error:', error.message);
            logger.debug(`[WebSocket] Error Message: ${error.message}`);
            logger.debug(`[WebSocket] Error Type: ${(error as any).type || 'Unknown'}`);
            logger.debug(`[WebSocket] Error Details: ${JSON.stringify(error, null, 2)}`);
            logger.warn('[WebSocket] ⚠️ Connection refused. Ensure the real-time server is running at ${socketUrl} and that your device is on the same network.');
            this.handleConnectionFailure(error);
            resolve(false); // Don't reject, return false for graceful handling
          }
        });
        
        // Handle authentication events
        this.socket.on('authenticated', () => {
          if (authTimeout) clearTimeout(authTimeout);
          this.isAuthenticated = true;
          logger.info('[WebSocket] 🔐 Authentication successful');
          console.log('🔥🔥🔥 [websocketService] AUTHENTICATED EVENT RECEIVED:', {
            isAuthenticated: this.isAuthenticated,
            isConnected: this.isConnected,
            socketId: this.socket?.id,
            timestamp: new Date().toISOString()
          });

          // ✅ WhatsApp/Telegram pattern: Auto-rejoin all rooms after reconnection
          this.rejoinAllRooms();

          resolve(true); // NOW resolve after backend confirms authentication
        });

        this.socket.on('unauthorized', (error) => {
          if (authTimeout) clearTimeout(authTimeout);
          this.isAuthenticated = false;
          logger.error('[WebSocket] 🚫 Authentication failed:', error.message);
          resolve(false);
      });

      } catch (error) {
        logger.error('[WebSocket] ❌ Failed to create socket connection:', error);
        resolve(false);
    }
    });
  }

  private handleConnectionFailure(error: any): void {
    if (this.isOfflineMode) {
      // Don't show errors or attempt reconnection in offline mode
      return;
    }

    if (error && error.message) {
      logger.debug(`[WebSocket] Error Message: ${error.message}`);
      }
    if (error && error.type) {
      logger.debug(`[WebSocket] Error Type: ${error.type}`);
      }
  }

  private handleReconnection(): void {
    // Don't reconnect in offline mode
    if (this.isOfflineMode) {
            return;
          }

    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);

      logger.debug(`[WebSocket] 🔄 Attempting reconnection ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);

      this.reconnectTimer = setTimeout(() => {
        if (this.authToken && !this.isOfflineMode) {
          this.connect(this.authToken);
        }
      }, delay);
              } else {
      logger.warn('[WebSocket] ❌ Max reconnection attempts reached');
              }
            }

  // ✅ WhatsApp/Telegram pattern: Rejoin all rooms after reconnection
  private rejoinAllRooms(): void {
    logger.info('[WebSocket] 🔄 Rejoining all active rooms after reconnection...');

    // Rejoin entity room if we have one
    if (this.currentEntityId) {
      logger.debug(`[WebSocket] 🏠 Rejoining entity room: ${this.currentEntityId}`);
      this.joinEntityRoom(this.currentEntityId);
    }

    // Rejoin all interaction rooms
    if (this.activeInteractionRooms.size > 0) {
      logger.debug(`[WebSocket] 🏠 Rejoining ${this.activeInteractionRooms.size} interaction rooms`);
      this.activeInteractionRooms.forEach(interactionId => {
        this.joinInteraction(interactionId);
      });
    }
  }

  // Enhanced methods with offline awareness
  joinInteraction(interactionId: string): void {
    if (this.isOfflineMode) {
      logger.debug(`[WebSocket] 📱 OFFLINE MODE: Cannot join interaction ${interactionId}`);
      return;
    }

    if (!this.isConnected || !this.socket) {
      logger.warn(`[WebSocket] ⚠️ Cannot join interaction ${interactionId} - not connected`);
      console.log('🔥🔥🔥 [websocketService] INTERACTION JOIN FAILED - NOT CONNECTED:', {
        interactionId,
        isConnected: this.isConnected,
        hasSocket: !!this.socket,
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!this.isAuthenticated) {
      logger.warn(`[WebSocket] Socket not authenticated. Cannot join interaction room.`);
      console.log('🔥🔥🔥 [websocketService] INTERACTION JOIN FAILED - NOT AUTHENTICATED:', {
        interactionId,
        isAuthenticated: this.isAuthenticated,
        timestamp: new Date().toISOString()
      });
      return;
    }

    logger.info(`[WebSocket] 🏠 Attempting to join interaction: ${interactionId}`);
    console.log('🔥🔥🔥 [websocketService] JOINING INTERACTION ROOM:', {
      interactionId,
      socketId: this.socket?.id,
      isConnected: this.isConnected,
      isAuthenticated: this.isAuthenticated,
      timestamp: new Date().toISOString()
    });

    this.socket.emit('join_interaction', { interactionId }, (response: any) => {
      if (response?.success) {
        // ✅ Track this room for auto-rejoin after reconnection
        this.activeInteractionRooms.add(interactionId);
        logger.info(`[WebSocket] 🏠 Successfully joined interaction: ${interactionId}`);
        console.log('🔥🔥🔥 [websocketService] INTERACTION ROOM JOIN SUCCESS:', {
          interactionId,
          response,
          socketId: this.socket?.id,
          timestamp: new Date().toISOString()
        });
      } else {
        logger.error(`[WebSocket] 🚫 Failed to join interaction: ${interactionId}`, response?.error);
        console.log('🔥🔥🔥 [websocketService] INTERACTION ROOM JOIN FAILED:', {
          interactionId,
          error: response?.error,
          socketId: this.socket?.id,
          timestamp: new Date().toISOString()
        });

        // Retry once after a short delay if authentication failed
        if (response?.error === 'Not authenticated') {
          setTimeout(() => {
            console.log('🔥🔥🔥 [websocketService] RETRYING INTERACTION ROOM JOIN after authentication failure...');
            if (this.isConnected && this.socket && this.isAuthenticated) {
              this.joinInteraction(interactionId);
            }
          }, 1000);
        }
      }
    });
  }

  leaveInteraction(interactionId: string): void {
    if (this.isOfflineMode) {
      logger.debug(`[WebSocket] 📱 OFFLINE MODE: Cannot leave interaction ${interactionId}`);
          return;
        }

    if (this.isConnected && this.socket) {
      this.socket.emit('leave_interaction', { interactionId });
      // ✅ Remove from tracking (won't rejoin after reconnection)
      this.activeInteractionRooms.delete(interactionId);
      logger.debug(`[WebSocket] 🚪 Left interaction: ${interactionId}`);
    }
  }

  // 🔧 DATABASE-FIRST FIX: Use entity_id for messaging rooms (unified personal/business system)
  joinEntityRoom(entityId: string): void {
    if (this.isOfflineMode) {
      logger.debug(`[WebSocket] 📱 OFFLINE MODE: Cannot join entity room ${entityId}`);
      return;
    }

    if (!this.isConnected || !this.socket) {
      logger.warn(`[WebSocket] ⚠️ Cannot join entity room ${entityId} - not connected`);
      return;
    }

    if (!this.isAuthenticated) {
      logger.warn(`[WebSocket] Socket not authenticated. Cannot join entity room.`);
      return;
    }

    this.socket.emit('join_profile_room', { entityId }, (response: any) => {
      if (response?.success) {
        // ✅ Track current entity room for auto-rejoin after reconnection
        this.currentEntityId = entityId;
        logger.info(`[WebSocket] 🏠 Successfully joined entity room: ${entityId}`);
        console.log('🔥🔥🔥 [websocketService] ENTITY ROOM JOIN SUCCESS:', {
          entityId,
          entityRoom: response.entityRoom,
          socketId: this.socket?.id,
          timestamp: new Date().toISOString()
        });
      } else {
        logger.error(`[WebSocket] 🚫 Failed to join entity room: ${entityId}`, response?.error);
        console.log('🔥🔥🔥 [websocketService] ENTITY ROOM JOIN FAILED:', {
          entityId,
          error: response?.error,
          socketId: this.socket?.id,
          timestamp: new Date().toISOString()
        });

        // Retry once after a short delay if authentication failed
        if (response?.error === 'Not authenticated') {
          setTimeout(() => {
            console.log('🔥🔥🔥 [websocketService] RETRYING ENTITY ROOM JOIN after authentication failure...');
            if (this.isConnected && this.socket && this.isAuthenticated) {
              this.joinEntityRoom(entityId);
            }
          }, 1000);
        }
      }
    });
    
    logger.info(`[WebSocket] 🏠 Attempting to join entity room: ${entityId}`);
  }

  // Legacy method for backward compatibility - will be removed after migration
  joinProfileRoom(profileId: string): void {
    logger.warn(`[WebSocket] ⚠️ DEPRECATED: joinProfileRoom() called with profileId: ${profileId}. Use joinEntityRoom() with entity_id instead.`);
    // For now, assume profileId is actually entityId for backward compatibility
    this.joinEntityRoom(profileId);
  }

  sendMessage(messageData: any): void {
    if (this.isOfflineMode) {
      logger.debug('[WebSocket] 📱 OFFLINE MODE: Cannot send message via WebSocket');
        return;
      }

    if (this.isConnected && this.socket) {
      this.socket.emit('send_message', messageData);
      logger.debug('[WebSocket] 📤 Message sent via WebSocket');
    } else {
      logger.warn('[WebSocket] ⚠️ Cannot send message - not connected');
    }
  }

  onMessage(callback: (data: any) => void): () => void {
    if (!this.socket) {
      logger.warn('[WebSocket] ⚠️ Cannot listen for messages - socket not initialized');
      console.warn('🔥🔥🔥 [websocketService] ❌ EVENT LISTENER ATTACHMENT FAILED:', {
        reason: 'SOCKET_NOT_INITIALIZED',
        isConnected: this.isConnected,
        isAuthenticated: this.isAuthenticated,
        hasSocket: !!this.socket,
        timestamp: new Date().toISOString(),
        hint: 'WebSocketHandler was initialized before WebSocket connection succeeded'
      });
      return () => {};
    }

    // Wrap callback with logging to track raw Socket.IO events
    const wrappedCallback = (data: any) => {
      console.log('🔥🔥🔥 [websocketService] RAW SOCKET.IO EVENT RECEIVED:', {
        event: 'new_message',
        messageId: data?.id,
        interactionId: data?.interaction_id,
        fromEntityId: data?.from_entity_id,
        timestamp: new Date().toISOString(),
        socketConnected: this.isConnected,
        socketAuthenticated: this.isAuthenticated,
      });
      callback(data);
    };

    this.socket.on('new_message', wrappedCallback);

    console.log('🔥🔥🔥 [websocketService] ✅ EVENT LISTENER ATTACHED:', {
      event: 'new_message',
      socketId: this.socket.id,
      isConnected: this.isConnected,
      isAuthenticated: this.isAuthenticated,
      timestamp: new Date().toISOString()
    });

    return () => {
      if (this.socket) {
        this.socket.off('new_message', wrappedCallback);
          }
    };
  }

  onTransactionUpdate(callback: (data: any) => void): () => void {
    if (!this.socket) {
      logger.warn('[WebSocket] ⚠️ Cannot listen for transaction updates - socket not initialized');
      return () => {};
    }

    this.socket.on('transaction_update', callback);

    return () => {
      if (this.socket) {
        this.socket.off('transaction_update', callback);
    }
  };
  }

  onKycUpdate(callback: (data: any) => void): () => void {
    if (!this.socket) {
      logger.warn('[WebSocket] ⚠️ Cannot listen for KYC updates - socket not initialized');
      return () => {};
    }

    this.socket.on('kyc_status_update', callback);

    return () => {
      if (this.socket) {
        this.socket.off('kyc_status_update', callback);
      }
    };
  }

  /**
   * Listen for reconnection events (authenticated event after reconnection)
   * This allows external code to perform cache invalidation or refetch on reconnect
   */
  onReconnect(callback: () => void): () => void {
    if (!this.socket) {
      logger.warn('[WebSocket] ⚠️ Cannot listen for reconnect - socket not initialized');
      return () => {};
    }

    // Listen to 'authenticated' event which fires after successful reconnection
    this.socket.on('authenticated', callback);

    return () => {
      if (this.socket) {
        this.socket.off('authenticated', callback);
      }
    };
  }

  isSocketConnected(): boolean {
    return this.isConnected && !this.isOfflineMode;
  }

  isSocketAuthenticated(): boolean {
    return this.isAuthenticated && !this.isOfflineMode;
  }

  /**
   * Generic event listener - Standard EventEmitter pattern
   *
   * This is the PROFESSIONAL approach used by:
   * - Socket.io native API
   * - Node.js EventEmitter
   * - RxJS Observable
   *
   * @param event - Event name to listen for
   * @param callback - Handler function
   * @returns Cleanup function to unsubscribe
   */
  on<T = any>(event: string, callback: (data: T) => void): () => void {
    if (!this.socket) {
      logger.warn(`[WebSocket] ⚠️ Cannot listen for '${event}' - socket not initialized`);
      return () => {};
    }

    this.socket.on(event, callback);

    // Return cleanup function (React useEffect pattern)
    return () => {
      if (this.socket) {
        this.socket.off(event, callback);
      }
    };
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.isAuthenticated = false;
    this.reconnectAttempts = 0;

    logger.debug('[WebSocket] 🔌 Disconnected and cleaned up');
  }

  /**
   * Full cleanup including profile switch subscriptions
   * Call this on logout to prevent memory leaks
   */
  cleanup(): void {
    logger.debug('[WebSocket] 🧹 Full cleanup starting...');

    // Disconnect socket
    this.disconnect();

    // Clear room state
    this.currentEntityId = null;
    this.activeInteractionRooms.clear();

    // Cleanup profile switch subscriptions (prevents memory leak)
    this.cleanupProfileSwitch?.();
    this.cleanupProfileSwitch = null;

    logger.info('[WebSocket] ✅ Full cleanup complete');
  }
}

export const websocketService = new WebSocketService(); 