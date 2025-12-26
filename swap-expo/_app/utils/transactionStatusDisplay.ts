/**
 * Transaction Status Display Utility
 * Maps Saga architecture statuses to user-friendly display properties
 *
 * Mirrors backend: mono-backend/src/modules/transactions/transaction-state-machine.ts
 */

export type TransactionStatusType =
  | 'INITIATED'
  | 'PROCESSING_QUEUED'
  | 'BALANCE_CHECKING'
  | 'BALANCE_VERIFIED'
  | 'KYC_CHECKING'
  | 'KYC_VERIFIED'
  | 'AML_CHECKING'
  | 'AML_VERIFIED'
  | 'DEBIT_EXECUTING'
  | 'DEBIT_EXECUTED'
  | 'CREDIT_EXECUTING'
  | 'CREDIT_EXECUTED'
  | 'COMPLETING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REVERSING'
  | 'REVERSED'
  | 'PENDING'; // Legacy support

export interface StatusDisplayProps {
  label: string;
  icon: 'checkmark-circle' | 'time-outline' | 'close-circle' | 'refresh-outline' | 'arrow-undo-outline';
  color: 'success' | 'warning' | 'error' | 'info';
  isProcessing: boolean;
}

/**
 * All processing/intermediate states from Saga architecture
 */
const PROCESSING_STATES: string[] = [
  'INITIATED',
  'PROCESSING_QUEUED',
  'PENDING',
  'BALANCE_CHECKING',
  'BALANCE_VERIFIED',
  'KYC_CHECKING',
  'KYC_VERIFIED',
  'AML_CHECKING',
  'AML_VERIFIED',
  'DEBIT_EXECUTING',
  'DEBIT_EXECUTED',
  'CREDIT_EXECUTING',
  'CREDIT_EXECUTED',
  'COMPLETING',
  'REVERSING',
];

/**
 * Get display properties for a transaction status
 *
 * @param status - The transaction status from the backend
 * @returns Display properties (label, icon, color, isProcessing)
 */
export function getTransactionStatusDisplay(status: string | null | undefined): StatusDisplayProps {
  const normalizedStatus = status?.toUpperCase() || 'COMPLETED';

  // Terminal success state
  if (normalizedStatus === 'COMPLETED') {
    return {
      label: 'Completed',
      icon: 'checkmark-circle',
      color: 'success',
      isProcessing: false,
    };
  }

  // Terminal failure states
  if (normalizedStatus === 'FAILED') {
    return {
      label: 'Failed',
      icon: 'close-circle',
      color: 'error',
      isProcessing: false,
    };
  }

  if (normalizedStatus === 'CANCELLED') {
    return {
      label: 'Cancelled',
      icon: 'close-circle',
      color: 'error',
      isProcessing: false,
    };
  }

  if (normalizedStatus === 'REVERSED') {
    return {
      label: 'Reversed',
      icon: 'arrow-undo-outline',
      color: 'warning',
      isProcessing: false,
    };
  }

  // All processing/intermediate states
  if (PROCESSING_STATES.includes(normalizedStatus)) {
    return {
      label: 'Processing',
      icon: 'time-outline',
      color: 'warning',
      isProcessing: true,
    };
  }

  // Unknown status - default to completed
  return {
    label: 'Completed',
    icon: 'checkmark-circle',
    color: 'success',
    isProcessing: false,
  };
}

/**
 * Check if a status is a processing/pending state
 */
export function isProcessingStatus(status: string | null | undefined): boolean {
  const normalizedStatus = status?.toUpperCase() || '';
  return PROCESSING_STATES.includes(normalizedStatus);
}

/**
 * Check if a status is a terminal state (no more changes expected)
 */
export function isTerminalStatus(status: string | null | undefined): boolean {
  const normalizedStatus = status?.toUpperCase() || '';
  return ['COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED'].includes(normalizedStatus);
}
