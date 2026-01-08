/**
 * Standardized Error Handling Utility
 * 
 * Provides consistent error handling patterns across the application.
 * Integrates with logger and TanStack Query for unified error management.
 */

import logger from './logger';
import { HttpError } from '../types/api.types';

// Standard error categories for better organization
export enum ErrorCategory {
  AUTH = 'auth',
  API = 'api', 
  NETWORK = 'network',
  STORAGE = 'storage',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',       // Non-critical, can continue
  MEDIUM = 'medium', // Important but recoverable  
  HIGH = 'high',     // Critical, affects core functionality
  CRITICAL = 'critical' // App-breaking, requires immediate attention
}

// Standardized error interface
export interface AppError extends Error {
  category: ErrorCategory;
  severity: ErrorSeverity;
  code?: string;
  statusCode?: number;
  metadata?: Record<string, any>;
  userMessage?: string; // User-friendly message
  originalError?: Error;
}

/**
 * Create a standardized AppError
 */
export const createAppError = (
  message: string,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  options?: {
    code?: string;
    statusCode?: number;
    metadata?: Record<string, any>;
    userMessage?: string;
    originalError?: Error;
  }
): AppError => {
  const error = new Error(message) as AppError;
  error.category = category;
  error.severity = severity;
  error.code = options?.code;
  error.statusCode = options?.statusCode;
  error.metadata = options?.metadata;
  error.userMessage = options?.userMessage || message;
  error.originalError = options?.originalError;
  return error;
};

/**
 * Convert unknown error to standardized AppError
 */
export const normalizeError = (
  error: unknown,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  context?: string
): AppError => {
  // Already an AppError
  if (isAppError(error)) {
    return error;
  }

  // Axios/HTTP error
  if (isHttpError(error)) {
    return createAppError(
      error.message || 'HTTP request failed',
      ErrorCategory.API,
      getHttpErrorSeverity(error.status || 500),
      {
        statusCode: error.status,
        code: error.code,
        metadata: { url: error.config?.url, context },
        userMessage: getHttpErrorMessage(error.status || 500),
        originalError: error
      }
    );
  }

  // Standard Error object
  if (error instanceof Error) {
    return createAppError(
      error.message,
      category,
      ErrorSeverity.MEDIUM,
      {
        metadata: { context },
        originalError: error
      }
    );
  }

  // String error
  if (typeof error === 'string') {
    return createAppError(
      error,
      category,
      ErrorSeverity.MEDIUM,
      {
        metadata: { context }
      }
    );
  }

  // Unknown error type
  return createAppError(
    'An unknown error occurred',
    category,
    ErrorSeverity.MEDIUM,
    {
      metadata: { originalError: error, context }
    }
  );
};

/**
 * Check if error is an AppError
 */
export const isAppError = (error: unknown): error is AppError => {
  return error instanceof Error && 'category' in error && 'severity' in error;
};

/**
 * Check if error is an HTTP/Axios error
 */
export const isHttpError = (error: unknown): error is HttpError => {
  return (
    error !== null &&
    typeof error === 'object' &&
    ('status' in error || 'response' in error || 'code' in error)
  );
};

/**
 * Get error severity based on HTTP status code
 */
const getHttpErrorSeverity = (statusCode: number): ErrorSeverity => {
  if (statusCode >= 500) return ErrorSeverity.HIGH;
  if (statusCode >= 400) return ErrorSeverity.MEDIUM;
  return ErrorSeverity.LOW;
};

/**
 * Get user-friendly message for HTTP errors
 */
const getHttpErrorMessage = (statusCode: number): string => {
  switch (statusCode) {
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 401:
      return 'Authentication required. Please sign in and try again.';
    case 403:
      return 'Access denied. You don\'t have permission for this action.';
    case 404:
      return 'The requested resource was not found.';
    case 408:
      return 'Request timeout. Please check your connection and try again.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'Server error. Please try again later.';
    case 502:
    case 503:
    case 504:
      return 'Service temporarily unavailable. Please try again later.';
    default:
      return 'An error occurred. Please try again.';
  }
};

/**
 * Standardized error logging
 */
export const logError = (
  error: AppError | unknown,
  context?: string,
  metadata?: Record<string, any>
): void => {
  const appError = isAppError(error) ? error : normalizeError(error, ErrorCategory.UNKNOWN, context);
  
  const logData = {
    category: appError.category,
    severity: appError.severity,
    code: appError.code,
    statusCode: appError.statusCode,
    context,
    ...appError.metadata,
    ...metadata
  };

  // Log based on severity
  switch (appError.severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.HIGH:
      logger.error(appError.message, appError.originalError, appError.category, logData);
      break;
    case ErrorSeverity.MEDIUM:
      logger.warn(appError.message, appError.category, logData);
      break;
    case ErrorSeverity.LOW:
      logger.debug(appError.message, appError.category, logData);
      break;
  }
};

/**
 * Standard retry logic for TanStack Query
 */
export const createRetryFunction = (maxRetries: number = 2) => {
  return (failureCount: number, error: unknown) => {
    const appError = normalizeError(error, ErrorCategory.API);
    
    // Don't retry client errors (4xx)
    if (appError.statusCode && appError.statusCode >= 400 && appError.statusCode < 500) {
      return false;
    }
    
    // Don't retry critical errors
    if (appError.severity === ErrorSeverity.CRITICAL) {
      return false;
    }
    
    return failureCount < maxRetries;
  };
};

/**
 * Extract user-friendly error message for UI display
 */
export const getUserErrorMessage = (error: unknown): string => {
  if (isAppError(error)) {
    return error.userMessage || error.message;
  }
  
  const appError = normalizeError(error);
  return appError.userMessage || 'An unexpected error occurred';
};

/**
 * Safe async function wrapper with standardized error handling
 */
export const safeAsync = <T>(
  fn: () => Promise<T>,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  context?: string
): Promise<T> => {
  return fn().catch((error) => {
    const appError = normalizeError(error, category, context);
    logError(appError, context);
    throw appError;
  });
};

/**
 * Storage operation error handler
 */
export const handleStorageError = (error: unknown, operation: string): void => {
  const appError = normalizeError(error, ErrorCategory.STORAGE, `Storage ${operation}`);
  logError(appError);
  
  // For storage errors, we usually want to continue execution
  // but log the error for debugging
};

/**
 * Auth operation error handler
 */
export const handleAuthError = (error: unknown, operation: string): AppError => {
  const appError = normalizeError(error, ErrorCategory.AUTH, `Auth ${operation}`);
  logError(appError);
  return appError;
};

/**
 * Network operation error handler  
 */
export const handleNetworkError = (error: unknown, operation: string): AppError => {
  const appError = normalizeError(error, ErrorCategory.NETWORK, `Network ${operation}`);
  logError(appError);
  return appError;
};

export default {
  createAppError,
  normalizeError,
  logError,
  createRetryFunction,
  getUserErrorMessage,
  safeAsync,
  handleStorageError,
  handleAuthError,
  handleNetworkError,
  ErrorCategory,
  ErrorSeverity
};