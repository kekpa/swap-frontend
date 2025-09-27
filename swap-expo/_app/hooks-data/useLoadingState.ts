/**
 * useLoadingState Hook
 * 
 * Replaces DataContext loading state logic with TanStack Query approach.
 * Monitors the loading state of essential app data for initial load completion.
 */

import { useMemo } from 'react';
import { useBalances } from './useBalances';
import { useInteractions } from './useInteractions';
import { useAuthContext } from '../features/auth/context/AuthContext';
import logger from '../utils/logger';

interface LoadingState {
  isLoading: boolean;
  progress: number;
  completedTasks: Set<string>;
  requiredTasks: string[];
  errors: string[];
}

interface UseLoadingStateResult {
  isInitialLoadComplete: boolean;
  loadingState: LoadingState;
  isLoadingBalances: boolean;
  isLoadingInteractions: boolean;
  isLoadingUserData: boolean;
  hasLoadedBalances: boolean;
  hasLoadedInteractions: boolean;
  hasLoadedUserData: boolean;
  hasLocalData: () => Promise<boolean>;
  hasEssentialLocalData: () => Promise<boolean>;
}

/**
 * Hook to manage app-wide loading state using TanStack Query
 */
export const useLoadingState = (): UseLoadingStateResult => {
  const authContext = useAuthContext();
  const entityId = authContext?.user?.entityId || '';

  // PROFESSIONAL FIX: Only load balances when user is authenticated and has entity ID
  const isAuthenticated = authContext?.isAuthenticated || false;
  const shouldLoadBalances = isAuthenticated && entityId && entityId !== '';

  // Get loading states from individual hooks - with authentication guard
  const {
    isLoading: isLoadingBalances,
    data: balancesData,
    error: balancesError
  } = useBalances(entityId, { enabled: shouldLoadBalances });
  
  const { 
    interactions: interactionsData,
    isLoading: isLoadingInteractions, 
    error: interactionsError 
  } = useInteractions();
  
  // Use auth context for user data
  const isLoadingUserData = authContext?.isLoading || false;
  const userProfileData = authContext?.user;
  const userProfileError = null;

  // Calculate loading state with proper memoization to prevent unnecessary re-renders
  const requiredTasks = useMemo(() => ['balances', 'interactions', 'userProfile'], []);

  const { completedTasks, errors } = useMemo(() => {
    const completed = new Set<string>();
    const errorList: string[] = [];

    // Check completed tasks with authentication awareness
    if (shouldLoadBalances) {
      // Only check balances if authentication allows it
      if (balancesData !== undefined && !isLoadingBalances) {
        completed.add('balances');
      }
    } else {
      // Mark balances as completed if user isn't authenticated yet (skip balances for unauthenticated users)
      completed.add('balances');
    }

    if (interactionsData && !isLoadingInteractions) {
      completed.add('interactions');
    }
    if (userProfileData && !isLoadingUserData) {
      completed.add('userProfile');
    }

    // Check errors - but ignore auth-related balance errors
    if (balancesError && shouldLoadBalances) {
      errorList.push(`Balances: ${balancesError.message || 'Unknown error'}`);
    }
    if (interactionsError) {
      errorList.push(`Interactions: ${interactionsError.message || 'Unknown error'}`);
    }

    return { completedTasks: completed, errors: errorList };
  }, [balancesData, isLoadingBalances, interactionsData, isLoadingInteractions, userProfileData, isLoadingUserData, balancesError, interactionsError, shouldLoadBalances]);

  // Calculate progress and loading state with memoization
  const { progress, isLoading, isInitialLoadComplete, loadingState } = useMemo(() => {
    const prog = (completedTasks.size / requiredTasks.length) * 100;
    const loading = isLoadingBalances || isLoadingInteractions || isLoadingUserData;
    const complete = completedTasks.size === requiredTasks.length && !loading;

    const state: LoadingState = {
      isLoading: loading,
      progress: prog,
      completedTasks,
      requiredTasks,
      errors,
    };

    return {
      progress: prog,
      isLoading: loading,
      isInitialLoadComplete: complete,
      loadingState: state
    };
  }, [completedTasks, requiredTasks, errors, isLoadingBalances, isLoadingInteractions, isLoadingUserData]);

  // Local data checking functions
  const hasLocalData = async (): Promise<boolean> => {
    // Check if we have any local data cached
    return !!(balancesData || interactionsData || userProfileData);
  };

  const hasEssentialLocalData = async (): Promise<boolean> => {
    // Check if we have essential data for offline operation
    return !!(balancesData && interactionsData);
  };

  // Log loading state changes with authentication context
  logger.debug(`[useLoadingState] Loading state: ${progress.toFixed(1)}% complete, tasks: ${Array.from(completedTasks).join(', ')}, authenticated: ${isAuthenticated}, entityId: ${entityId ? 'present' : 'missing'}`);

  return {
    isInitialLoadComplete,
    loadingState,
    isLoadingBalances,
    isLoadingInteractions,
    isLoadingUserData,
    hasLoadedBalances: !!balancesData && !isLoadingBalances,
    hasLoadedInteractions: !!interactionsData && !isLoadingInteractions,
    hasLoadedUserData: !!userProfileData && !isLoadingUserData,
    hasLocalData,
    hasEssentialLocalData,
  };
};

export default useLoadingState; 