import { io, Socket } from 'socket.io-client';
import { ENV } from '../config/env';
import logger from '../utils/logger';
import { networkService } from './NetworkService';

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
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionPromise: Promise<boolean> | null = null;
  private isOfflineMode = false;

  constructor() {
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
        
        this.socket = io(socketUrl, {
          auth: { token },
          autoConnect: true,
          timeout: timeout,
          transports: ['websocket', 'polling'], // Match backend transports
          upgrade: false,
          rememberUpgrade: false,
          forceNew: false,
        });

        // Set up timeout for connection
        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            logger.warn('[WebSocket] ⏰ Connection timeout - treating as offline mode');
            this.handleConnectionFailure(new Error('Connection timeout'));
            resolve(false); // Don't reject, just return false for offline mode
          }
        }, timeout);

        this.socket.on('connect', () => {
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          this.isAuthenticated = true;
          this.reconnectAttempts = 0;
          logger.info('[WebSocket] ✅ Connected successfully');
          resolve(true);
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
          this.isAuthenticated = true;
          logger.info('[WebSocket] 🔐 Authentication successful');
        });

        this.socket.on('unauthorized', (error) => {
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

  // Enhanced methods with offline awareness
  joinInteraction(interactionId: string): void {
    if (this.isOfflineMode) {
      logger.debug(`[WebSocket] 📱 OFFLINE MODE: Cannot join interaction ${interactionId}`);
      return;
    }

    if (this.isConnected && this.socket) {
      this.socket.emit('join_interaction', { interactionId });
      logger.debug(`[WebSocket] 🏠 Joined interaction: ${interactionId}`);
      } else {
      logger.warn(`[WebSocket] ⚠️ Cannot join interaction ${interactionId} - not connected`);
      }
  }

  leaveInteraction(interactionId: string): void {
    if (this.isOfflineMode) {
      logger.debug(`[WebSocket] 📱 OFFLINE MODE: Cannot leave interaction ${interactionId}`);
          return;
        }
        
    if (this.isConnected && this.socket) {
      this.socket.emit('leave_interaction', { interactionId });
      logger.debug(`[WebSocket] 🚪 Left interaction: ${interactionId}`);
    }
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
      return () => {};
    }

    this.socket.on('new_message', callback);
    
    return () => {
      if (this.socket) {
        this.socket.off('new_message', callback);
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

  isSocketConnected(): boolean {
    return this.isConnected && !this.isOfflineMode;
  }

  isSocketAuthenticated(): boolean {
    return this.isAuthenticated && !this.isOfflineMode;
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
}

export const websocketService = new WebSocketService(); 