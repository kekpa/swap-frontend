/**
 * Query Error Handling System
 * 
 * Centralized exports for all error handling utilities.
 * Provides comprehensive error management for TanStack Query operations.
 */

// Error classes
export {
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
} from './QueryErrors';

// Error boundary component
export { QueryErrorBoundary } from './QueryErrorBoundary';

// Error handling hooks
export {
  useQueryErrorHandler,
  useQueryErrorRecovery,
  useErrorNotification,
} from './useQueryErrorHandler';

/**
 * Common error handling patterns and utilities
 */

// Re-export types for convenience
export type {
  QueryError as IQueryError,
} from './QueryErrors';

/**
 * Error handling best practices:
 * 
 * 1. **Use QueryErrorBoundary** at the app or feature level to catch React errors
 * 2. **Use useQueryErrorHandler** for centralized error processing
 * 3. **Use specific error classes** for typed error handling
 * 4. **Use QueryErrorUtils** for error analysis and transformation
 * 5. **Use useQueryErrorRecovery** for error recovery strategies
 * 
 * Example usage:
 * 
 * ```tsx
 * // App level error boundary
 * <QueryErrorBoundary>
 *   <App />
 * </QueryErrorBoundary>
 * 
 * // In a hook or component
 * const { handleError } = useQueryErrorHandler({
 *   onAuthError: () => redirectToLogin(),
 *   showUserNotifications: true,
 * });
 * 
 * // In query options
 * useQuery({
 *   queryKey: ['data'],
 *   queryFn: fetchData,
 *   onError: (error) => {
 *     const queryError = QueryErrorUtils.normalize(error);
 *     handleError(queryError);
 *   },
 * });
 * ```
 */

/**
 * Error code reference:
 * 
 * - NETWORK_ERROR: Network connectivity issues
 * - TIMEOUT_ERROR: Request timeout
 * - AUTH_ERROR: Authentication required
 * - AUTHORIZATION_ERROR: Permission denied
 * - DATA_NOT_FOUND: Resource not found
 * - VALIDATION_ERROR: Invalid input data
 * - SERVER_ERROR: Server-side error
 * - MAINTENANCE_ERROR: Service unavailable
 * - INSUFFICIENT_FUNDS: Financial operation failed
 * - TRANSACTION_LIMIT: Transaction limit exceeded
 * - ACCOUNT_SUSPENDED: Account suspended
 * - CACHE_ERROR: Cache operation failed
 * - OFFLINE_ERROR: Device offline
 * - UNKNOWN_ERROR: Unexpected error
 */