/**
 * Query Error Classes
 * 
 * Standardized error types for TanStack Query operations.
 * Provides consistent error handling and user messaging.
 */

import { logger } from '../../utils/logger';

// Base query error class
export abstract class QueryError extends Error {
  abstract readonly code: string;
  abstract readonly userMessage: string;
  readonly timestamp: string;
  readonly retryable: boolean;

  constructor(
    message: string,
    public readonly originalError?: Error,
    retryable: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    this.retryable = retryable;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Log the error
    this.logError();
  }

  private logError() {
    logger.error(`[${this.name}] ${this.message}`, {
      code: this.code,
      userMessage: this.userMessage,
      retryable: this.retryable,
      originalError: this.originalError?.message,
      timestamp: this.timestamp,
    });
  }

  // Convert to a serializable object for reporting
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      userMessage: this.userMessage,
      retryable: this.retryable,
      timestamp: this.timestamp,
      stack: this.stack,
      originalError: this.originalError?.message,
    };
  }
}

// Network-related errors
export class NetworkError extends QueryError {
  readonly code = 'NETWORK_ERROR';
  readonly userMessage = 'Unable to connect to the server. Please check your internet connection.';

  constructor(originalError?: Error) {
    super('Network connection failed', originalError, true);
  }
}

export class TimeoutError extends QueryError {
  readonly code = 'TIMEOUT_ERROR';
  readonly userMessage = 'The request took too long. Please try again.';

  constructor(originalError?: Error) {
    super('Request timeout', originalError, true);
  }
}

// Authentication/Authorization errors
export class AuthenticationError extends QueryError {
  readonly code = 'AUTH_ERROR';
  readonly userMessage = 'You need to sign in again to continue.';

  constructor(originalError?: Error) {
    super('Authentication failed', originalError, false);
  }
}

export class AuthorizationError extends QueryError {
  readonly code = 'AUTHORIZATION_ERROR';
  readonly userMessage = 'You do not have permission to access this data.';

  constructor(originalError?: Error) {
    super('Authorization failed', originalError, false);
  }
}

// Data-related errors
export class DataNotFoundError extends QueryError {
  readonly code = 'DATA_NOT_FOUND';
  readonly userMessage = 'The requested data could not be found.';

  constructor(resource: string, originalError?: Error) {
    super(`${resource} not found`, originalError, false);
  }
}

export class DataValidationError extends QueryError {
  readonly code = 'VALIDATION_ERROR';
  readonly userMessage = 'The provided data is invalid. Please check your input.';

  constructor(details: string, originalError?: Error) {
    super(`Validation failed: ${details}`, originalError, false);
  }
}

// Server errors
export class ServerError extends QueryError {
  readonly code = 'SERVER_ERROR';
  readonly userMessage = 'Server error. Please try again later.';

  constructor(statusCode: number, originalError?: Error) {
    super(`Server error (${statusCode})`, originalError, true);
  }
}

export class MaintenanceError extends QueryError {
  readonly code = 'MAINTENANCE_ERROR';
  readonly userMessage = 'The service is temporarily unavailable for maintenance.';

  constructor(originalError?: Error) {
    super('Service under maintenance', originalError, true);
  }
}

// Financial operation errors
export class InsufficientFundsError extends QueryError {
  readonly code = 'INSUFFICIENT_FUNDS';
  readonly userMessage = 'Insufficient funds to complete this transaction.';

  constructor(originalError?: Error) {
    super('Insufficient funds', originalError, false);
  }
}

export class TransactionLimitError extends QueryError {
  readonly code = 'TRANSACTION_LIMIT';
  readonly userMessage = 'Transaction limit exceeded. Please try a smaller amount.';

  constructor(originalError?: Error) {
    super('Transaction limit exceeded', originalError, false);
  }
}

export class AccountSuspendedError extends QueryError {
  readonly code = 'ACCOUNT_SUSPENDED';
  readonly userMessage = 'Your account has been suspended. Please contact support.';

  constructor(originalError?: Error) {
    super('Account suspended', originalError, false);
  }
}

// Cache and offline errors
export class CacheError extends QueryError {
  readonly code = 'CACHE_ERROR';
  readonly userMessage = 'Unable to access cached data. Please try again.';

  constructor(operation: string, originalError?: Error) {
    super(`Cache operation failed: ${operation}`, originalError, true);
  }
}

export class OfflineError extends QueryError {
  readonly code = 'OFFLINE_ERROR';
  readonly userMessage = 'You are offline. Some features may not be available.';

  constructor(originalError?: Error) {
    super('Device is offline', originalError, true);
  }
}

// Generic errors
export class UnknownError extends QueryError {
  readonly code = 'UNKNOWN_ERROR';
  readonly userMessage = 'An unexpected error occurred. Please try again.';

  constructor(originalError?: Error) {
    super('Unknown error occurred', originalError, true);
  }
}

/**
 * Error factory to create appropriate error instances based on HTTP status codes
 */
export class QueryErrorFactory {
  static fromHttpError(status: number, message?: string, originalError?: Error): QueryError {
    switch (status) {
      case 400:
        return new DataValidationError(message || 'Bad request', originalError);
      case 401:
        return new AuthenticationError(originalError);
      case 403:
        return new AuthorizationError(originalError);
      case 404:
        return new DataNotFoundError(message || 'Resource', originalError);
      case 408:
        return new TimeoutError(originalError);
      case 429:
        return new TransactionLimitError(originalError);
      case 500:
      case 502:
      case 503:
        return new ServerError(status, originalError);
      case 504:
        return new TimeoutError(originalError);
      default:
        if (status >= 500) {
          return new ServerError(status, originalError);
        }
        return new UnknownError(originalError);
    }
  }

  static fromNetworkError(error: Error): QueryError {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return new NetworkError(error);
    }

    if (message.includes('timeout')) {
      return new TimeoutError(error);
    }

    if (message.includes('insufficient funds')) {
      return new InsufficientFundsError(error);
    }

    if (message.includes('limit exceeded')) {
      return new TransactionLimitError(error);
    }

    if (message.includes('suspended') || message.includes('blocked')) {
      return new AccountSuspendedError(error);
    }

    if (message.includes('offline')) {
      return new OfflineError(error);
    }

    return new UnknownError(error);
  }

  static fromAxiosError(error: any): QueryError {
    if (error.response) {
      // HTTP error response
      const status = error.response.status;
      const message = error.response.data?.message || error.message;
      return this.fromHttpError(status, message, error);
    }

    if (error.request) {
      // Network error (no response received)
      return new NetworkError(error);
    }

    // Request setup error
    return new UnknownError(error);
  }
}

/**
 * Error utilities for query hooks
 */
export class QueryErrorUtils {
  // Check if error is retryable
  static isRetryable(error: unknown): boolean {
    if (error instanceof QueryError) {
      return error.retryable;
    }
    
    // For non-QueryError instances, use heuristics
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return !message.includes('unauthorized') && 
             !message.includes('forbidden') && 
             !message.includes('not found');
    }
    
    return true;
  }

  // Get user-friendly message from any error
  static getUserMessage(error: unknown): string {
    if (error instanceof QueryError) {
      return error.userMessage;
    }
    
    if (error instanceof Error) {
      // Try to extract user-friendly message from generic errors
      const message = error.message.toLowerCase();
      
      if (message.includes('network')) {
        return 'Unable to connect to the server. Please check your internet connection.';
      }
      
      if (message.includes('timeout')) {
        return 'The request took too long. Please try again.';
      }
      
      return __DEV__ ? error.message : 'An unexpected error occurred. Please try again.';
    }
    
    return 'An unexpected error occurred. Please try again.';
  }

  // Get error code for tracking/analytics
  static getErrorCode(error: unknown): string {
    if (error instanceof QueryError) {
      return error.code;
    }
    
    return 'UNKNOWN_ERROR';
  }

  // Convert any error to QueryError
  static normalize(error: unknown): QueryError {
    if (error instanceof QueryError) {
      return error;
    }
    
    if (error instanceof Error) {
      // Try to detect specific error types
      return QueryErrorFactory.fromNetworkError(error);
    }
    
    return new UnknownError();
  }
}

export default {
  QueryError,
  NetworkError,
  TimeoutError,
  AuthenticationError,
  AuthorizationError,
  DataNotFoundError,
  DataValidationError,
  ServerError,
  MaintenanceError,
  InsufficientFundsError,
  TransactionLimitError,
  AccountSuspendedError,
  CacheError,
  OfflineError,
  UnknownError,
  QueryErrorFactory,
  QueryErrorUtils,
};