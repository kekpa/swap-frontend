/**
 * useLoadingState Hook
 * 
 * Replaces DataContext loading state logic with TanStack Query approach.
 * Monitors the loading state of essential app data for initial load completion.
 */

import { useBalances } from './useBalances';
import { useInteractions } from './useInteractions';
import { useAuthContext } from '../../features/auth/context/AuthContext';
import logger from '../../utils/logger';

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
  
  // Get loading states from individual hooks
  const { 
    isLoading: isLoadingBalances, 
    data: balancesData, 
    error: balancesError 
  } = useBalances(entityId);
  
  const { 
    interactions: interactionsData,
    isLoading: isLoadingInteractions, 
    error: interactionsError 
  } = useInteractions();
  
  // Use auth context for user data
  const isLoadingUserData = authContext?.isLoading || false;
  const userProfileData = authContext?.user;
  const userProfileError = null;

  // Calculate loading state
  const requiredTasks = ['balances', 'interactions', 'userProfile'];
  const completedTasks = new Set<string>();
  const errors: string[] = [];

  // Check completed tasks
  if (balancesData && !isLoadingBalances) {
    completedTasks.add('balances');
  }
  if (interactionsData && !isLoadingInteractions) {
    completedTasks.add('interactions');
  }
  if (userProfileData && !isLoadingUserData) {
    completedTasks.add('userProfile');
  }

  // Check errors
  if (balancesError) {
    errors.push(`Balances: ${balancesError.message || 'Unknown error'}`);
  }
  if (interactionsError) {
    errors.push(`Interactions: ${interactionsError.message || 'Unknown error'}`);
  }

  // Calculate progress
  const progress = (completedTasks.size / requiredTasks.length) * 100;
  const isLoading = isLoadingBalances || isLoadingInteractions || isLoadingUserData;
  const isInitialLoadComplete = completedTasks.size === requiredTasks.length && !isLoading;

  const loadingState: LoadingState = {
    isLoading,
    progress,
    completedTasks,
    requiredTasks,
    errors,
  };

  // Local data checking functions
  const hasLocalData = async (): Promise<boolean> => {
    // Check if we have any local data cached
    return !!(balancesData || interactionsData || userProfileData);
  };

  const hasEssentialLocalData = async (): Promise<boolean> => {
    // Check if we have essential data for offline operation
    return !!(balancesData && interactionsData);
  };

  // Log loading state changes
  logger.debug(`[useLoadingState] Loading state: ${progress.toFixed(1)}% complete, tasks: ${Array.from(completedTasks).join(', ')}`);

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