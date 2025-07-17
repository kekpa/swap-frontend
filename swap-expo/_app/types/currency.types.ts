/**
 * Currency related types for the frontend
 */

// Currency interface matching backend data
export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Exchange rate interface
export interface ExchangeRate {
  id: string;
  from_currency_id: string;
  to_currency_id: string;
  rate: number;
  is_active: boolean;
  last_updated: string;
  from_currency?: Currency;
  to_currency?: Currency;
}

// Currency with exchange rate information
export interface CurrencyWithRate extends Currency {
  exchangeRate?: number;
  baseConversionRate?: number;
}

// Simplified currency display info
export interface CurrencyDisplay {
  code: string;
  symbol: string;
  name?: string;
}

// Currency conversion request
export interface CurrencyConversionRequest {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
} 