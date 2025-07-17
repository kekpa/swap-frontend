// Created: Network connectivity and offline mode detection service - 2025-01-10

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import logger from '../utils/logger';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
  isOfflineMode: boolean;
}

// Simple EventEmitter replacement for React Native
class SimpleEventEmitter {
  private listeners: { [event: string]: Function[] } = {};

  on(event: string, callback: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Function): void {
    if (!this.listeners[event]) return;
    
    const index = this.listeners[event].indexOf(callback);
    if (index > -1) {
      this.listeners[event].splice(index, 1);
    }
  }

  once(event: string, callback: Function): void {
    const onceWrapper = (...args: any[]) => {
      this.off(event, onceWrapper);
      callback(...args);
    };
    this.on(event, onceWrapper);
  }

  emit(event: string, ...args: any[]): void {
    if (!this.listeners[event]) return;
    
    this.listeners[event].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        logger.error('[SimpleEventEmitter] Error in event callback:', error);
      }
    });
  }

  removeAllListeners(): void {
    this.listeners = {};
  }
}

class NetworkService extends SimpleEventEmitter {
  private static instance: NetworkService;
  private currentNetworkState: NetworkState = {
    isConnected: false,
    isInternetReachable: false,
    type: 'unknown',
    isOfflineMode: true,
  };
  
  private isInitialized = false;
  private unsubscribe: (() => void) | null = null;
  
  public static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService();
    }
    return NetworkService.instance;
  }
  
  private constructor() {
    super();
  }
  
  /**
   * Initialize network monitoring
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      logger.debug('[NetworkService] 🌐 Initializing network monitoring...');
      
      // Get initial network state
      const initialState = await NetInfo.fetch();
      this.updateNetworkState(initialState);
      
      // Subscribe to network state changes
      this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
        this.updateNetworkState(state);
      });
      
      this.isInitialized = true;
      logger.info('[NetworkService] ✅ Network monitoring initialized');
    } catch (error) {
      logger.error('[NetworkService] ❌ Failed to initialize network monitoring:', error instanceof Error ? error.message : String(error));
      // Assume offline mode if initialization fails
      this.currentNetworkState = {
        isConnected: false,
        isInternetReachable: false,
        type: 'unknown',
        isOfflineMode: true,
      };
    }
  }
  
  /**
   * Update network state and emit events
   */
  private updateNetworkState(netInfoState: NetInfoState): void {
    const previousState = { ...this.currentNetworkState };
    
    this.currentNetworkState = {
      isConnected: netInfoState.isConnected ?? false,
      isInternetReachable: netInfoState.isInternetReachable ?? false,
      type: netInfoState.type || 'unknown',
      isOfflineMode: !netInfoState.isConnected || !netInfoState.isInternetReachable,
    };
    
    // Log network state changes
    if (previousState.isOfflineMode !== this.currentNetworkState.isOfflineMode) {
      if (this.currentNetworkState.isOfflineMode) {
        logger.warn('[NetworkService] 📱 OFFLINE MODE ACTIVATED - App will use cached data');
        console.log('🌐 [NetworkService] 📱 OFFLINE MODE: App is now offline, switching to cached data');
      } else {
        logger.info('[NetworkService] 🌐 ONLINE MODE ACTIVATED - App will sync with server');
        console.log('🌐 [NetworkService] 🌐 ONLINE MODE: App is back online, resuming sync');
      }
    }
    
    // Emit network state change event
    this.emit('networkStateChange', this.currentNetworkState);
    
    // Emit specific events for easier listening
    if (previousState.isOfflineMode !== this.currentNetworkState.isOfflineMode) {
      if (this.currentNetworkState.isOfflineMode) {
        this.emit('offline');
      } else {
        this.emit('online');
      }
    }
  }
  
  /**
   * Get current network state
   */
  getNetworkState(): NetworkState {
    return { ...this.currentNetworkState };
  }
  
  /**
   * Check if app is currently offline
   */
  isOffline(): boolean {
    return this.currentNetworkState.isOfflineMode;
  }
  
  /**
   * Check if app is currently online
   */
  isOnline(): boolean {
    return !this.currentNetworkState.isOfflineMode;
  }
  
  /**
   * Wait for network to come online
   */
  async waitForOnline(timeout: number = 10000): Promise<boolean> {
    if (this.isOnline()) {
      return true;
    }
    
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.off('online', onlineHandler);
        resolve(false);
      }, timeout);
      
      const onlineHandler = () => {
        clearTimeout(timer);
        this.off('online', onlineHandler);
        resolve(true);
      };
      
      this.once('online', onlineHandler);
    });
  }
  
  /**
   * Execute function only when online, otherwise skip gracefully
   */
  async executeWhenOnline<T>(
    fn: () => Promise<T>,
    fallbackValue?: T,
    skipOfflineLog: boolean = false
  ): Promise<T | undefined> {
    if (this.isOffline()) {
      if (!skipOfflineLog) {
        logger.debug('[NetworkService] 📱 Skipping operation - offline mode');
      }
      return fallbackValue;
    }
    
    try {
      return await fn();
    } catch (error) {
      logger.warn('[NetworkService] ⚠️ Online operation failed:', error instanceof Error ? error.message : String(error));
      return fallbackValue;
    }
  }
  
  /**
   * Execute function with offline fallback
   */
  async executeWithOfflineFallback<T>(
    onlineFn: () => Promise<T>,
    offlineFn: () => Promise<T> | T
  ): Promise<T> {
    if (this.isOffline()) {
      logger.debug('[NetworkService] 📱 Using offline fallback');
      return await offlineFn();
    }
    
    try {
      return await onlineFn();
    } catch (error) {
      logger.warn('[NetworkService] ⚠️ Online operation failed, using offline fallback:', error instanceof Error ? error.message : String(error));
      return await offlineFn();
    }
  }
  
  /**
   * Add listener for network state changes
   */
  onNetworkStateChange(callback: (state: NetworkState) => void): () => void {
    this.on('networkStateChange', callback);
    
    // Return unsubscribe function
    return () => {
      this.off('networkStateChange', callback);
    };
  }
  
  /**
   * Add listener for offline events
   */
  onOffline(callback: () => void): () => void {
    this.on('offline', callback);
    return () => {
      this.off('offline', callback);
    };
  }
  
  /**
   * Add listener for online events
   */
  onOnline(callback: () => void): () => void {
    this.on('online', callback);
    return () => {
      this.off('online', callback);
    };
  }
  
  /**
   * Cleanup network monitoring
   */
  cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    
    this.removeAllListeners();
    this.isInitialized = false;
    
    logger.debug('[NetworkService] 🧹 Network monitoring cleaned up');
  }
}

// Export singleton instance
export const networkService = NetworkService.getInstance(); 