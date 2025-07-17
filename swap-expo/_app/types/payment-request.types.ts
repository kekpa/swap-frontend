import { ProcessedByType } from './transaction.types';

/**
 * Payment request status
 */
export enum P2PRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  COMPLETED = 'completed',
}

/**
 * Payment request type
 */
export enum P2PRequestType {
  SEND = 'send',
  REQUEST = 'request',
}

/**
 * Payment request model
 */
export interface P2PRequest {
  id: string;
  interaction_id?: string;
  requester_account_id?: string;
  target_account_id?: string;
  sender_profile_id: string;
  recipient_profile_id: string;
  amount: number;
  currency_id: string;
  business_location_id?: string;
  status: P2PRequestStatus;
  request_type: P2PRequestType;
  initiated_by_id: string;
  initiated_by_type: ProcessedByType;
  expires_at?: string;
  description?: string;
  rejection_reason?: string;
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
  recipient_profile?: {
    id: string;
    username: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
  currency?: {
    id: string;
    code: string;
    name: string;
    symbol: string;
  };
}

/**
 * Create payment request
 */
export interface CreateP2PRequestRequest {
  requester_account_id?: string;
  target_account_id: string;
  recipient_profile_id: string;
  amount: number;
  currency_id: string;
  request_type: P2PRequestType;
  interaction_id?: string;
  business_location_id?: string;
  expires_at?: string;
  description?: string;
}

/**
 * Update payment request status
 */
export interface UpdateP2PRequestStatusRequest {
  status: P2PRequestStatus;
  reason?: string;
}

/**
 * Payment request filter
 */
export interface P2PRequestFilter {
  status?: P2PRequestStatus;
  request_type?: P2PRequestType;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

/**
 * API response for payment requests
 */
export interface P2PRequestsResponse {
  data: P2PRequest[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
} 