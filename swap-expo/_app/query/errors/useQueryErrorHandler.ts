/**
 * useQueryErrorHandler Hook
 * 
 * Centralized error handling for TanStack Query operations.
 * Provides consistent error processing and user notifications.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import { QueryErrorFactory, QueryErrorUtils, QueryError } from './QueryErrors';

// Notification function type (to be implemented by the app)
type NotificationFunction = (message: string, type: 'error' | 'warning' | 'info') => void;

interface UseQueryErrorHandlerOptions {
  // Custom notification function (e.g., toast, alert)
  showNotification?: NotificationFunction;
  
  // Whether to log errors automatically
  logErrors?: boolean;
  
  // Whether to show user notifications for errors
  showUserNotifications?: boolean;
  
  // Custom error transformation
  transformError?: (error: unknown) => QueryError;
  
  // Callback for specific error types
  onAuthError?: () => void;
  onNetworkError?: () => void;
  onServerError?: () => void;
}

export const useQueryErrorHandler = (options: UseQueryErrorHandlerOptions = {}) => {
  const queryClient = useQueryClient();
  const {
    showNotification,
    logErrors = true,
    showUserNotifications = true,
    transformError,
    onAuthError,
    onNetworkError,
    onServerError,
  } = options;

  // Set up global query error listener
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'observerResultsUpdated') {
        const { query } = event;
        
        // Check if query has an error
        if (query.state.error) {
          handleQueryError(query.state.error, query.queryKey);
        }
      }
    });

    // Also listen for mutation errors
    const mutationUnsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === 'updated') {
        const { mutation } = event;
        
        if (mutation.state.error) {
          handleMutationError(mutation.state.error, mutation.options.mutationKey);
        }
      }
    });

    return () => {
      unsubscribe();
      mutationUnsubscribe();
    };
  }, [queryClient]);

  // Handle query errors
  const handleQueryError = useCallback((error: unknown, queryKey: unknown[]) => {
    const normalizedError = transformError ? transformError(error) : QueryErrorUtils.normalize(error);
    
    if (logErrors) {
      logger.error('[useQueryErrorHandler] Query error:', {
        error: normalizedError.toJSON(),
        queryKey,
      });
    }

    // Handle specific error types
    handleSpecificErrorTypes(normalizedError);

    // Show user notification if enabled
    if (showUserNotifications && showNotification) {
      showNotification(normalizedError.userMessage, 'error');
    }
  }, [transformError, logErrors, showUserNotifications, showNotification]);

  // Handle mutation errors
  const handleMutationError = useCallback((error: unknown, mutationKey: unknown[] | undefined) => {
    const normalizedError = transformError ? transformError(error) : QueryErrorUtils.normalize(error);
    
    if (logErrors) {
      logger.error('[useQueryErrorHandler] Mutation error:', {
        error: normalizedError.toJSON(),
        mutationKey,
      });
    }

    // Handle specific error types
    handleSpecificErrorTypes(normalizedError);

    // Always show mutation errors to users (they're usually user-initiated)
    if (showNotification) {
      showNotification(normalizedError.userMessage, 'error');
    }
  }, [transformError, logErrors, showNotification]);

  // Handle specific error type callbacks
  const handleSpecificErrorTypes = useCallback((error: QueryError) => {
    switch (error.code) {
      case 'AUTH_ERROR':
      case 'AUTHORIZATION_ERROR':
        onAuthError?.();
        break;
      
      case 'NETWORK_ERROR':
      case 'TIMEOUT_ERROR':
      case 'OFFLINE_ERROR':
        onNetworkError?.();
        break;
      
      case 'SERVER_ERROR':
      case 'MAINTENANCE_ERROR':
        onServerError?.();
        break;
    }
  }, [onAuthError, onNetworkError, onServerError]);

  // Manual error handling function
  const handleError = useCallback((error: unknown, context?: string) => {
    const normalizedError = transformError ? transformError(error) : QueryErrorUtils.normalize(error);
    
    if (logErrors) {
      logger.error(`[useQueryErrorHandler] Manual error handling${context ? ` (${context})` : ''}:`, {
        error: normalizedError.toJSON(),
      });
    }

    handleSpecificErrorTypes(normalizedError);

    if (showUserNotifications && showNotification) {
      showNotification(normalizedError.userMessage, 'error');
    }

    return normalizedError;
  }, [transformError, logErrors, showUserNotifications, showNotification, handleSpecificErrorTypes]);

  // Retry function with error handling
  const retryWithErrorHandling = useCallback(async (fn: () => Promise<any>, context?: string) => {
    try {
      return await fn();
    } catch (error) {
      return handleError(error, context);
    }
  }, [handleError]);

  return {
    handleError,
    retryWithErrorHandling,
    // Utility functions
    isRetryable: QueryErrorUtils.isRetryable,
    getUserMessage: QueryErrorUtils.getUserMessage,
    getErrorCode: QueryErrorUtils.getErrorCode,
  };
};

/**
 * useQueryErrorRecovery Hook
 * 
 * Provides error recovery strategies for failed queries.
 */
export const useQueryErrorRecovery = () => {
  const queryClient = useQueryClient();

  // Clear specific query cache
  const clearQueryCache = useCallback((queryKey: unknown[]) => {
    queryClient.removeQueries({ queryKey });
    logger.info('[useQueryErrorRecovery] Cleared cache for query:', queryKey);
  }, [queryClient]);

  // Clear all cache
  const clearAllCache = useCallback(() => {
    queryClient.clear();
    logger.info('[useQueryErrorRecovery] Cleared all query cache');
  }, [queryClient]);

  // Retry specific query
  const retryQuery = useCallback((queryKey: unknown[]) => {
    queryClient.invalidateQueries({ queryKey, refetchType: 'active' });
    logger.info('[useQueryErrorRecovery] Retrying query:', queryKey);
  }, [queryClient]);

  // Retry all failed queries
  const retryAllQueries = useCallback(() => {
    queryClient.invalidateQueries({ refetchType: 'active' });
    logger.info('[useQueryErrorRecovery] Retrying all queries');
  }, [queryClient]);

  // Reset query to initial state
  const resetQuery = useCallback((queryKey: unknown[]) => {
    queryClient.resetQueries({ queryKey });
    logger.info('[useQueryErrorRecovery] Reset query to initial state:', queryKey);
  }, [queryClient]);

  return {
    clearQueryCache,
    clearAllCache,
    retryQuery,
    retryAllQueries,
    resetQuery,
  };
};

/**
 * useErrorNotification Hook
 * 
 * Simple hook for showing error notifications.
 * Can be customized to use different notification systems.
 */
export const useErrorNotification = () => {
  const showErrorNotification = useCallback((message: string, duration: number = 5000) => {
    // This would integrate with your notification system
    // For now, just log in development
    if (__DEV__) {
      console.error('🚨 Error Notification:', message);
    }
    
    // TODO: Integrate with actual notification system
    // Examples:
    // - React Native Toast
    // - Custom alert component
    // - Push notifications
    // - In-app banner
    
    logger.info('[useErrorNotification] Showing error notification:', message);
  }, []);

  const showWarningNotification = useCallback((message: string, duration: number = 3000) => {
    if (__DEV__) {
      console.warn('⚠️ Warning Notification:', message);
    }
    
    logger.info('[useErrorNotification] Showing warning notification:', message);
  }, []);

  const showInfoNotification = useCallback((message: string, duration: number = 3000) => {
    if (__DEV__) {
      console.info('ℹ️ Info Notification:', message);
    }
    
    logger.info('[useErrorNotification] Showing info notification:', message);
  }, []);

  return {
    showErrorNotification,
    showWarningNotification,
    showInfoNotification,
  };
};

export default useQueryErrorHandler;