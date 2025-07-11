/**
 * Stale Time Configuration
 * 
 * Optimizes stale time settings based on data type, update frequency, and user behavior.
 * Implements intelligent caching strategies for different types of financial data.
 */

import { logger } from '../../utils/logger';

// Data type categories for stale time optimization
export type DataType = 
  | 'balance'           // Account balances - critical, frequent updates
  | 'transaction'       // Transaction history - append-only, stable
  | 'interaction'       // Messages/interactions - real-time updates
  | 'profile'           // User profile - infrequent updates
  | 'notification'      // Notifications - real-time, high priority
  | 'static'            // Static data (countries, currencies) - very stable
  | 'realtime'          // Real-time data (exchange rates) - frequent updates
  | 'analytics'         // Analytics/reports - can be cached longer
  | 'settings';         // User settings - infrequent updates

// User behavior patterns that affect caching strategy
export interface UserBehavior {
  isActiveUser: boolean;        // High activity users need fresher data
  hasRecentTransactions: boolean; // Users with recent activity need fresh balance data
  isInCriticalFlow: boolean;    // Users in payment/transfer flows need real-time data
  networkCondition: 'fast' | 'slow' | 'offline'; // Network affects refresh frequency
  devicePerformance: 'high' | 'medium' | 'low';  // Device performance affects batch size
}

// Time constants (in milliseconds)
const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;

// Base stale time configurations for each data type
const BASE_STALE_TIMES: Record<DataType, number> = {
  // Critical financial data - short stale times
  balance: 30 * TIME.SECOND,      // 30s - balances change frequently
  transaction: 2 * TIME.MINUTE,   // 2m - new transactions appear regularly
  notification: 15 * TIME.SECOND, // 15s - notifications are time-sensitive
  
  // Interactive data - medium stale times
  interaction: 1 * TIME.MINUTE,   // 1m - messages should be relatively fresh
  realtime: 30 * TIME.SECOND,     // 30s - exchange rates, market data
  
  // User data - longer stale times
  profile: 10 * TIME.MINUTE,      // 10m - profiles change infrequently
  settings: 15 * TIME.MINUTE,     // 15m - settings rarely change
  
  // Static/analytical data - very long stale times
  static: 1 * TIME.HOUR,          // 1h - countries, currencies rarely change
  analytics: 5 * TIME.MINUTE,     // 5m - reports can be slightly stale
};

// Stale time multipliers based on user behavior
const BEHAVIOR_MULTIPLIERS = {
  isActiveUser: {
    true: 0.5,   // Active users get fresher data (50% of base time)
    false: 2.0,  // Inactive users can have staler data (200% of base time)
  },
  hasRecentTransactions: {
    true: 0.3,   // Recent transaction users need very fresh balance data
    false: 1.5,  // Users without recent transactions can have staler data
  },
  isInCriticalFlow: {
    true: 0.1,   // Critical flows need near real-time data (10% of base)
    false: 1.0,  // Normal flows use base time
  },
  networkCondition: {
    fast: 1.0,   // Fast network uses base times
    slow: 2.0,   // Slow network caches longer to reduce requests
    offline: 10.0, // Offline mode uses very long stale times
  },
  devicePerformance: {
    high: 0.8,   // High-performance devices can handle more frequent updates
    medium: 1.0, // Medium devices use base times
    low: 1.5,    // Low-performance devices cache longer
  },
} as const;

// Maximum and minimum bounds to prevent extreme values
const STALE_TIME_BOUNDS = {
  min: 5 * TIME.SECOND,   // Never fresher than 5 seconds
  max: 1 * TIME.HOUR,     // Never staler than 1 hour
} as const;

/**
 * Calculate optimized stale time based on data type and user behavior
 */
export const calculateStaleTime = (
  dataType: DataType,
  userBehavior: Partial<UserBehavior> = {}
): number => {
  const baseTime = BASE_STALE_TIMES[dataType];
  
  // Default behavior values
  const behavior: UserBehavior = {
    isActiveUser: true,
    hasRecentTransactions: false,
    isInCriticalFlow: false,
    networkCondition: 'fast',
    devicePerformance: 'medium',
    ...userBehavior,
  };

  // Calculate multiplier based on all behavior factors
  let multiplier = 1.0;
  
  multiplier *= BEHAVIOR_MULTIPLIERS.isActiveUser[behavior.isActiveUser.toString() as 'true' | 'false'];
  multiplier *= BEHAVIOR_MULTIPLIERS.hasRecentTransactions[behavior.hasRecentTransactions.toString() as 'true' | 'false'];
  multiplier *= BEHAVIOR_MULTIPLIERS.isInCriticalFlow[behavior.isInCriticalFlow.toString() as 'true' | 'false'];
  multiplier *= BEHAVIOR_MULTIPLIERS.networkCondition[behavior.networkCondition];
  multiplier *= BEHAVIOR_MULTIPLIERS.devicePerformance[behavior.devicePerformance];

  // Apply multiplier to base time
  const calculatedTime = Math.round(baseTime * multiplier);
  
  // Apply bounds
  const boundedTime = Math.max(
    STALE_TIME_BOUNDS.min,
    Math.min(STALE_TIME_BOUNDS.max, calculatedTime)
  );

  logger.debug('[staleTimeConfig] Calculated stale time:', {
    dataType,
    baseTime,
    behavior,
    multiplier: multiplier.toFixed(2),
    calculatedTime,
    boundedTime,
    humanReadable: `${Math.round(boundedTime / 1000)}s`,
  });

  return boundedTime;
};

/**
 * Predefined configurations for common scenarios
 */
export const STALE_TIME_PRESETS = {
  // Real-time trading/payment flows
  CRITICAL_FLOW: {
    isActiveUser: true,
    hasRecentTransactions: true,
    isInCriticalFlow: true,
    networkCondition: 'fast' as const,
    devicePerformance: 'high' as const,
  },
  
  // Active user browsing
  ACTIVE_USER: {
    isActiveUser: true,
    hasRecentTransactions: false,
    isInCriticalFlow: false,
    networkCondition: 'fast' as const,
    devicePerformance: 'medium' as const,
  },
  
  // Background/inactive state
  BACKGROUND_MODE: {
    isActiveUser: false,
    hasRecentTransactions: false,
    isInCriticalFlow: false,
    networkCondition: 'fast' as const,
    devicePerformance: 'medium' as const,
  },
  
  // Poor network conditions
  SLOW_NETWORK: {
    isActiveUser: true,
    hasRecentTransactions: false,
    isInCriticalFlow: false,
    networkCondition: 'slow' as const,
    devicePerformance: 'medium' as const,
  },
  
  // Offline mode
  OFFLINE_MODE: {
    isActiveUser: false,
    hasRecentTransactions: false,
    isInCriticalFlow: false,
    networkCondition: 'offline' as const,
    devicePerformance: 'medium' as const,
  },
} as const;

/**
 * Hook-specific stale time configurations
 */
export const getStaleTimeForQuery = (queryType: string, userBehavior?: Partial<UserBehavior>): number => {
  // Map query types to data types
  const queryTypeMap: Record<string, DataType> = {
    // Balance queries
    'balancesByEntity': 'balance',
    'balance': 'balance',
    'walletBalance': 'balance',
    
    // Transaction queries
    'recentTransactions': 'transaction',
    'transactionHistory': 'transaction',
    'transaction': 'transaction',
    
    // Interaction/messaging queries
    'interactionsByEntity': 'interaction',
    'timeline': 'interaction',
    'messages': 'interaction',
    
    // Profile queries
    'userProfile': 'profile',
    'profile': 'profile',
    
    // Notification queries
    'notifications': 'notification',
    'unreadCount': 'notification',
    
    // Settings queries
    'userSettings': 'settings',
    'appSettings': 'settings',
    
    // Static data queries
    'countries': 'static',
    'currencies': 'static',
    'exchangeRates': 'realtime',
    
    // Analytics queries
    'analytics': 'analytics',
    'reports': 'analytics',
    'insights': 'analytics',
  };

  const dataType = queryTypeMap[queryType] || 'static';
  return calculateStaleTime(dataType, userBehavior);
};

/**
 * Dynamic stale time calculator that adapts to app state
 */
export class DynamicStaleTimeManager {
  private currentBehavior: UserBehavior = STALE_TIME_PRESETS.ACTIVE_USER;
  private lastUpdateTime = Date.now();

  updateBehavior(newBehavior: Partial<UserBehavior>) {
    this.currentBehavior = { ...this.currentBehavior, ...newBehavior };
    this.lastUpdateTime = Date.now();
    
    logger.debug('[DynamicStaleTimeManager] Behavior updated:', {
      newBehavior: this.currentBehavior,
      timestamp: this.lastUpdateTime,
    });
  }

  getStaleTime(dataType: DataType): number {
    return calculateStaleTime(dataType, this.currentBehavior);
  }

  // Auto-adjust behavior based on app state
  adjustForAppState(appState: 'active' | 'background' | 'inactive') {
    switch (appState) {
      case 'active':
        this.updateBehavior({ isActiveUser: true });
        break;
      case 'background':
      case 'inactive':
        this.updateBehavior({ isActiveUser: false, isInCriticalFlow: false });
        break;
    }
  }

  // Auto-adjust behavior based on network conditions
  adjustForNetwork(isOnline: boolean, isSlowNetwork: boolean = false) {
    if (!isOnline) {
      this.updateBehavior({ networkCondition: 'offline' });
    } else if (isSlowNetwork) {
      this.updateBehavior({ networkCondition: 'slow' });
    } else {
      this.updateBehavior({ networkCondition: 'fast' });
    }
  }

  // Get current behavior for debugging
  getCurrentBehavior(): UserBehavior {
    return { ...this.currentBehavior };
  }
}

// Global instance for use across the app
export const staleTimeManager = new DynamicStaleTimeManager();

/**
 * Utility functions for common stale time calculations
 */
export const StaleTimeUtils = {
  // Get stale time for balance data based on recent activity
  forBalance: (hasRecentTransactions: boolean = false, isInPaymentFlow: boolean = false) => {
    return calculateStaleTime('balance', {
      hasRecentTransactions,
      isInCriticalFlow: isInPaymentFlow,
    });
  },

  // Get stale time for transaction history
  forTransactions: (isActiveUser: boolean = true) => {
    return calculateStaleTime('transaction', { isActiveUser });
  },

  // Get stale time for real-time data during critical flows
  forCriticalFlow: (dataType: DataType) => {
    return calculateStaleTime(dataType, STALE_TIME_PRESETS.CRITICAL_FLOW);
  },

  // Get stale time for background mode
  forBackground: (dataType: DataType) => {
    return calculateStaleTime(dataType, STALE_TIME_PRESETS.BACKGROUND_MODE);
  },

  // Get human-readable time description
  humanize: (timeMs: number): string => {
    if (timeMs < TIME.MINUTE) {
      return `${Math.round(timeMs / TIME.SECOND)}s`;
    } else if (timeMs < TIME.HOUR) {
      return `${Math.round(timeMs / TIME.MINUTE)}m`;
    } else {
      return `${Math.round(timeMs / TIME.HOUR)}h`;
    }
  },
};

export default {
  calculateStaleTime,
  getStaleTimeForQuery,
  staleTimeManager,
  StaleTimeUtils,
  STALE_TIME_PRESETS,
};