/**
 * TanStack Query Mutations Index
 * 
 * Centralized export for all mutation hooks.
 * Provides easy access to all write operations with consistent patterns.
 */

// Transfer mutations
export {
  useTransferMoney,
  useOfflineTransferQueue,
  type TransferRequest,
  type TransferResponse,
} from './useTransferMoney';

// Message mutations
export {
  useSendMessage,
  useBulkMessageOperations,
  type SendMessageRequest,
  type SendMessageResponse,
} from './useSendMessage';

// Profile mutations
export {
  useUpdateProfile,
  useUploadAvatar,
  useDeleteAccount,
  type ProfileUpdateRequest,
  type ProfileUpdateResponse,
  type BasicProfileUpdate,
  type AddressUpdate,
  type PreferencesUpdate,
  type SecurityUpdate,
} from './useUpdateProfile';

/**
 * Common mutation patterns and utilities
 */

// Re-export commonly used TanStack Query types for mutations
export type {
  UseMutationResult,
  UseMutationOptions,
} from '@tanstack/react-query';

/**
 * Mutation hook naming conventions:
 * 
 * - use[Action][Entity] (e.g., useUpdateProfile, useTransferMoney)
 * - Always return mutation object with { mutate, mutateAsync, isLoading, error, etc. }
 * - Include optimistic updates where appropriate for better UX
 * - Handle rollback on failure
 * - Invalidate related queries on success
 * - Use proper network modes (online for financial operations, offlineFirst for messages)
 * - Include retry logic appropriate for the operation type
 * - Log all operations for debugging and monitoring
 */

/**
 * Common mutation response pattern:
 * {
 *   success: boolean;
 *   timestamp: string;
 *   [entityName]: T; // The updated/created entity
 *   metadata?: any; // Additional response data
 * }
 */

/**
 * Common mutation error handling:
 * - Client errors (4xx): Don't retry, show specific error message
 * - Server errors (5xx): Retry with exponential backoff
 * - Network errors: Retry with backoff, queue if offline (where appropriate)
 * - Validation errors: Don't retry, highlight specific fields
 */