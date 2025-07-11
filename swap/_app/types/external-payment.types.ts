import { ProcessedByType } from './transaction.types';

/**
 * Payment direction
 */
export enum PaymentDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

/**
 * External payment status
 */
export enum ExternalPaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Settlement status
 */
export enum SettlementStatus {
  PENDING = 'pending',
  SETTLED = 'settled',
  FAILED = 'failed',
}

/**
 * External entity type
 */
export enum ExternalEntityType {
  BANK = 'bank',
  CARD = 'card',
  MOBILE_MONEY = 'mobile_money',
  CRYPTO = 'crypto',
  OTHER = 'other',
}

/**
 * Payment method
 */
export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  CARD = 'card',
  MOBILE_MONEY = 'mobile_money',
  CASH = 'cash',
  OTHER = 'other',
}

/**
 * External payment model
 */
export interface ExternalPayment {
  id: string;
  direction: PaymentDirection;
  amount: number;
  currency_id: string;
  status: ExternalPaymentStatus;
  internal_account_id: string;
  sender_profile_id: string;
  from_account_id: string;
  recipient_name: string;
  recipient_account_identifier: string;
  payment_method: PaymentMethod;
  description?: string;
  transaction_id?: string;
  interaction_id?: string;
  business_location_id?: string;
  external_entity_type: ExternalEntityType;
  external_entity_details: Record<string, any>;
  external_initiator_details?: Record<string, any>;
  reference_id?: string;
  processed_by_id?: string;
  processed_by_type?: ProcessedByType;
  settlement_status?: SettlementStatus;
  settlement_date?: string;
  initiated_at?: string;
  created_at: string;
  updated_at?: string;
  
  // Frontend-specific fields
  sender_profile?: {
    id: string;
    username: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
  internal_account?: {
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
 * Create external payment request
 */
export interface CreateExternalPaymentRequest {
  direction: PaymentDirection;
  amount: number;
  currency_id: string;
  internal_account_id: string;
  sender_profile_id: string;
  from_account_id: string;
  recipient_name: string;
  recipient_account_identifier: string;
  payment_method: string;
  description?: string;
  external_entity_type: ExternalEntityType;
  external_entity_details: Record<string, any>;
  external_initiator_details?: Record<string, any>;
  reference_id?: string;
  interaction_id?: string;
  business_location_id?: string;
}

/**
 * Update external payment status request
 */
export interface UpdateExternalPaymentStatusRequest {
  status: ExternalPaymentStatus;
  settlement_status?: SettlementStatus;
  settlement_date?: string;
  reason?: string;
}

/**
 * External payment filter
 */
export interface ExternalPaymentFilter {
  status?: ExternalPaymentStatus;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

/**
 * API response for external payments
 */
export interface ExternalPaymentsResponse {
  data: ExternalPayment[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
} 