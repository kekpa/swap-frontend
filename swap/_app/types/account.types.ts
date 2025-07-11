/**
 * Account related types for the frontend
 */

// Simple balance type for UI display
export interface CurrencyBalance {
  code: string;
  symbol: string;
  balance: number;
}

// Detailed balance type with additional fields
export interface Balance {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  convertedAmount?: number;
  updatedAt: string;
}

// Full account type matching the backend response
export interface Account {
  id: string;
  profile_id: string;
  currency_id: string;
  balance: number;
  account_type_id: number;
  business_profile_id: string | null;
  is_primary: boolean;
  business_location_id: string | null;
  status: 'active' | 'inactive' | 'suspended';
  deactivated_at: string | null;
  deactivation_reason: string | null;
  created_at: string;
  updated_at: string;
  balance_last_updated: string;
  currencies?: {
    id: string;
    code: string;
    name: string;
    symbol: string;
  };
  account_types?: {
    id: number;
    name: string;
    description: string;
  };
}

// Type for account statement returned by the API
export interface AccountStatement {
  account: {
    id: string;
    balance: number;
    currency: string;
  };
  transactions: Array<{
    id: string;
    account_id: string;
    transaction_id: string;
    amount: number;
    balance_after: number;
    created_at: string;
    transactions?: {
      id: string;
      description: string;
      created_at: string;
      transaction_type: string;
    };
  }>;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
} 