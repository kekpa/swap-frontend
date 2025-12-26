/**
 * Transaction status
 */
export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REVERSED = 'reversed',
}

/**
 * Transaction type
 */
export enum TransactionType {
  TRANSFER = 'transfer',
  PAYMENT = 'payment',
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  FEE = 'fee',
  REFUND = 'refund',
  EXCHANGE = 'exchange',
  EXTERNAL_PAYMENT = 'external_payment',
}

/**
 * Processed by type
 */
export enum ProcessedByType {
  PROFILE = 'profile',
  BUSINESS_PROFILE = 'business_profile',
  SYSTEM = 'system',
}

/**
 * Transaction model
 */
export interface Transaction {
  id: string;
  from_account_id: string;
  to_account_id?: string;
  amount: number;
  currency_id: string;
  status: TransactionStatus;
  interaction_id?: string;
  exchange_rate?: number;
  business_location_id?: string;
  transaction_type: TransactionType;
  description?: string;
  metadata?: Record<string, any>;
  is_reversed?: boolean;
  reversing_transaction_id?: string;
  processed_by_id?: string;
  processed_by_type: ProcessedByType;
  created_at: string;
  updated_at?: string;
  
  // Additional fields for wallet2.tsx compatibility
  to_entity_id?: string;
  from_entity_id?: string;
  currency_symbol?: string;
  currency_code?: string;

  // Wallet IDs for filtering transactions by currency-specific wallet
  from_wallet_id?: string;
  to_wallet_id?: string;
  
  // Frontend-specific fields
  from_account?: {
    id: string;
    name: string;
    balance: number;
    currency_code: string;
  };
  to_account?: {
    id: string;
    name: string;
    balance: number;
    currency_code: string;
  };
  currency?: {
    id: string;
    code: string;
    name: string;
    symbol: string;
  };
}

/**
 * Create transaction request
 */
export interface CreateTransactionRequest {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  currency_id: string;
  transaction_type?: TransactionType;
  description?: string;
  interaction_id?: string;
  business_location_id?: string;
  metadata?: Record<string, any>;
}

/**
 * Transaction filter
 */
export interface TransactionFilter {
  profile_id?: string;
  account_id?: string;
  interaction_id?: string;
  status?: TransactionStatus;
  transaction_type?: TransactionType;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

/**
 * API response for transactions
 */
export interface TransactionsResponse {
  data: Transaction[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * Transaction summary
 */
export interface TransactionSummary {
  total_count: number;
  total_amount: number;
  average_amount: number;
  transaction_types: Record<string, number>;
  statuses: Record<string, number>;
} 

// Created: Transaction DTO types for client - 2025-05-18
export interface CreateDirectTransactionDto {
  to_entity_id: string;        // Entity ID of the recipient
  from_entity_id?: string;     // Entity ID of the sender (optional, defaults to auth user)
  amount: number;              // Monetary amount (decimal)
  currency_id: string;         // Currency UUID
  description?: string;        // Optional memo
  metadata?: Record<string, any>;
  from_wallet_id?: string;     // Source wallet ID
  to_wallet_id?: string;       // Destination wallet ID
  idempotency_key?: string;    // Prevent duplicate transactions
} 