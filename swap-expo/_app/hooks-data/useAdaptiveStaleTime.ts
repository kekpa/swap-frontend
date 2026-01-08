/**
 * useAdaptiveStaleTime Hook
 * 
 * Provides adaptive stale time configuration for individual query hooks.
 * Automatically adjusts stale times based on current app state and user behavior.
 */

import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { staleTimeManager, type DataType, type UserBehavior } from '../tanstack-query/config/staleTimeConfig';
import logger from '../utils/logger';

interface UseAdaptiveStaleTimeOptions {
  dataType: DataType;
  userBehavior?: Partial<UserBehavior>;
  onStaleTimeChange?: (newStaleTime: number) => void;
}

/**
 * Hook that provides adaptive stale time based on current conditions
 */
export const useAdaptiveStaleTime = (options: UseAdaptiveStaleTimeOptions) => {
  const { dataType, userBehavior = {}, onStaleTimeChange } = options;
  
  const [currentStaleTime, setCurrentStaleTime] = useState(() => 
    staleTimeManager.getStaleTime(dataType)
  );

  // Update stale time when user behavior changes
  useEffect(() => {
    if (Object.keys(userBehavior).length > 0) {
      staleTimeManager.updateBehavior(userBehavior);
      const newStaleTime = staleTimeManager.getStaleTime(dataType);
      
      if (newStaleTime !== currentStaleTime) {
        setCurrentStaleTime(newStaleTime);
        onStaleTimeChange?.(newStaleTime);
        
        logger.debug('[useAdaptiveStaleTime] Stale time updated due to behavior change', 'data', {
          dataType,
          oldStaleTime: currentStaleTime,
          newStaleTime,
          userBehavior,
        });
      }
    }
  }, [dataType, userBehavior, currentStaleTime, onStaleTimeChange]);

  // Listen for app state changes that might affect stale time
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const newStaleTime = staleTimeManager.getStaleTime(dataType);
      
      if (newStaleTime !== currentStaleTime) {
        setCurrentStaleTime(newStaleTime);
        onStaleTimeChange?.(newStaleTime);
        
        logger.debug('[useAdaptiveStaleTime] Stale time updated due to app state change', 'data', {
          dataType,
          appState: nextAppState,
          oldStaleTime: currentStaleTime,
          newStaleTime,
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => subscription?.remove();
  }, [dataType, currentStaleTime, onStaleTimeChange]);

  return {
    staleTime: currentStaleTime,
    updateBehavior: (newBehavior: Partial<UserBehavior>) => {
      staleTimeManager.updateBehavior(newBehavior);
      const newStaleTime = staleTimeManager.getStaleTime(dataType);
      setCurrentStaleTime(newStaleTime);
    },
    getCurrentBehavior: staleTimeManager.getCurrentBehavior,
  };
};

/**
 * Hook specifically for balance queries with transaction-aware stale times
 */
export const useBalanceStaleTime = (hasRecentTransactions: boolean = false, isInPaymentFlow: boolean = false) => {
  return useAdaptiveStaleTime({
    dataType: 'balance',
    userBehavior: {
      hasRecentTransactions,
      isInCriticalFlow: isInPaymentFlow,
    },
  });
};

/**
 * Hook specifically for real-time data queries
 */
export const useRealtimeStaleTime = (isInCriticalFlow: boolean = false) => {
  return useAdaptiveStaleTime({
    dataType: 'realtime',
    userBehavior: {
      isInCriticalFlow,
    },
  });
};

/**
 * Hook specifically for interaction/messaging queries
 */
export const useInteractionStaleTime = (isActiveConversation: boolean = false) => {
  return useAdaptiveStaleTime({
    dataType: 'interaction',
    userBehavior: {
      isActiveUser: isActiveConversation,
    },
  });
};

/**
 * Higher-order hook creator for any data type
 */
export const createStaleTimeHook = (dataType: DataType) => {
  return (userBehavior?: Partial<UserBehavior>) => {
    return useAdaptiveStaleTime({ dataType, userBehavior });
  };
};

export default useAdaptiveStaleTime;