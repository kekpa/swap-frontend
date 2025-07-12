// Created: Wallet types for new wallet-centric architecture - 2025-01-03
/**
 * Wallet related types for the frontend
 * 
 * NEW ARCHITECTURE: 1 Account = Multiple Wallets (one wallet per currency)
 * OLD ARCHITECTURE: 1 Account = 1 Currency
 */

// NEW: WalletBalance type matching backend WalletBalance interface
export interface WalletBalance {
  wallet_id: string;
  account_id: string;
  entity_id: string;
  currency_id: string;
  currency_code: string;
  currency_symbol: string;
  currency_name: string;
  balance: number;
  reserved_balance: number;
  available_balance: number;
  balance_last_updated: string | null;
  is_active: boolean;
  
  // UI-specific fields
  isPrimary?: boolean; // Primary wallet for the currency
  last_updated?: string; // For local caching
}

// Simplified wallet display type for UI components
export interface WalletDisplay {
  id: string; // wallet_id
  balance: number;
  currency_code: string;
  currency_symbol: string;
  currency_id: string; // Add currency_id for filtering
  account_id: string;
  isPrimary: boolean;
  status: 'active' | 'inactive';
  last_updated: string;
}

// Account with its wallets (replaces old Account type)
export interface AccountWithWallets {
  id: string; // account_id
  entity_id: string;
  account_type_id: number;
  is_primary: boolean;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  
  // Wallets for this account (one per currency)
  wallets: WalletBalance[];
  
  // Account type information
  account_types?: {
    id: number;
    name: string;
    description: string;
  };
}

// Wallet transaction (replaces account transaction)
export interface WalletTransaction {
  id: string;
  wallet_id: string;
  transaction_id: string;
  amount: number;
  balance_after: number;
  transaction_type: 'credit' | 'debit';
  description: string;
  created_at: string;
  
  // Related transaction details
  transaction?: {
    id: string;
    description: string;
    created_at: string;
    transaction_type: string;
    interaction_id?: string;
  };
}

// Wallet statement (replaces account statement)
export interface WalletStatement {
  wallet: {
    wallet_id: string;
    account_id: string;
    currency_code: string;
    currency_symbol: string;
    balance: number;
    available_balance: number;
  };
  transactions: WalletTransaction[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

// DTO for wallet operations
export interface CreateWalletDto {
  account_id: string;
  currency_id: string;
  initial_balance?: number;
}

export interface CreditWalletDto {
  amount: number;
  transaction_id?: string;
  description?: string;
}

export interface DebitWalletDto {
  amount: number;
  transaction_id?: string;
  description?: string;
}

// Wallet selection for transactions (replaces account selection)
export interface WalletSelectionOption {
  wallet_id: string;
  account_id: string;
  currency_code: string;
  currency_symbol: string;
  balance: number;
  available_balance: number;
  display_name: string; // e.g., "USD Wallet ($1,234.56)"
  isPrimary: boolean;
}

// LEGACY COMPATIBILITY: Types to help transition from account-centric to wallet-centric
// These should be removed once all components are updated

/**
 * @deprecated Use WalletBalance instead. This maps old AccountBalance to new WalletBalance.
 */
export interface AccountBalance extends WalletBalance {
  // Map old field names to new ones for backward compatibility
  id: string; // maps to wallet_id
  account_type: string; // derived from account info
}

/**
 * Helper to convert WalletBalance to legacy AccountBalance format
 * @deprecated Remove this once all components use WalletBalance directly
 */
export function walletToLegacyAccount(wallet: WalletBalance): AccountBalance {
  return {
    ...wallet,
    id: wallet.wallet_id, // Map wallet_id to id for legacy compatibility
    account_type: 'wallet', // Default account type
  };
}

/**
 * Helper to convert legacy AccountBalance to WalletBalance format
 */
export function legacyAccountToWallet(account: AccountBalance): WalletBalance {
  return {
    wallet_id: account.id || account.wallet_id,
    account_id: account.account_id,
    entity_id: account.entity_id,
    currency_id: account.currency_id,
    currency_code: account.currency_code,
    currency_symbol: account.currency_symbol,
    currency_name: account.currency_name || account.currency_code,
    balance: account.balance,
    reserved_balance: account.reserved_balance || 0,
    available_balance: account.available_balance || account.balance,
    balance_last_updated: account.balance_last_updated,
    is_active: true,
    isPrimary: account.isPrimary,
    last_updated: account.last_updated,
  };
} 